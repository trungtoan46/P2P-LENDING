/**
 * @description Payment Routes
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, isBorrower } = require('../middlewares/auth.middleware');
const { validateQuery } = require('../middlewares/validation.middleware');
const { paginationSchema } = require('../utils/validators');

router.get('/my-payments',
    authenticate,
    isBorrower,
    (req, res, next) => paymentController.getMyPayments(req, res, next)
);

// Lấy tất cả payments của user
router.get('/all',
    authenticate,
    isBorrower,
    validateQuery(paginationSchema),
    (req, res, next) => paymentController.getAllMyPayments(req, res, next)
);

// Lấy lịch sử thanh toán
router.get('/history',
    authenticate,
    isBorrower,
    validateQuery(paginationSchema),
    (req, res, next) => paymentController.getPaymentHistory(req, res, next)
);

router.get('/loan/:loanId',
    authenticate,
    (req, res, next) => paymentController.getPaymentsByLoan(req, res, next)
);

router.post('/:paymentId/pay',
    authenticate,
    isBorrower,
    (req, res, next) => paymentController.payPayment(req, res, next)
);

// Trả nhiều kỳ cùng lúc
router.post('/pay-multiple',
    authenticate,
    isBorrower,
    (req, res, next) => paymentController.payMultiple(req, res, next)
);

// Admin tạo lịch thanh toán cho loan (nếu chưa có hoặc force tạo lại)
const { isAdmin } = require('../middlewares/auth.middleware');
router.post('/loan/:loanId/create-schedule',
    authenticate,
    isAdmin,
    (req, res, next) => paymentController.createSchedule(req, res, next)
);

module.exports = router;

