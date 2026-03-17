/**
 * @description Investment Controller - Handle investment requests
 */

const investmentService = require('../services/investment.service');
const matchingService = require('../services/matching.service');
const Investment = require('../models/Investment');
const { successResponse, paginatedResponse } = require('../utils/response');
const { CREATED_CODE } = require('../constants');

class InvestmentController {
    /**
     * Admin: Get all investments
     * GET /api/investments
     */
    async getAllInvestments(req, res, next) {
        try {
            const { page = 1, limit = 50, status } = req.query;
            const query = {};
            if (status) query.status = status;
            const skip = (Number(page) - 1) * Number(limit);
            const [investments, total] = await Promise.all([
                Investment.find(query)
                    .populate('investorId', 'phone category')
                    .populate('loanId', 'capital term interestRate purpose status')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(Number(limit)),
                Investment.countDocuments(query),
            ]);
            return paginatedResponse(res, investments, page, limit, total, 'All investments retrieved');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Create direct investment
     * POST /api/investments
     */
    async createInvestment(req, res, next) {
        try {
            const { loanId, amount } = req.body;
            const investment = await investmentService.createDirectInvestment(
                req.user.id,
                loanId,
                amount
            );
            return successResponse(res, investment, 'Investment created successfully', CREATED_CODE);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get investment by ID
     * GET /api/investments/:id
     */
    async getInvestment(req, res, next) {
        try {
            const { id } = req.params;
            const investment = await investmentService.getInvestmentById(id, req.user?.id);
            return successResponse(res, investment);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get my investments
     * GET /api/investments/my-investments
     */
    async getMyInvestments(req, res, next) {
        try {
            const { status, page = 1, limit = 10 } = req.query;
            const result = await investmentService.getInvestmentsByInvestor(
                req.user.id,
                { status },
                page,
                limit
            );
            return paginatedResponse(
                res,
                result.investments,
                page,
                limit,
                result.total,
                'Investments retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get investments by loan
     * GET /api/investments/loan/:loanId
     */
    async getInvestmentsByLoan(req, res, next) {
        try {
            const { loanId } = req.params;
            const { page = 1, limit = 10 } = req.query;
            const result = await investmentService.getInvestmentsByLoan(loanId, page, limit);
            return paginatedResponse(
                res,
                result.investments,
                page,
                limit,
                result.total,
                'Investments retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Perform matching for a loan
     * POST /api/investments/match/:loanId
     */
    async performMatching(req, res, next) {
        try {
            const { loanId } = req.params;
            const result = await matchingService.performMatching(loanId);
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Confirm investment (PENDING -> ACTIVE)
     * POST /api/investments/:id/confirm
     */
    async confirmInvestment(req, res, next) {
        try {
            const { id } = req.params;
            const investment = await investmentService.confirmInvestment(id, req.user.id);
            return successResponse(res, investment, 'Investment confirmed successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new InvestmentController();

