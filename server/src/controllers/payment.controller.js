/**
 * @description Payment Controller
 */

const paymentService = require('../services/payment.service');
const { successResponse, paginatedResponse } = require('../utils/response');
const { ValidationError } = require('../utils/errors');

class PaymentController {
    async getMyPayments(req, res, next) {
        try {
            const payments = await paymentService.getDuePayments(req.user.id);
            return successResponse(res, payments);
        } catch (error) {
            next(error);
        }
    }

    async getPaymentsByLoan(req, res, next) {
        try {
            const { loanId } = req.params;
            const payments = await paymentService.getPaymentsByLoan(loanId);
            return successResponse(res, payments);
        } catch (error) {
            next(error);
        }
    }

    async payPayment(req, res, next) {
        try {
            const { paymentId } = req.params;
            const payment = await paymentService.payPayment(paymentId, req.user.id);
            return successResponse(res, payment, 'Thanh toán thành công');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy tất cả payments của user
     */
    async getAllMyPayments(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const result = await paymentService.getAllPaymentsByUser(req.user.id, page, limit);
            return paginatedResponse(
                res,
                result.payments,
                page,
                limit,
                result.total,
                'Payments retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Lấy lịch sử thanh toán
     */
    async getPaymentHistory(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const result = await paymentService.getPaymentHistory(req.user.id, page, limit);
            return paginatedResponse(
                res,
                result.payments,
                page,
                limit,
                result.total,
                'Payment history retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Trả nhiều kỳ cùng lúc
     */
    async payMultiple(req, res, next) {
        try {
            const { paymentIds } = req.body;
            if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
                throw new ValidationError('Vui lòng cung cấp danh sách paymentIds');
            }
            const results = await paymentService.payMultiplePayments(paymentIds, req.user.id);
            return successResponse(res, results, 'Thanh toán hoàn tất');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin tạo lịch thanh toán cho loan (nếu chưa có)
     */
    async createSchedule(req, res, next) {
        try {
            const { loanId } = req.params;
            const { force } = req.body;
            const payments = await paymentService.createPaymentSchedule(loanId, force === true);
            return successResponse(res, payments, 'Đã tạo lịch thanh toán');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new PaymentController();

