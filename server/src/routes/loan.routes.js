/**
 * @description Loan Routes
 */

const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');
const { authenticate, optionalAuth, isBorrower, isAdmin } = require('../middlewares/auth.middleware');
const { validateBody, validateQuery } = require('../middlewares/validation.middleware');
const { createLoanSchema, paginationSchema } = require('../utils/validators');
const Joi = require('joi');

// Public route - Get all loans (for browsing)
router.get('/',
    validateQuery(paginationSchema.keys({
        status: Joi.string().optional()
    })),
    (req, res, next) => loanController.getAllLoans(req, res, next)
);

// Calculate loan rate preview
router.post('/calculate-rate',
    authenticate,
    isBorrower,
    validateBody(Joi.object({
        capital: Joi.number().min(1000000).max(50000000).required(),
        term: Joi.number().integer().min(1).max(18).required()
    })),
    (req, res, next) => loanController.calculateRate(req, res, next)
);

// Protected routes - Borrower
router.post('/',
    authenticate,
    isBorrower,
    validateBody(createLoanSchema),
    (req, res, next) => loanController.createLoan(req, res, next)
);

router.get('/my-loans',
    authenticate,
    isBorrower,
    validateQuery(paginationSchema.keys({
        status: Joi.string().valid('pending', 'approved', 'active', 'waiting', 'success', 'completed', 'defaulted', 'clean', 'fail', 'current')
    })),
    (req, res, next) => loanController.getMyLoans(req, res, next)
);

// Borrower sign contract
router.post('/:id/sign',
    authenticate,
    isBorrower,
    (req, res, next) => loanController.signContract(req, res, next)
);

// Public route - Get loan by ID (optional auth for authorization check)
router.get('/:id',
    optionalAuth,
    (req, res, next) => loanController.getLoan(req, res, next)
);

// Admin routes
router.post('/:id/approve',
    authenticate,
    isAdmin,
    (req, res, next) => loanController.approveLoan(req, res, next)
);

router.post('/:id/reject',
    authenticate,
    isAdmin,
    validateBody(Joi.object({
        reason: Joi.string().max(500).optional().allow('')
    })),
    (req, res, next) => loanController.rejectLoan(req, res, next)
);

// Giải ngân khoản vay (admin only)
router.post('/:id/disburse',
    authenticate,
    isAdmin,
    (req, res, next) => loanController.disburseLoan(req, res, next)
);

module.exports = router;


