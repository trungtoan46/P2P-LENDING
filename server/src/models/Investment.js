/**
 * @description Investment Model - Investment contracts for lenders
 */

const mongoose = require('mongoose');
const { INVESTMENT_STATUS, BASE_UNIT_PRICE } = require('../constants');

const investmentSchema = new mongoose.Schema({
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true,
        index: true
    },

    amount: {
        type: Number,
        required: true,
        min: [BASE_UNIT_PRICE, `Minimum investment is ${BASE_UNIT_PRICE} VND`]
    },

    notes: {
        type: Number,
        required: true,
        min: [1, 'Minimum 1 note required']
    },

    status: {
        type: String,
        enum: Object.values(INVESTMENT_STATUS),
        default: INVESTMENT_STATUS.PENDING
    },

    monthlyReturn: {
        type: Number,
        required: true
    },

    totalReturn: {
        type: Number,
        required: true
    },

    grossProfit: {
        type: Number,
        required: true
    },

    netProfit: {
        type: Number,
        required: true
    },

    serviceFee: {
        type: Number,
        required: true
    },

    matchedAt: {
        type: Date,
        default: null
    },

    autoInvestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AutoInvest',
        default: null,
        index: true
    },

    completedAt: {
        type: Date,
        default: null
    },

    // Blockchain integration
    blockchainContractId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
investmentSchema.index({ investorId: 1, status: 1 });
investmentSchema.index({ loanId: 1, status: 1 });
investmentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Investment', investmentSchema);

