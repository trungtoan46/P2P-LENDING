/**
 * @description Investment Routes
 */

const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investment.controller');
const { authenticate, isLender, isAdmin } = require('../middlewares/auth.middleware');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const { createInvestmentSchema, paginationSchema } = require('../utils/validators');
const Joi = require('joi');

// Admin route - List all investments
router.get('/',
    authenticate,
    isAdmin,
    (req, res, next) => investmentController.getAllInvestments(req, res, next)
);

// Protected routes - Lender
router.post('/',
    authenticate,
    isLender,
    validateBody(createInvestmentSchema),
    (req, res, next) => investmentController.createInvestment(req, res, next)
);

router.get('/my-investments',
    authenticate,
    isLender,
    validateQuery(paginationSchema.keys({
        status: Joi.string()
    })),
    (req, res, next) => investmentController.getMyInvestments(req, res, next)
);

// Public route - Get investments by loan
router.get('/loan/:loanId',
    validateQuery(paginationSchema),
    (req, res, next) => investmentController.getInvestmentsByLoan(req, res, next)
);

// Public route - Get investment by ID
router.get('/:id',
    authenticate,
    (req, res, next) => investmentController.getInvestment(req, res, next)
);

// Protected route - Confirm Investment
router.post('/:id/confirm',
    authenticate,
    isLender,
    (req, res, next) => investmentController.confirmInvestment(req, res, next)
);

// Admin route - Perform matching
router.post('/match/:loanId',
    authenticate,
    isAdmin,
    (req, res, next) => investmentController.performMatching(req, res, next)
);

module.exports = router;

