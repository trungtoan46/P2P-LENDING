/**
 * @description Loan Controller - Handle loan requests
 */

const Decimal = require('decimal.js');
const loanService = require('../services/loan.service');
const investmentService = require('../services/investment.service');
const UserDetails = require('../models/UserDetails');
const { successResponse, errorResponse } = require('../utils/response');
const { CREATED_CODE, NOT_FOUND_CODE } = require('../constants');

class LoanController {
    /**
     * Calculate loan rate preview
     * POST /api/loans/calculate-rate
     */
    async calculateRate(req, res, next) {
        try {
            const { capital, term } = req.body;
            const userId = req.user.id;

            const User = require('../models/User');
            const user = await User.findById(userId);
            const creditScore = user?.creditScore || 580;

            const {
                calculateInterestRate,
                calculateMonthlyPayment,
                calculateTotalInterest,
                calculateNotes,
                addMonths,
                addDays
            } = require('../utils/helpers');
            const { INVESTING_STAGE_DAYS } = require('../constants');

            const interestRate = calculateInterestRate(creditScore, capital, term);
            const interestRatePercent = new Decimal(interestRate)
                .times(100)
                .toDecimalPlaces(2)
                .toNumber();
            const monthlyPayment = calculateMonthlyPayment(capital, interestRate, term);
            const totalInterest = calculateTotalInterest(capital, monthlyPayment, term);
            const totalRepayment = capital + totalInterest;
            const totalNotes = calculateNotes(capital);
            const disbursementDate = new Date();
            const maturityDate = addMonths(disbursementDate, term);
            const investingEndDate = addDays(disbursementDate, INVESTING_STAGE_DAYS);

            return successResponse(res, {
                capital,
                term,
                creditScore,
                interestRate: interestRatePercent,
                monthlyPayment,
                totalInterest,
                totalRepayment,
                totalNotes,
                disbursementDate,
                maturityDate,
                investingEndDate
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create a new loan
     * POST /api/loans
     */
    async createLoan(req, res, next) {
        try {
            const loanData = {
                borrowerId: req.user.id,
                ...req.body
            };

            const loan = await loanService.createLoan(loanData);
            return successResponse(res, loan, 'Loan created successfully', CREATED_CODE);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get loan by ID
     * GET /api/loans/:id
     */
    async getLoan(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user ? req.user.id : null;
            const userRole = req.user ? req.user.category : null;

            let loan = await loanService.getLoanById(id, userId, userRole);

            // Nếu là admin, lấy thêm thông tin chi tiết người vay và danh sách nhà đầu tư
            if (userRole === 'admin') {
                // 1. Lấy thông tin chi tiết người vay - dùng ID từ loan gốc
                const borrowerId = loan.borrowerId?._id || loan.borrowerId;
                const borrowerDetails = await UserDetails.findOne({ userId: borrowerId });

                // 2. Lấy danh sách nhà đầu tư
                const investmentResult = await investmentService.getInvestmentsByLoan(id);
                const investors = Array.isArray(investmentResult)
                    ? investmentResult
                    : (investmentResult?.investments || []);

                // Gộp danh sách nhà đầu tư theo ID
                const groupedInvestors = {};
                for (const inv of investors) {
                    const invId = (inv.investorId?._id || inv.investorId).toString();
                    if (!groupedInvestors[invId]) {
                        const details = await UserDetails.findOne({ userId: invId });
                        const invObj = typeof inv.toObject === 'function' ? inv.toObject() : inv;
                        groupedInvestors[invId] = {
                            ...invObj,
                            investorDetails: details || null,
                            amount: 0,
                            notes: 0
                        };
                    }
                    groupedInvestors[invId].amount += inv.amount;
                    groupedInvestors[invId].notes += inv.notes;
                }

                // Chuyển sang object để có thể gán thêm field
                loan = typeof loan.toObject === 'function' ? loan.toObject() : loan;
                loan.borrowerDetails = borrowerDetails || null;
                loan.investors = Object.values(groupedInvestors);
            }

            return successResponse(res, loan);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get loans by borrower
     * GET /api/loans/my-loans
     */
    async getMyLoans(req, res, next) {
        try {
            const { status } = req.query;
            const loans = await loanService.getLoansByBorrower(req.user.id, { status });
            return successResponse(res, loans);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all loans (public or admin)
     * GET /api/loans
     */
    async getAllLoans(req, res, next) {
        try {
            const { status, limit, skip } = req.query;
            const filters = {
                status,
                limit: limit ? parseInt(limit) : undefined,
                skip: skip ? parseInt(skip) : undefined
            };

            const loans = await loanService.getAllLoans(filters);

            return successResponse(res, loans);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve loan (admin only)
     * POST /api/loans/:id/approve
     */
    async approveLoan(req, res, next) {
        try {
            const { id } = req.params;
            const loan = await loanService.approveLoan(id, req.user.id);
            return successResponse(res, loan, 'Loan approved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject loan (admin only)
     * POST /api/loans/:id/reject
     */
    async rejectLoan(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const loan = await loanService.rejectLoan(id, req.user.id, reason);
            return successResponse(res, loan, 'Loan rejected');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Disburse loan (admin only)
     * POST /api/loans/:id/disburse
     */
    async disburseLoan(req, res, next) {
        try {
            const { id } = req.params;
            const loan = await loanService.markAsDisbursed(id);
            return successResponse(res, loan, 'Đã giải ngân thành công');
        } catch (error) {
            next(error);
        }
    }


    /**
    /**
     * Sign loan contract (borrower only)
     * POST /api/loans/:id/sign
     */
    async signContract(req, res, next) {
        try {
            const { id } = req.params;
            const loan = await loanService.signLoanContract(id, req.user.id);
            return successResponse(res, loan, 'Đã ký hợp đồng vay thành công');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel loan (borrower only)
     * POST /api/loans/:id/cancel
     */
    async cancelLoan(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const loan = await loanService.cancelLoan(id, req.user.id, reason);
            return successResponse(res, loan, 'Đã hủy khoản vay thành công');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new LoanController();