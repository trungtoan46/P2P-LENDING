/**
 * @description Credit Scoring Routes
 * API endpoints để kiểm tra và quản lý điểm tín dụng
 */

const express = require('express');
const router = express.Router();
const creditScoringService = require('../external/CreditScoringService');
const UserDetails = require('../models/UserDetails');
const { authenticate, isBorrower } = require('../middlewares/auth.middleware');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Kiểm tra health của Credit Scoring service
 * GET /api/credit-scoring/health
 */
router.get('/health', async (req, res) => {
    try {
        const isAvailable = await creditScoringService.healthCheck();
        return successResponse(res, {
            service: 'credit-scoring',
            status: isAvailable ? 'available' : 'unavailable',
            url: process.env.CREDIT_SCORING_URL || 'http://localhost:8000'
        });
    } catch (error) {
        logger.error(`[CreditScoring] Health check error: ${error.message}`);
        return errorResponse(res, 'Service health check failed', 500);
    }
});

/**
 * Lấy điểm tín dụng cho user hiện tại
 * POST /api/credit-scoring/check
 * Body: { loanAmount, term, purpose }
 */
router.post('/check',
    authenticate,
    isBorrower,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { loanAmount, term, purpose } = req.body;

            // Lấy thông tin user
            const userDetails = await UserDetails.findOne({ userId });
            if (!userDetails) {
                return errorResponse(res, 'Chưa có thông tin chi tiết người dùng. Vui lòng hoàn tất eKYC.', 400);
            }

            // Gọi Credit Scoring API
            const result = await creditScoringService.getCreditScore({
                loanAmount: loanAmount || 10000000,
                annualIncome: userDetails.income ? userDetails.income * 12 : null,
                term: term || 12,
                homeOwnership: userDetails.job?.includes('chủ') ? 'own' : 'rent',
                purpose: purpose || 'major_purchase',
                city: userDetails.city
            });

            if (result.success) {
                // Cập nhật điểm vào database
                await UserDetails.findOneAndUpdate(
                    { userId },
                    {
                        $set: {
                            score: result.creditScore,
                            creditGrade: result.grade,
                            pdPercent: result.pdPercent,
                            scoringDecision: result.decision,
                            lastScoringAt: new Date()
                        }
                    }
                );

                return successResponse(res, {
                    creditScore: result.creditScore,
                    grade: result.grade,
                    decision: result.decision,
                    pdPercent: result.pdPercent,
                    expectedLossVnd: result.expectedLossVnd,
                    message: 'Đã cập nhật điểm tín dụng thành công'
                });
            } else {
                return errorResponse(res, result.error || 'Không thể lấy điểm tín dụng', 503);
            }
        } catch (error) {
            logger.error(`[CreditScoring] Check error: ${error.message}`);
            return errorResponse(res, 'Lỗi kiểm tra điểm tín dụng', 500);
        }
    }
);

/**
 * Lấy điểm tín dụng hiện tại (đã lưu trong DB)
 * GET /api/credit-scoring/my-score
 */
router.get('/my-score',
    authenticate,
    isBorrower,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const userDetails = await UserDetails.findOne({ userId });

            if (!userDetails) {
                return errorResponse(res, 'Chưa có thông tin chi tiết người dùng', 400);
            }

            return successResponse(res, {
                creditScore: userDetails.score,
                grade: userDetails.creditGrade,
                decision: userDetails.scoringDecision,
                pdPercent: userDetails.pdPercent,
                lastScoringAt: userDetails.lastScoringAt
            });
        } catch (error) {
            logger.error(`[CreditScoring] Get score error: ${error.message}`);
            return errorResponse(res, 'Lỗi lấy điểm tín dụng', 500);
        }
    }
);

module.exports = router;
