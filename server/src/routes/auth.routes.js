/**
 * @description Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const {
    registerSchema,
    verifyOTPSchema,
    loginSchema,
    changePasswordSchema
} = require('../utils/validators');
const Joi = require('joi');

// Public routes
router.post('/register',
    validateBody(registerSchema),
    (req, res, next) => authController.register(req, res, next)
);

router.post('/verify-otp',
    validateBody(verifyOTPSchema.keys({
        password: Joi.string().min(6).required(),
        category: Joi.string().valid('borrower', 'lender', 'both').default('borrower')
    })),
    (req, res, next) => authController.verifyOTP(req, res, next)
);

router.post('/login',
    validateBody(loginSchema),
    (req, res, next) => authController.login(req, res, next)
);

router.post('/refresh-token',
    validateBody(Joi.object({
        refreshToken: Joi.string().required()
    })),
    (req, res, next) => authController.refreshToken(req, res, next)
);

// Protected routes
router.post('/change-password',
    authenticate,
    validateBody(changePasswordSchema),
    (req, res, next) => authController.changePassword(req, res, next)
);

router.post('/fcm-token',
    authenticate,
    validateBody(Joi.object({
        fcmToken: Joi.string().required()
    })),
    (req, res, next) => authController.updateFCMToken(req, res, next)
);

module.exports = router;
