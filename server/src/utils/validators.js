/**
 * @description Joi validation schemas for request validation
 */

const Joi = require('joi');
const { phoneRegex, ssnRegex, genderRegex, userCategoryRegex } = require('../constants');

// Auth Validators
const registerSchema = Joi.object({
    phone: Joi.string().pattern(phoneRegex).required()
        .messages({
            'string.pattern.base': 'Invalid phone number format. Must be Vietnamese phone number.',
            'any.required': 'Phone number is required'
        })
});

const verifyOTPSchema = Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    code: Joi.string().length(6).required()
        .messages({
            'string.length': 'OTP code must be 6 digits'
        })
});

const loginSchema = Joi.object({
    phone: Joi.string().pattern(phoneRegex).required(),
    password: Joi.string().min(6).required()
        .messages({
            'string.min': 'Password must be at least 6 characters'
        })
});

const changePasswordSchema = Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
        .messages({
            'string.min': 'New password must be at least 6 characters'
        })
});

// User Validators
const userDetailsSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    birth: Joi.date().max('now').required()
        .messages({
            'date.max': 'Birth date cannot be in the future'
        }),
    sex: Joi.string().valid(...genderRegex).required(),
    email: Joi.string().email().required(),
    address: Joi.string().min(10).max(200).required(),
    city: Joi.string().min(2).max(50).required(),
    ssn: Joi.string().pattern(ssnRegex).required()
        .messages({
            'string.pattern.base': 'SSN must be 9 or 12 digits'
        }),
    job: Joi.string().min(2).max(100).required(),
    income: Joi.number().min(0).required()
        .messages({
            'number.min': 'Income must be a positive number'
        })
});

// Loan Validators
const createLoanSchema = Joi.object({
    capital: Joi.number().integer().positive().min(1000000).max(100000000).required()
        .messages({
            'number.integer': 'Loan amount must be a whole number',
            'number.positive': 'Loan amount must be positive',
            'number.min': 'Minimum loan amount is 1,000,000 VND',
            'number.max': 'Maximum loan amount is 100,000,000 VND (Nghị định 2026)'
        }),
    term: Joi.number().integer().min(1).max(18).required()
        .messages({
            'number.min': 'Minimum loan term is 1 month',
            'number.max': 'Maximum loan term is 18 months'
        }),
    purpose: Joi.string().min(10).max(500).required()
        .messages({
            'string.min': 'Purpose must be at least 10 characters'
        }),
    disbursementDate: Joi.date().required()
        .messages({
            'any.required': 'Disbursement date is required'
        }),
    monthlyIncome: Joi.number().min(0).optional(),
    annualIncome: Joi.number().min(0).optional(),
    method: Joi.string().valid('wallet', 'bank').optional(),
    walletAccountNumber: Joi.string().optional().allow(null, ''),
    bankAccountNumber: Joi.string().optional().allow(null, ''),
    bankAccountHolderName: Joi.string().optional().allow(null, ''),
    interestRate: Joi.number().min(0).max(100).optional()
        .messages({
            'number.min': 'Interest rate cannot be negative',
            'number.max': 'Interest rate cannot exceed 100%'
        })
});

// Investment Validators
const createInvestmentSchema = Joi.object({
    loanId: Joi.string().required(),
    amount: Joi.number().integer().positive().min(500000).required()
        .messages({
            'number.integer': 'Investment amount must be a whole number',
            'number.positive': 'Investment amount must be positive',
            'number.min': 'Minimum investment amount is 500,000 VND'
        })
});

// Wallet Validators
const depositSchema = Joi.object({
    amount: Joi.number().integer().positive().min(10000).required()
        .messages({
            'number.integer': 'Deposit amount must be a whole number',
            'number.positive': 'Deposit amount must be positive',
            'number.min': 'Minimum deposit amount is 10,000 VND'
        })
});

const withdrawSchema = Joi.object({
    amount: Joi.number().integer().positive().min(10000).required()
        .messages({
            'number.integer': 'Withdrawal amount must be a whole number',
            'number.positive': 'Withdrawal amount must be positive',
            'number.min': 'Minimum withdrawal amount is 10,000 VND'
        }),
    description: Joi.string().optional()
});

// Pagination Validators
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
});

module.exports = {
    // Auth
    registerSchema,
    verifyOTPSchema,
    loginSchema,
    changePasswordSchema,

    // User
    userDetailsSchema,

    // Loan
    createLoanSchema,

    // Investment
    createInvestmentSchema,

    // Wallet
    depositSchema,
    withdrawSchema,

    // Pagination
    paginationSchema
};
