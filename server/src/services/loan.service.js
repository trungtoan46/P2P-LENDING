/**
 * Service xử lý logic nghiệp vụ cho khoản vay
 */

const Loan = require('../models/Loan');
const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const Config = require('../models/Config');
const paymentService = require('./payment.service');
const reminderService = require('./reminder.service');
const notificationService = require('./notification.service');
const walletService = require('./wallet.service');
const fabricService = require('../external/FabricService');
const creditScoringService = require('../external/CreditScoringService');
const matchingService = require('./matching.service');
const {
    calculateInterestRate,
    calculateMonthlyPayment,
    calculateTotalInterest,
    calculateNotes,
    addMonths,
    addDays
} = require('../utils/helpers');
const {
    LOAN_STATUS,
    BASE_UNIT_PRICE,
    INVESTING_STAGE_DAYS,
    DEFAULT_CREDIT_SCORE,
    MAX_ACTIVE_LOAN_COUNT,
    MAX_TOTAL_BORROWING_PLATFORM } = require('../constants');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');

class LoanService {
    maskPhone(phone) {
        if (!phone) return phone;
        const normalized = String(phone);
        if (normalized.length <= 5) {
            return `${normalized.slice(0, 1)}****`;
        }
        return `${normalized.slice(0, 3)}****${normalized.slice(-3)}`;
    }

