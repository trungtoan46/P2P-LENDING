/**
 * Service xử lý thanh toán hàng tháng
 */

const Payment = require('../models/Payment');
const Loan = require('../models/Loan');
const logger = require('../utils/logger');
const Investment = require('../models/Investment');
const walletService = require('./wallet.service');
const notificationService = require('./notification.service');
const { SETTLEMENT_STATUS, LOAN_STATUS, SERVICE_FEE: DEFAULT_SERVICE_FEE, PENALTY_PRINCIPAL_FACTOR, PENALTY_INTEREST_RATE } = require('../constants');
const Config = require('../models/Config');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { calculateMonthlyPayment } = require('../utils/helpers');

// Lazy require để tránh circular dependency
let reminderService = null;
const getReminderService = () => {
    if (!reminderService) {
        reminderService = require('./reminder.service');
    }
    return reminderService;
};

class PaymentService {
    /**
     * Tạo lịch thanh toán cho khoản vay
     * @param {string} loanId - ID khoản vay
     * @param {boolean} force - Force tạo lại nếu đã có
     */
    async createPaymentSchedule(loanId, force = false) {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        if (loan.status !== LOAN_STATUS.ACTIVE) {
            throw new ValidationError('Chỉ tạo lịch thanh toán cho khoản vay đang hoạt động');
        }

        const existingPayments = await Payment.find({ loanId });
        if (existingPayments.length > 0) {
            if (!force) {
                return existingPayments;
            }
            // Xóa payments cũ nếu force
            await Payment.deleteMany({ loanId });
        }

        const payments = [];
        const monthlyPrincipal = loan.capital / loan.term;
        const monthlyInterest = loan.totalInterest / loan.term;

        for (let i = 1; i <= loan.term; i++) {
            const dueDate = new Date(loan.disbursedAt);
            dueDate.setMonth(dueDate.getMonth() + i);

            // Tính totalAmount từ unrounded values để đảm bảo tính nhất quán toán học
            const totalAmount = Math.round(monthlyPrincipal + monthlyInterest);

            // Round từng thành phần
            const roundedPrincipal = Math.round(monthlyPrincipal);
            const roundedInterest = Math.round(monthlyInterest);

            // Điều chỉnh để đảm bảo totalAmount = principalAmount + interestAmount
            // Nếu có sai số do rounding, điều chỉnh interestAmount
            const calculatedTotal = roundedPrincipal + roundedInterest;
            const adjustedInterest = roundedInterest + (totalAmount - calculatedTotal);

            const payment = await Payment.create({
                loanId: loan._id,
                borrowerId: loan.borrowerId,
                orderNo: i,
                principalAmount: roundedPrincipal,
                interestAmount: adjustedInterest,
                penaltyAmount: 0,
                totalAmount: totalAmount,
                dueDate,
                status: SETTLEMENT_STATUS.UNDUE
            });

            payments.push(payment);
        }

        return payments;
    }

    /**
     * Lấy danh sách thanh toán của khoản vay
     */
    async getPaymentsByLoan(loanId) {
        return await Payment.find({ loanId })
            .sort({ orderNo: 1 });
    }

    /**
     * Lấy thanh toán cần trả của người vay
     */
    async getDuePayments(borrowerId) {
        return await Payment.find({
            borrowerId,
            status: { $in: [SETTLEMENT_STATUS.UNDUE, SETTLEMENT_STATUS.DUE, SETTLEMENT_STATUS.OVERDUE] }
        })
            .populate('loanId', 'capital term purpose')
            .sort({ dueDate: 1 });
    }

