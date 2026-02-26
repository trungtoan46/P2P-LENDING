/**
 * @description PayOS Routes - Nạp tiền qua cổng PayOS
 */

const express = require('express');
const router = express.Router();
const payosController = require('../controllers/payos.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const Joi = require('joi');

const createLinkSchema = Joi.object({
    amount: Joi.number().integer().positive().min(1000000).required()
        .messages({
            'number.min': 'Số tiền nạp tối thiểu là 1,000,000 VND hệ thống',
            'any.required': 'Vui lòng nhập số tiền'
        }),
    cancelUrl: Joi.string().uri().optional(),
    returnUrl: Joi.string().uri().optional()
});

// Tạo link thanh toán
router.post('/create-link',
    authenticate,
    validateBody(createLinkSchema),
    (req, res, next) => payosController.createPaymentLink(req, res, next)
);

// Xác thực thanh toán
router.post('/verify/:orderCode',
    authenticate,
    (req, res, next) => payosController.verifyPayment(req, res, next)
);

// Lịch sử nạp tiền PayOS
router.get('/history',
    authenticate,
    (req, res, next) => payosController.getPayOSHistory(req, res, next)
);

module.exports = router;