    sanitizeLoanForPublic(loan) {
        const loanObj = loan.toObject ? loan.toObject() : loan;
        delete loanObj.bankAccountNumber;
        delete loanObj.walletAccountNumber;
        delete loanObj.bankAccountHolderName;
        if (loanObj.borrowerId && loanObj.borrowerId.phone) {
            loanObj.borrowerId.phone = this.maskPhone(loanObj.borrowerId.phone);
        }
        return loanObj;
    }
    /**
     * Tạo đơn vay mới
     * @param {Object} data - Dữ liệu khoản vay
     * @param {String} data.borrowerId - ID người vay
     * @param {Number} data.capital - Số tiền vay
     * @param {Number} data.term - Kỳ hạn vay (tháng)
     * @param {String} data.purpose - Mục đích vay
     * @param {Date} data.disbursementDate - Ngày giải ngân
     * @returns {Object} Khoản vay đã tạo
     */
    async createLoan(data) {
        const {
            borrowerId, capital, term, purpose, disbursementDate, monthlyIncome, annualIncome,
            method, walletAccountNumber, bankName, bankAccountNumber, bankAccountHolderName,
            interestRate: customInterestRate
        } = data;

        // Kiểm tra người vay có tồn tại không
        const borrower = await User.findById(borrowerId);
        if (!borrower) {
            throw new NotFoundError('Không tìm thấy người vay');
        }

        // Kiểm tra người vay đã xác thực chưa
        if (!borrower.isVerified) {
            throw new ValidationError('Người vay phải được xác thực trước khi tạo đơn vay');
        }

        // Kiểm tra số lượng khoản vay đang hoạt động
        const activeLoans = await Loan.countDocuments({
            borrowerId,
            status: { $in: [LOAN_STATUS.PENDING, LOAN_STATUS.APPROVED, LOAN_STATUS.ACTIVE, LOAN_STATUS.WAITING] }
        });

        if (activeLoans >= MAX_ACTIVE_LOAN_COUNT) {
            throw new ConflictError(`Chỉ được phép có tối đa ${MAX_ACTIVE_LOAN_COUNT} khoản vay đang hoạt động`);
        }

        // Kiểm tra hạn mức vay tối đa trên nền tảng (Nghị định 2026: 100 triệu VND/nền tảng)
        const totalOutstandingResult = await Loan.aggregate([
            {
                $match: {
                    borrowerId: borrower._id,
                    status: { $in: [LOAN_STATUS.PENDING, LOAN_STATUS.APPROVED, LOAN_STATUS.ACTIVE, LOAN_STATUS.WAITING, LOAN_STATUS.WAITING_SIGNATURE] }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCapital: { $sum: '$capital' }
                }
            }
        ]);

        const currentTotalBorrowing = totalOutstandingResult.length > 0 ? totalOutstandingResult[0].totalCapital : 0;
        const projectedTotal = currentTotalBorrowing + capital;

        if (projectedTotal > MAX_TOTAL_BORROWING_PLATFORM) {
            const remaining = MAX_TOTAL_BORROWING_PLATFORM - currentTotalBorrowing;
            const formatVND = (n) => n.toLocaleString('vi-VN');
            throw new ConflictError(
                `Vượt hạn mức vay tối đa trên nền tảng (Nghị định 2026). ` +
                `Tổng dư nợ hiện tại: ${formatVND(currentTotalBorrowing)} VND. ` +
                `Hạn mức tối đa: ${formatVND(MAX_TOTAL_BORROWING_PLATFORM)} VND. ` +
                `Số tiền còn có thể vay: ${formatVND(Math.max(0, remaining))} VND.`
            );
        }

        // Lấy thông tin chi tiết người vay để gọi Credit Scoring API
        const userDetails = await UserDetails.findOne({ userId: borrowerId });

        // Nếu user nhập thu nhập khi tạo khoản vay, lưu vào UserDetails (thu nhập theo tháng)
        if (userDetails) {
            let updatedIncome = null;
            if (annualIncome && Number(annualIncome) > 0) {
                updatedIncome = Math.round(Number(annualIncome) / 12);
            } else if (monthlyIncome && Number(monthlyIncome) > 0) {
                updatedIncome = Number(monthlyIncome);
            }
            if (updatedIncome !== null) {
                await UserDetails.updateOne(
                    { userId: borrowerId },
                    { $set: { income: updatedIncome } }
                );
                userDetails.income = updatedIncome;
            }
        }

        // Gọi Credit Scoring API để lấy điểm tín dụng thực
        let creditScore = userDetails?.score || DEFAULT_CREDIT_SCORE;
        let creditGrade = userDetails?.creditGrade || null;

        // Tính lãi suất tạm thời để gửi sang scoring
        let preInterestRate = calculateInterestRate(creditScore, capital, term);
        if (customInterestRate !== undefined && customInterestRate !== null) {
            preInterestRate = Number(customInterestRate);
            if (preInterestRate > 1) preInterestRate = preInterestRate / 100; // allow both 15 and 0.15 formats
        }
        const annualIncomeForScoring = annualIncome
            ? Number(annualIncome)
            : monthlyIncome
                ? Number(monthlyIncome) * 12
                : userDetails?.income
                    ? userDetails.income * 12
                    : null;

        try {
            const scoringResult = await creditScoringService.getCreditScore({
                loanAmount: capital,
                annualIncome: annualIncomeForScoring,
                term: term,
                interestRate: Math.round(preInterestRate * 10000) / 100,
                homeOwnership: userDetails?.job?.includes('chủ') ? 'own' : 'rent',
                purpose: purpose,
                city: userDetails?.city,
                employmentLength: null // Có thể thêm vào UserDetails nếu cần
            });

            if (scoringResult.success && scoringResult.creditScore) {
                creditScore = scoringResult.creditScore;
                creditGrade = scoringResult.grade;

                // Cập nhật điểm tín dụng vào UserDetails
                await UserDetails.findOneAndUpdate(
                    { userId: borrowerId },
                    {
                        $set: {
                            score: scoringResult.creditScore,
                            creditGrade: scoringResult.grade,
                            pdPercent: scoringResult.pdPercent,
                            scoringDecision: scoringResult.decision,
                            lastScoringAt: new Date()
                        }
                    }
                );

                logger.info(`[CreditScoring] Đã cập nhật điểm cho user ${borrowerId}: Score=${creditScore}, Grade=${creditGrade}`);
            } else {
                logger.warn(`[CreditScoring] API không trả về điểm, sử dụng điểm mặc định: ${creditScore}`);
            }
        } catch (scoringError) {
            logger.error(`[CreditScoring] Lỗi gọi API: ${scoringError.message}. Sử dụng điểm mặc định: ${creditScore}`);
        }

        let interestRate;
        if (customInterestRate !== undefined && customInterestRate !== null) {
            interestRate = Number(customInterestRate);
            if (interestRate > 1) interestRate = interestRate / 100;
        } else {
            interestRate = calculateInterestRate(creditScore, capital, term);
        }
        const monthlyPayment = calculateMonthlyPayment(capital, interestRate, term);
        const totalInterest = calculateTotalInterest(capital, monthlyPayment, term);
        const totalRepayment = capital + totalInterest;
        const totalNotes = calculateNotes(capital);
        const maturityDate = addMonths(disbursementDate, term);
        // Hạn chót gọi vốn chính là ngày giải ngân dự kiến
        const investingEndDate = disbursementDate;

        // Ghi blockchain trước - bắt buộc phải thành công
        let blockchainContractId = null;
        try {
            const blockchainResult = await fabricService.createLoanContractAuto(
                { _id: borrowerId, phone: borrower.phone },
                capital,
                term,
                creditScore,
                purpose,
                disbursementDate
            );
            if (blockchainResult) {
                blockchainContractId = blockchainResult.contractId || blockchainResult._id;
                logger.info(`[Blockchain] Đã tạo contract: ${blockchainContractId}`);
            } else {
                throw new Error('Blockchain không trả về kết quả');
            }
        } catch (bcError) {
            logger.error(`[Blockchain] Lỗi ghi blockchain: ${bcError.message}`);
            throw new ValidationError(`Không thể tạo khoản vay: Lỗi kết nối blockchain - ${bcError.message}`);
        }

        // Chỉ tạo khoản vay trong MongoDB sau khi blockchain thành công
        const loan = await Loan.create({
            borrowerId,
            capital,
            term,
            interestRate,
            purpose,
            status: LOAN_STATUS.PENDING,
            totalNotes,
            investedNotes: 0,
            disbursementDate,
            maturityDate,
            investingEndDate,
            monthlyPayment,
            totalInterest,
            totalRepayment,
            creditScore,
            blockchainContractId,
            // Disbursement method info
            method,
            walletAccountNumber,
            bankName,
            bankAccountNumber,
            bankAccountHolderName
        });

        logger.info(`Đã tạo khoản vay: ${loan._id} bởi người vay ${borrowerId}`);

        // Cập nhật thông tin giải ngân vào UserDetails để tự động điền lần sau
        if (method && userDetails) {
            const updateData = { lastDisbursementMethod: method };
            if (method === 'bank' && bankName) {
                updateData.lastBankName = bankName;
                updateData.lastBankAccountNumber = bankAccountNumber;
                updateData.lastBankAccountHolderName = bankAccountHolderName;
            }
            await UserDetails.findOneAndUpdate(
                { userId: borrowerId },
                { $set: updateData }
            );
            logger.info(`[Disbursement] Đã lưu thông tin giải ngân vào UserDetails cho user ${borrowerId}`);
        }

        // Gửi thông báo tạo đơn vay thành công
        await notificationService.notifyLoanCreated(loan);

        // === Kiểm tra cấu hình tự duyệt ===
        try {
            const approvalConfig = await Config.findOne({ key: 'loan_approval_mode' });
            const mode = approvalConfig?.value?.mode || 'manual';

            let shouldAutoApprove = false;

            if (mode === 'auto_full') {
                shouldAutoApprove = true;
                logger.info(`[AutoApprove] Chế độ tự duyệt toàn bộ - Loan ${loan._id}`);
            } else if (mode === 'auto_conditional') {
                const conditions = approvalConfig.value.conditions || {};
                const minScore = conditions.minCreditScore || 600;
                const maxCap = conditions.maxCapital || 50000000;
                const maxTerm = conditions.maxTerm || 12;

                if (creditScore >= minScore && capital <= maxCap && term <= maxTerm) {
                    shouldAutoApprove = true;
                    logger.info(`[AutoApprove] Đạt điều kiện tự duyệt - Loan ${loan._id} (Score: ${creditScore}>=${minScore}, Capital: ${capital}<=${maxCap}, Term: ${term}<=${maxTerm})`);
                } else {
                    logger.info(`[AutoApprove] Không đạt điều kiện - Loan ${loan._id} (Score: ${creditScore}, Capital: ${capital}, Term: ${term})`);
                }
            }

            if (shouldAutoApprove) {
                loan.status = LOAN_STATUS.APPROVED;
                // loan.approvedBy = 'system'; // This causes Cast to ObjectId error
                loan.approvedAt = new Date();
                await loan.save();

                // Ghi blockchain
                if (loan.blockchainContractId) {
                    try {
                        await fabricService.updateLoanStatus(
                            loan.blockchainContractId,
                            'approved',
                            { adminId: 'system', approvedAt: new Date().toISOString() }
                        );
                    } catch (bcErr) {
                        logger.warn(`[AutoApprove] Lỗi ghi blockchain: ${bcErr.message}`);
                    }
                }

                // Gửi thông báo đã duyệt
                await notificationService.notifyLoanApproved(loan);

                // Kích hoạt Auto-Invest Matching
                matchingService.performMatching(loan._id).catch(err => {
                    logger.error(`[AutoInvest] Lỗi matching sau khi auto-approve loan ${loan._id}: ${err.message}`);
                });

                logger.info(`[AutoApprove] Đã tự duyệt khoản vay: ${loan._id}`);
            }
        } catch (autoErr) {
            // Không throw lỗi - khoản vay vẫn được tạo ở trạng thái PENDING
            logger.error(`[AutoApprove] Lỗi kiểm tra tự duyệt: ${autoErr.message}`);
        }

        return loan;
    }

