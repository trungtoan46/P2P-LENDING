/**
 * Service xử lý logic nghiệp vụ cho đầu tư
 */

const Investment = require('../models/Investment');
const Loan = require('../models/Loan');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const walletService = require('./wallet.service');
const fabricService = require('../external/FabricService');
const { calculateInvestmentReturns, calculateNotes, generateRandomString } = require('../utils/helpers');
const { INVESTMENT_STATUS, BASE_UNIT_PRICE, LOAN_STATUS } = require('../constants');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');

class InvestmentService {
    maskPhone(phone) {
        if (!phone) return phone;
        const normalized = String(phone);
        if (normalized.length <= 5) {
            return `${normalized.slice(0, 1)}****`;
        }
        return `${normalized.slice(0, 3)}****${normalized.slice(-3)}`;
    }

    sanitizeInvestmentForPublic(investment) {
        const investmentObj = investment.toObject ? investment.toObject() : investment;
        if (investmentObj.investorId && investmentObj.investorId.phone) {
            investmentObj.investorId.phone = this.maskPhone(investmentObj.investorId.phone);
        }
        return investmentObj;
    }
    /**
     * Tạo đầu tư từ AutoInvest (Matching Service gọi)
     * @param {Object} autoInvest - Document AutoInvest (đã matched)
     * @param {Object} loan - Document Loan
     * @param {Number} amount - Số tiền match
     * @param {Number} notes - Số notes match
     * @returns {Object} Investment created
     */
    async createAutoInvestment(autoInvest, loan, amount, notes) {
        // Validate inputs
        if (!autoInvest || !loan || !amount || !notes) {
            throw new ValidationError('Missing required data for auto investment');
        }

        const returns = calculateInvestmentReturns(amount, loan.interestRate, loan.term);
        const referenceId = `auto_${Date.now()}_${generateRandomString(8)}`;

        // Create Investment Record
        const investment = await Investment.create({
            investorId: autoInvest.investorId,
            loanId: loan._id,
            amount,
            notes,
            status: INVESTMENT_STATUS.PENDING, // Changed to PENDING to require user confirmation
            monthlyReturn: returns.monthlyReturn,
            totalReturn: returns.totalReturn,
            grossProfit: returns.grossProfit,
            netProfit: returns.netProfit,
            serviceFee: returns.serviceFee,
            matchedAt: new Date(),
            autoInvestId: autoInvest._id // Link back to AutoInvest config if schema supports (need to add to Investment model if want tracking)
        });

        try {
            // Deduct from Wallet
            await walletService.deduct(
                autoInvest.investorId,
                amount,
                `Đầu tư tự động vào khoản vay ${loan._id}`,
                loan._id,
                investment._id,
                referenceId
            );

            // Update Transaction
            const updated = await Transaction.findOneAndUpdate(
                { referenceId },
                { investmentId: investment._id }
            );

            if (!updated) {
                // Transaction might be created in deduct, wait/retry logic usually needed if async, 
                // but walletService.deduct awaits internal creation.
                // If deduct failed, it threw error. If succeeded, transaction exists.
                // If findOneAndUpdate fails, it means referenceId incorrect?
                // Just warning here as money is deducted.
                logger.warn(`Could not link transaction to investment ${investment._id}`);
            }

            // Update Loan Invested Notes
            // NOTE: autoInvest status is updated in matching service via atomic operation

            loan.investedNotes += notes;
            if (loan.investedNotes >= loan.totalNotes) {
                loan.status = LOAN_STATUS.WAITING_SIGNATURE;
                // Gui thong bao cho borrower de ky hop dong
                await notificationService.notifyLoanFunded(loan);
            }
            await loan.save();

            logger.info(`Auto investment created: ${investment._id} for loan ${loan._id}`);
            return investment;

        } catch (error) {
            // Rollback
            logger.error(`Auto invest failed, rolling back: ${error.message}`);
            await Investment.findByIdAndDelete(investment._id);
            // Deduct rollback is complex if generic wallet service doesn't support.
            // Assuming walletService.deduct is transactional or we need manual refund.
            // If deduct failed, money wasn't taken.
            // If deduct succeded but Transaction update failed? unlikely to throw unless DB error.
            throw error;
        }
    }


