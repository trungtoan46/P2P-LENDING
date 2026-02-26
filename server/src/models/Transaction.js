/**
 * @description Transaction Model - Lịch sử giao dịch
 */

const mongoose = require('mongoose');
const { TRANSACTION_TYPES, PAYMENT_STATUS } = require('../constants');

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: Object.values(TRANSACTION_TYPES),
        required: true
    },

    amount: {
        type: Number,
        required: true,
        min: 0
    },

    status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING
    },

    description: {
        type: String,
        default: ''
    },

    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        default: null
    },

    investmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Investment',
        default: null
    },

    referenceId: {
        type: String,
        default: null,
        index: true
    }
}, {
    timestamps: true
});

transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ loanId: 1 });
transactionSchema.index({ referenceId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);