    /**
     * Lấy thông tin khoản vay theo ID
     * @param {String} loanId - ID khoản vay
     * @param {String} userId - ID người dùng (để kiểm tra quyền, có thể null)
     * @returns {Object} Thông tin khoản vay
     */
    async getLoanById(loanId, userId = null, userRole = null) {
        const loan = await Loan.findById(loanId)
            .populate('borrowerId', 'phone category')
            .populate('approvedBy', 'phone');

        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        const publicStatuses = [LOAN_STATUS.APPROVED, LOAN_STATUS.WAITING_SIGNATURE, LOAN_STATUS.WAITING, LOAN_STATUS.ACTIVE, LOAN_STATUS.SUCCESS, LOAN_STATUS.COMPLETED];

        if (!publicStatuses.includes(loan.status)) {
            if (!userId) {
                throw new ValidationError('Không có quyền xem khoản vay này');
            }
            if (userRole === 'admin') {
                return loan;
            }
            if (loan.borrowerId._id.toString() !== userId) {
                const user = await User.findById(userId);
                if (!user || user.category !== 'admin') {
                    // Check if user is an investor or has waiting room
                    const Investment = require('../models/Investment');
                    const WaitingRoom = require('../models/WaitingRoom');

                    const [hasInvestment, hasWaitingRoom] = await Promise.all([
                        Investment.exists({ loanId: loan._id, investorId: userId }),
                        WaitingRoom.exists({ loanId: loan._id, userId: userId })
                    ]);

                    if (!hasInvestment && !hasWaitingRoom) {
                        throw new ValidationError('Không có quyền xem khoản vay này');
                    }
                }
            }
        }
        const isAdmin = userRole === 'admin';
        const isOwner = userId && loan.borrowerId?._id?.toString() === userId;
        if (isAdmin || isOwner) {
            return loan;
        }
        return this.sanitizeLoanForPublic(loan);
    }