    /**
     * Tạo đầu tư trực tiếp (không qua phòng chờ)
     * @param {String} investorId - ID người đầu tư
     * @param {String} loanId - ID khoản vay
     * @param {Number} amount - Số tiền đầu tư
     * @returns {Object} Đầu tư đã tạo
     */
    async createDirectInvestment(investorId, loanId, amount) {
        // Tìm khoản vay
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        // Kiểm tra khoản vay đã được duyệt chưa
        if (loan.status !== LOAN_STATUS.APPROVED) {
            throw new ValidationError('Khoản vay chưa sẵn sàng để đầu tư');
        }

        if (amount < BASE_UNIT_PRICE) {
            throw new ValidationError(`Số tiền đầu tư tối thiểu là ${BASE_UNIT_PRICE} VND`);
        }

        const notes = calculateNotes(amount);
        const remainingNotes = loan.totalNotes - loan.investedNotes;
        if (remainingNotes < notes) {
            throw new ValidationError('Khoản vay không còn đủ notes để đầu tư');
        }

        const returns = calculateInvestmentReturns(amount, loan.interestRate, loan.term);

        // Tạo referenceId unique để link transaction với investment
        const referenceId = `inv_${Date.now()}_${generateRandomString(8)}`;

        // Tạo investment trước để đảm bảo có record trước khi deduct
        const investment = await Investment.create({
            investorId,
            loanId: loan._id,
            amount,
            notes,
            status: INVESTMENT_STATUS.ACTIVE, // Direct investment is active immediately
            monthlyReturn: returns.monthlyReturn,
            totalReturn: returns.totalReturn,
            grossProfit: returns.grossProfit,
            netProfit: returns.netProfit,
            serviceFee: returns.serviceFee,
            matchedAt: new Date()
        });

        try {
            // Trừ tiền sau khi đã có investment
            await walletService.deduct(
                investorId,
                amount,
                `Đầu tư vào khoản vay ${loan._id}`,
                loan._id,
                investment._id,
                referenceId
            );

            // Cập nhật transaction với investmentId (đã có sẵn từ deduct)
            const updated = await Transaction.findOneAndUpdate(
                { referenceId },
                { investmentId: investment._id }
            );

            if (!updated) {
                throw new ValidationError('Lỗi khi liên kết transaction với investment');
            }

            // Cap nhat loan
            loan.investedNotes += notes;
            if (loan.investedNotes >= loan.totalNotes) {
                loan.status = LOAN_STATUS.WAITING_SIGNATURE;
                // Gui thong bao cho borrower de ky hop dong
                await notificationService.notifyLoanFunded(loan);
            }
            await loan.save();

            // Ghi blockchain (nếu kích hoạt)
            try {
                const investor = await User.findById(investorId).select('phone');
                const blockchainResult = await fabricService.createInvestContract(
                    { _id: investorId, phone: investor?.phone },
                    { contractId: loan.blockchainContractId || loan._id.toString() },
                    amount,
                    notes
                );
                if (blockchainResult) {
                    investment.blockchainContractId = blockchainResult.contractId || blockchainResult._id;
                    await investment.save();
                    logger.info(`[Đã ghi blockchain] Investment ${investment._id} -> Contract ${investment.blockchainContractId}`);
                }
            } catch (bcError) {
                logger.warn(`[Blockchain] Không ghi được blockchain cho investment ${investment._id}: ${bcError.message}`);
            }

            logger.info(`Direct investment created (PENDING): ${investment._id} for loan ${loanId}`);

            return investment;
        } catch (error) {
            // Rollback: xóa investment và transaction nếu có
            await Investment.findByIdAndDelete(investment._id);
            await Transaction.findOneAndDelete({ referenceId });
            throw error;
        }
    }

    /**
     * Lấy đầu tư theo ID
     */
    async getInvestmentById(investmentId, userId = null) {
        const investment = await Investment.findById(investmentId)
            .populate('investorId', 'phone category')
            .populate('loanId');

        if (!investment) {
            throw new NotFoundError('Không tìm thấy đầu tư');
        }

        if (userId && investment.investorId._id.toString() !== userId) {
            const user = await User.findById(userId);
            if (!user || user.category !== 'admin') {
                throw new ValidationError('Không có quyền xem đầu tư này');
            }
        }

        return investment;
    }

    /**
     * Lấy danh sách đầu tư của người đầu tư
     */
    async getInvestmentsByInvestor(investorId, filters = {}, page = 1, limit = 10) {
        const query = { investorId };
        if (filters.status) {
            if (filters.status.includes(',')) {
                query.status = { $in: filters.status.split(',').map(s => s.trim()) };
            } else {
                query.status = filters.status;
            }
        }
        const skip = (Number(page) - 1) * Number(limit);
        const investments = await Investment.find(query)
            .populate('loanId', 'capital term interestRate purpose status')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Investment.countDocuments(query);
        return { investments, total };
    }

    /**
     * Lấy danh sách đầu tư của khoản vay
     */
    async getInvestmentsByLoan(loanId, page = 1, limit = 10) {
        const skip = (Number(page) - 1) * Number(limit);
        const investments = await Investment.find({ loanId })
            .populate('investorId', 'phone category')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Investment.countDocuments({ loanId });
        return {
            investments: investments.map((investment) => this.sanitizeInvestmentForPublic(investment)),
            total
        };
    }

    /**
     * Cập nhật trạng thái đầu tư
     */
    async updateInvestmentStatus(investmentId, status) {
        const investment = await Investment.findById(investmentId);
        if (!investment) {
            throw new NotFoundError('Không tìm thấy đầu tư');
        }

        investment.status = status;
        if (status === INVESTMENT_STATUS.COMPLETED) {
            investment.completedAt = new Date();
        }

        await investment.save();
        return investment;
    }

    /**
     * Xác nhận đầu tư (Chuyển từ PENDING -> ACTIVE)
     */
    async confirmInvestment(investmentId, userId) {
        const investment = await Investment.findById(investmentId);
        if (!investment) throw new NotFoundError('Không tìm thấy khoản đầu tư');

        if (investment.investorId.toString() !== userId) {
            throw new ValidationError('Không có quyền xác nhận khoản đầu tư này');
        }

        if (investment.status !== INVESTMENT_STATUS.PENDING) {
            throw new ValidationError('Khoản đầu tư không ở trạng thái chờ xác nhận');
        }

        investment.status = INVESTMENT_STATUS.ACTIVE;
        await investment.save();

        logger.info(`Investment confirmed by user: ${investment._id}`);
        return investment;
    }
}

module.exports = new InvestmentService();

