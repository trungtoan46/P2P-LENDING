/**
 * @description Wallet Routes
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { authenticate, isAdmin } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validation.middleware');
const { depositSchema, withdrawSchema } = require('../utils/validators');
const Joi = require('joi');

router.get('/balance',
    authenticate,
    (req, res, next) => walletController.getBalance(req, res, next)
);

router.post('/deposit',
    authenticate,
    validateBody(depositSchema),
    (req, res, next) => walletController.deposit(req, res, next)
);

router.post('/withdraw',
    authenticate,
    validateBody(withdrawSchema),
    (req, res, next) => walletController.withdraw(req, res, next)
);

router.post('/mock-deposit',
    authenticate,
    (req, res, next) => walletController.mockDeposit(req, res, next)
);

router.get('/transactions',
    authenticate,
    (req, res, next) => walletController.getTransactions(req, res, next)
);

// Admin routes
router.post('/admin-deposit',
    authenticate,
    isAdmin,
    validateBody(Joi.object({
        userId: Joi.string().required(),
        amount: Joi.number().integer().positive().min(10000).required(),
        description: Joi.string().optional()
    })),
    (req, res, next) => walletController.adminDeposit(req, res, next)
);

router.get('/all-transactions',
    authenticate,
    isAdmin,
    (req, res, next) => walletController.getAllTransactions(req, res, next)
);

router.get('/revenue',
    authenticate,
    isAdmin,
    (req, res, next) => walletController.getSystemRevenue(req, res, next)
);
router.get('/user/:userId/balance', authenticate, isAdmin, (req, res, next) => walletController.getUserBalance(req, res, next));

module.exports = router;