    /**
     * Lấy danh sách khoản vay của người vay
     * @param {String} borrowerId - ID người vay
     * @param {Object} filters - Bộ lọc (status)
     * @returns {Array} Danh sách khoản vay
     */
    async getLoansByBorrower(borrowerId, filters = {}) {
        const query = { borrowerId };

        if (filters.status) {
            query.status = filters.status;
        }

        const loans = await Loan.find(query)
            .sort({ createdAt: -1 })
            .populate('borrowerId', 'phone category');

        // Tính toán số tiền đã trả và còn lại cho mỗi khoản vay
        const Payment = require('../models/Payment');
        const { SETTLEMENT_STATUS } = require('../constants');

        const enrichedLoans = await Promise.all(loans.map(async (loan) => {
            const loanObj = loan.toObject();

            if (loan.status === LOAN_STATUS.ACTIVE || loan.status === LOAN_STATUS.SUCCESS || loan.status === LOAN_STATUS.COMPLETED) {
                const payments = await Payment.find({
                    loanId: loan._id,
                    status: SETTLEMENT_STATUS.SETTLED
                });

                const paidAmount = payments.reduce((sum, p) => sum + p.totalAmount, 0);
                loanObj.paidAmount = paidAmount;
                loanObj.remainingAmount = Math.max(0, (loan.totalRepayment || 0) - paidAmount);
                loanObj.completionPercentage = loan.totalRepayment > 0
                    ? Math.round((paidAmount / loan.totalRepayment) * 100)
                    : 100;
            } else {
                loanObj.paidAmount = 0;
                loanObj.remainingAmount = loan.totalRepayment || loan.capital;
                loanObj.completionPercentage = loan.totalNotes > 0
                    ? Math.round((loan.investedNotes / loan.totalNotes) * 100)
                    : 0;
            }

            return loanObj;
        }));

        return enrichedLoans;
    }