    /**
     * Thanh toán một kỳ
     */
    async payPayment(paymentId, borrowerId) {
        const payment = await Payment.findById(paymentId);
        if (!payment) {
            throw new NotFoundError('Không tìm thấy thanh toán');
        }

        if (payment.borrowerId.toString() !== borrowerId) {
            throw new ValidationError('Không có quyền thanh toán');
        }

        if (payment.status === SETTLEMENT_STATUS.SETTLED) {
            throw new ValidationError('Kỳ thanh toán đã được thanh toán');
        }

        // Check số dư
        const wallet = await walletService.getOrCreateWallet(borrowerId);
        const availableBalance = wallet.balance - wallet.frozenBalance;

        if (availableBalance < payment.totalAmount) {
            throw new ValidationError('Số dư không đủ để thanh toán');
        }

        const loan = await Loan.findById(payment.loanId);

        // BƯỚC 1: Người vay trả tiền vào Admin Escrow
        const repaymentRef = `PAYMENT_REPAY_${payment._id}`;
        await walletService.repaymentToEscrow(
            borrowerId,
            payment.totalAmount,
            `Thanh toán kỳ ${payment.orderNo} - Khoản vay ${loan.purpose || loan._id}`,
            loan._id,
            repaymentRef
        );

        payment.status = SETTLEMENT_STATUS.SETTLED;
        payment.paidDate = new Date();
        await payment.save();

        // Gửi thông báo
        await notificationService.notifyRepaymentSuccess(payment);

        const investments = await Investment.find({ loanId: loan._id, status: 'active' });

        // Group payments by investor
        const payouts = {};

        // Thu phí dịch vụ (lấy từ Config hoặc default)
        let serviceFeePercent = DEFAULT_SERVICE_FEE;
        const feeConfig = await Config.findOne({ key: 'SERVICE_FEE' });
        if (feeConfig && !isNaN(feeConfig.value)) {
            serviceFeePercent = Number(feeConfig.value);
        }

        for (const investment of investments) {
            const investorShare = investment.amount / loan.capital;

            // Chia lại gốc và lãi tương ứng
            const principalShare = Math.round(payment.principalAmount * investorShare);
            const interestShare = Math.round(payment.interestAmount * investorShare);

            // Tính phí dịch vụ trên LÃI
            const fee = Math.round(interestShare * serviceFeePercent);

            // Tổng thực nhận = Gốc + (Lãi - Phí)
            const netShare = principalShare + (interestShare - fee);

            if (!payouts[investment.investorId]) {
                payouts[investment.investorId] = {
                    amount: 0,
                    fee: 0,
                    investmentId: investment._id // Dùng investmentId của bản ghi đầu tiên (thường 1 investor chỉ có 1 investment mỗi loan)
                };
            }
            payouts[investment.investorId].amount += netShare;
            payouts[investment.investorId].fee += fee;
        }


        // BƯỚC 2: Admin Escrow trả tiền cho NĐT (Đã trừ phí)
        for (const [investorId, data] of Object.entries(payouts)) {
            // data.amount là số tiền thực nhận (đã trừ phí)
            // data.fee là số tiền Admin giữ lại
            await walletService.payoutFromEscrow(
                investorId,
                data.amount,
                `Nhận thanh toán kỳ ${payment.orderNo} - Khoản vay ${loan.purpose || loan._id} (Phí: ${data.fee}đ)`,
                loan._id,
                data.fee, // Truyền phí vào để log doanh thu cho Admin
                data.investmentId,
                repaymentRef // Dùng chung referenceId để trace
            );
        }

        const allPayments = await Payment.find({ loanId: loan._id });
        const allSettled = allPayments.every(p => p.status === SETTLEMENT_STATUS.SETTLED);

        if (allSettled) {
            loan.status = LOAN_STATUS.COMPLETED;
            await loan.save();
        }

        // Hủy các nhắc hẹn của payment đã thanh toán
        try {
            await getReminderService().cancelRemindersForPayment(paymentId);
        } catch (err) {
            // Không throw error nếu hủy reminder thất bại
        }

        return payment;
    }

    /**
     * Cập nhật trạng thái thanh toán và tính phí phạt (tự động)
     */
    async updatePaymentStatuses() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Cập nhật Undue -> Due
        await Payment.updateMany(
            {
                status: SETTLEMENT_STATUS.UNDUE,
                dueDate: { $lte: today }
            },
            {
                status: SETTLEMENT_STATUS.DUE
            }
        );