    /**
     * Lấy tất cả khoản vay (cho admin hoặc công khai)
     * @param {Object} filters - Bộ lọc
     * @returns {Array} Danh sách khoản vay
     */
    async getAllLoans(filters = {}) {
        const query = {};

        console.log('[LoanService] getAllLoans filters:', filters);

        if (filters.status) {
            if (filters.status === 'all') {
                // Return all - no status filter needed
            } else if (filters.status.includes(',')) {
                query.status = { $in: filters.status.split(',') };
            } else {
                query.status = filters.status;
            }
        } else {
            // Mặc định cho trang danh sách chung của Admin: 
            // Nếu không chọn filter cụ thể, nên hiện đa số các trạng thái quan trọng
            // Hoặc đơn giản là không filter để Admin thấy hết
            // query.status = { $in: [LOAN_STATUS.PENDING, LOAN_STATUS.APPROVED, LOAN_STATUS.WAITING, LOAN_STATUS.ACTIVE] };
        }

        const loans = await Loan.find(query)
            .populate('borrowerId', 'phone category')
            .sort({ createdAt: -1 })
            .limit(filters.limit || 50)
            .skip(filters.skip || 0);

        console.log(`[LoanService] Found ${loans.length} loans for query:`, query);
        return loans.map(loan => this.sanitizeLoanForPublic(loan));
    }

    /**
     * Duyệt khoản vay (chỉ admin)
     * @param {String} loanId - ID khoản vay
     * @param {String} adminId - ID admin
     * @returns {Object} Khoản vay đã cập nhật
     */
    async approveLoan(loanId, adminId) {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        if (loan.status !== LOAN_STATUS.PENDING) {
            throw new ValidationError('Chỉ có thể duyệt khoản vay đang chờ duyệt');
        }

        // Ghi blockchain trước nếu có contractId
        if (loan.blockchainContractId) {
            try {
                await fabricService.updateLoanStatus(
                    loan.blockchainContractId,
                    'approved',
                    { adminId, approvedAt: new Date().toISOString() }
                );
                logger.info(`[Blockchain] Đã duyệt loan ${loan.blockchainContractId}`);
            } catch (bcError) {
                logger.error(`[Blockchain] Lỗi duyệt loan: ${bcError.message}`);
                throw new ValidationError(`Không thể duyệt: Lỗi blockchain - ${bcError.message}`);
            }
        }

        loan.status = LOAN_STATUS.APPROVED;
        loan.approvedBy = adminId;
        loan.approvedAt = new Date();
        await loan.save();

        // Gửi thông báo
        await notificationService.notifyLoanApproved(loan);

        // Kích hoạt Auto-Invest Matching
        // Chạy async để không block response
        matchingService.performMatching(loan._id).catch(err => {
            logger.error(`[AutoInvest] Lỗi matching sau khi duyệt loan ${loanId}: ${err.message}`);
        });

        logger.info(`Đã duyệt khoản vay: ${loanId} bởi admin ${adminId}`);

        return loan;
    }

    /**
     * Từ chối khoản vay (chỉ admin)
     * @param {String} loanId - ID khoản vay
     * @param {String} adminId - ID admin
     * @param {String} reason - Lý do từ chối
     * @returns {Object} Khoản vay đã cập nhật
     */
    async rejectLoan(loanId, adminId, reason) {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        if (loan.status !== LOAN_STATUS.PENDING) {
            throw new ValidationError('Chỉ có thể từ chối khoản vay đang chờ duyệt');
        }

        // Ghi blockchain trước nếu có contractId
        if (loan.blockchainContractId) {
            try {
                await fabricService.updateLoanStatus(
                    loan.blockchainContractId,
                    'rejected',
                    { adminId, reason, rejectedAt: new Date().toISOString() }
                );
                logger.info(`[Blockchain] Đã từ chối loan ${loan.blockchainContractId}`);
            } catch (bcError) {
                logger.error(`[Blockchain] Lỗi từ chối loan: ${bcError.message}`);
                throw new ValidationError(`Không thể từ chối: Lỗi blockchain - ${bcError.message}`);
            }
        }

        loan.status = LOAN_STATUS.FAIL;
        loan.rejectionReason = reason;
        loan.approvedBy = adminId;
        loan.approvedAt = new Date();
        await loan.save();

        // Gửi thông báo
        await notificationService.notifyLoanRejected(loan, reason);

        logger.info(`Đã từ chối khoản vay: ${loanId} bởi admin ${adminId}`);

        return loan;
    }

    /**
     * Cập nhật tiến độ đầu tư
     */
    async updateInvestmentProgress(loanId, investedNotes) {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        loan.investedNotes = investedNotes;
        if (investedNotes >= loan.totalNotes && loan.status === LOAN_STATUS.APPROVED) {
            loan.status = LOAN_STATUS.WAITING_SIGNATURE;
            // Gửi thông báo khoản vay đã được đầu tư đủ, chờ ký
            await notificationService.notifyLoanFunded(loan);
        }
        await loan.save();
        return loan;
    }

    /**
     * Đánh dấu khoản vay đã giải ngân
     */
    async markAsDisbursed(loanId) {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        if (loan.status !== LOAN_STATUS.WAITING) {
            throw new ValidationError('Chỉ có thể giải ngân khoản vay đang chờ giải ngân');
        }

        if (loan.investedNotes < loan.totalNotes) {
            throw new ValidationError('Khoản vay phải đủ vốn trước khi giải ngân');
        }

        // Kiểm tra điểm tín dụng trước khi giải ngân
        const userDetails = await UserDetails.findOne({ userId: loan.borrowerId });
        let scoringDecision = userDetails?.scoringDecision;

        // Nếu chưa có điểm hoặc điểm đã cũ (hơn 24h), gọi API lấy điểm mới
        const scoringAge = userDetails?.lastScoringAt
            ? (Date.now() - new Date(userDetails.lastScoringAt).getTime()) / (1000 * 60 * 60)
            : Infinity;

        if (!scoringDecision || scoringAge > 24) {
            logger.info(`[Disbursement] Gọi Credit Scoring API cho loan ${loanId}...`);

            try {
                const scoringResult = await creditScoringService.getCreditScore({
                    loanAmount: loan.capital,
                    annualIncome: userDetails?.income ? userDetails.income * 12 : null,
                    term: loan.term,
                    interestRate: loan.interestRate * 100, // Convert to percentage
                    purpose: loan.purpose,
                    city: userDetails?.city
                });

                if (scoringResult.success) {
                    scoringDecision = scoringResult.decision;

                    // Cập nhật điểm vào database
                    await UserDetails.findOneAndUpdate(
                        { userId: loan.borrowerId },
                        {
                            $set: {
                                score: scoringResult.creditScore,
                                creditGrade: scoringResult.grade,
                                pdPercent: scoringResult.pdPercent,
                                scoringDecision: scoringResult.decision,
                                lastScoringAt: new Date()
                            }
                        }
                    );

                    logger.info(`[Disbursement] Credit Score: ${scoringResult.creditScore}, Decision: ${scoringDecision}`);
                } else {
                    logger.warn(`[Disbursement] Credit Scoring API không khả dụng, sử dụng điểm hiện tại`);
                }
            } catch (scoringError) {
                logger.error(`[Disbursement] Lỗi gọi Credit Scoring: ${scoringError.message}`);
            }
        }

        // Kiểm tra quyết định - chỉ giải ngân nếu APPROVE
        if (scoringDecision === 'REJECT') {
            throw new ValidationError('Không thể giải ngân: Điểm tín dụng không đủ điều kiện (REJECT)');
        }

        if (scoringDecision === 'REVIEW') {
            throw new ValidationError('Không thể giải ngân: Khoản vay cần được xem xét thêm (REVIEW). Vui lòng liên hệ admin.');
        }

        logger.info(`[Disbursement] Điểm tín dụng đạt yêu cầu (${scoringDecision}), tiến hành giải ngân...`);


        const Investment = require('../models/Investment');
        const investments = await Investment.find({ loanId: loan._id });

        for (const investment of investments) {
            await walletService.disburseFrozen(investment.investorId, investment.amount);
        }

        await walletService.receive(
            loan.borrowerId,
            loan.capital,
            `Giải ngân khoản vay ${loan._id}`,
            loan._id,
            `DISBURSE_${loan._id}`
        );

        loan.status = LOAN_STATUS.ACTIVE;
        loan.isDisbursed = true;
        loan.disbursedAt = new Date();
        await loan.save();

        await paymentService.createPaymentSchedule(loanId);

        // Tạo nhắc hẹn tự động cho tất cả các kỳ thanh toán
        await reminderService.createRemindersForLoan(loanId);

        // Gửi thông báo giải ngân
        await notificationService.notifyLoanDisbursed(loan);

        logger.info(`Đã giải ngân khoản vay: ${loanId}`);
        return loan;
    }