        // 2. Cập nhật Due -> Overdue (sau 5 ngày ân hạn)
        const overdueDate = new Date(today);
        overdueDate.setDate(overdueDate.getDate() - 5);

        await Payment.updateMany(
            {
                status: SETTLEMENT_STATUS.DUE,
                dueDate: { $lt: overdueDate }
            },
            {
                status: SETTLEMENT_STATUS.OVERDUE
            }
        );

        // 3. Tính phí phạt hàng ngày cho các khoản DUE và OVERDUE
        // Tìm tất cả payments chưa thanh toán và đã qua dueDate
        const duePayments = await Payment.find({
            status: { $in: [SETTLEMENT_STATUS.DUE, SETTLEMENT_STATUS.OVERDUE] },
            dueDate: { $lt: today }
        }).populate('loanId');

        for (const payment of duePayments) {
            try {
                const loan = payment.loanId;
                if (!loan) continue;

                // 1. Tính số ngày chậm trả thực tế
                const dueDate = new Date(payment.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 0) continue;

                // 2. Chuẩn hóa lãi suất về theo NGÀY (Daily Rate)
                const annualInterestRate = loan.interestRate; // Lãi suất lưu trong DB là lãi năm
                const dailyRate = annualInterestRate / 365;

                let principalPenalty = 0;
                let interestPenalty = 0;

                // 3. Tính Lãi trên Nợ Gốc Quá Hạn (Max 150% lãi suất trong hạn)
                if (payment.status === SETTLEMENT_STATUS.OVERDUE) {
                    const penaltyRate = dailyRate * PENALTY_PRINCIPAL_FACTOR;
                    principalPenalty = Math.round(payment.principalAmount * penaltyRate * diffDays);
                } else if (payment.status === SETTLEMENT_STATUS.DUE) {
                    principalPenalty = Math.round(payment.principalAmount * dailyRate * diffDays);
                }

                // B. Lãi trên số tiền lãi chậm trả (10%/năm)
                const lateInterestDailyRate = PENALTY_INTEREST_RATE / 365;
                interestPenalty = Math.round(payment.interestAmount * lateInterestDailyRate * diffDays);

                const totalPenalty = principalPenalty + interestPenalty;

                // Cập nhật vào payment
                payment.penaltyAmount = totalPenalty;
                payment.totalAmount = payment.principalAmount + payment.interestAmount + payment.penaltyAmount;

                await payment.save();

                logger.info(`[Penalty] Updated payment ${payment._id}: ${diffDays} days late. Total Penalty: ${totalPenalty} VND`);
            } catch (err) {
                logger.error(`Error calculating penalty for payment ${payment._id}:`, err);
            }
        }
    }

    /**
     * Lấy tất cả payments của user
     */
    async getAllPaymentsByUser(userId, page = 1, limit = 10) {
        const skip = (Number(page) - 1) * Number(limit);
        const query = { borrowerId: userId };
        const payments = await Payment.find(query)
            .populate('loanId', 'capital term purpose status')
            .sort({ dueDate: 1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Payment.countDocuments(query);
        return { payments, total };
    }

    /**
     * Lấy lịch sử thanh toán (đã trả)
     */
    async getPaymentHistory(userId, page = 1, limit = 10) {
        const query = {
            borrowerId: userId,
            status: SETTLEMENT_STATUS.SETTLED
        };
        const skip = (Number(page) - 1) * Number(limit);
        const payments = await Payment.find(query)
            .populate('loanId', 'capital term purpose')
            .sort({ paidDate: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Payment.countDocuments(query);
        return { payments, total };
    }

    /**
     * Trả nhiều kỳ cùng lúc
     */
    async payMultiplePayments(paymentIds, userId) {
        const results = [];

        for (const paymentId of paymentIds) {
            try {
                const payment = await this.payPayment(paymentId, userId);
                results.push({ paymentId, success: true, payment });
            } catch (error) {
                results.push({ paymentId, success: false, error: error.message });
            }
        }

        return results;
    }
}

module.exports = new PaymentService();