    /**
     * Ký hợp đồng vay (Borrower xác nhận)
     */
    async signLoanContract(loanId, userId) {
        const loan = await Loan.findById(loanId);
        if (!loan) throw new NotFoundError('Không tìm thấy khoản vay');

        if (loan.borrowerId.toString() !== userId) {
            throw new ValidationError('Không có quyền ký hợp đồng này');
        }

        if (loan.status !== LOAN_STATUS.WAITING_SIGNATURE) {
            throw new ValidationError('Khoản vay không ở trạng thái chờ ký');
        }

        // Chuyển sang WAITING (Chờ admin giải ngân)
        loan.status = LOAN_STATUS.WAITING;
        loan.signedAt = new Date();
        await loan.save();

        // Gửi thông báo
        await notificationService.notifyLoanSigned(loan);

        logger.info(`Borrower ${userId} signed loan contract ${loanId}`);
        return loan;
    }

    /**
     * Hủy khoản vay (Borrower tự hủy)
     * Chỉ được hủy khi đang ở trạng thái PENDING hoặc APPROVED
     */
    async cancelLoan(loanId, borrowerId, reason = 'Người vay tự hủy') {
        const loan = await Loan.findById(loanId);
        if (!loan) {
            throw new NotFoundError('Không tìm thấy khoản vay');
        }

        if (loan.borrowerId.toString() !== borrowerId) {
            throw new ValidationError('Không có quyền hủy khoản vay này');
        }

        // Chỉ cho phép hủy nếu vay chưa có người đầu tư (PENDING) 
        // hoặc đã được duyệt nhưng chưa gom đủ vốn/chưa giải ngân (APPROVED)
        if (![LOAN_STATUS.PENDING, LOAN_STATUS.APPROVED].includes(loan.status)) {
            throw new ValidationError(`Không thể hủy khoản vay ở trạng thái ${loan.status}`);
        }

        // Nếu khoản vay đang ở APPROVED, có thể đã có người đầu tư một phần vốn
        // Cần hoàn tiền cho các nhà đầu tư hiện tại
        if (loan.investedNotes > 0) {
            const Investment = require('../models/Investment');
            const investments = await Investment.find({
                loanId: loan._id,
                status: 'pending' // Chờ giải ngân
            });

            for (const investment of investments) {
                // Hoàn lại tiền bị đóng băng cho nhà đầu tư
                await walletService.releaseFrozen(investment.investorId, investment.amount);

                // Hủy investment
                investment.status = 'cancelled';
                investment.cancellationReason = 'Khoản vay bị hủy bởi người vay';
                investment.completedAt = new Date();
                await investment.save();

                // Gửi thông báo cho nhà đầu tư
                const Notification = require('../models/Notification');
                await Notification.create({
                    userId: investment.investorId,
                    type: 'system',
                    title: 'Đầu tư bị hủy',
                    body: `Khoản vay bạn đầu tư (${loan._id}) đã bị hủy bởi người vay. Số tiền ${investment.amount.toLocaleString()} VND đã được hoàn lại vào ví.`,
                    data: { investmentId: investment._id, type: 'loan_cancelled_by_borrower' }
                });

                logger.info(`[CancelLoan] Refunded ${investment.amount} to investor ${investment.investorId} due to loan cancellation`);
            }
        }

        // Ghi blockchain nếu có contractId
        if (loan.blockchainContractId) {
            try {
                await fabricService.updateLoanStatus(
                    loan.blockchainContractId,
                    'cancelled',
                    { borrowerId, reason, cancelledAt: new Date().toISOString() }
                );
                logger.info(`[Blockchain] Đã cập nhật trạng thái hủy cho loan ${loan.blockchainContractId}`);
            } catch (bcError) {
                logger.error(`[Blockchain] Lỗi hủy loan: ${bcError.message}`);
                throw new ValidationError(`Không thể hủy: Lỗi blockchain - ${bcError.message}`);
            }
        }

        loan.status = LOAN_STATUS.CANCELLED;
        loan.cancelledAt = new Date();
        loan.cancellationReason = reason;
        await loan.save();

        logger.info(`Đã hủy khoản vay: ${loanId} bởi người vay ${borrowerId}`);

        return loan;
    }
}

module.exports = new LoanService();

