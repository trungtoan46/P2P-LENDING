/**
 * @description AutoInvest Model - Cấu hình đầu tư tự động
 * Lưu trữ chiến lược đầu tư tự động của nhà đầu tư
 */

const mongoose = require('mongoose');

const autoInvestSchema = new mongoose.Schema({
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Cấu hình tiêu chí
    capital: {
        type: Number,
        required: true,
        min: 0
    },

    maxCapitalPerLoan: {
        type: Number,
        default: null
    },

    interestRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },

    periodRange: {
        min: { type: Number, required: true },
        max: { type: Number, required: true }
    },

    purpose: [{
        type: String
    }],

    // Tracking
    totalNodes: {
        type: Number,
        default: 0
    },

    matchedNodes: {
        type: Number,
        default: 0
    },

    matchedCapital: {
        type: Number,
        default: 0
    },

    // Danh sách loans đã match
    loans: [{
        loanId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Loan'
        },
        nodeMatch: Number,
        amount: Number,
        matchedAt: Date
    }],

    // Trạng thái
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },

    completedAt: Date,
    cancelledAt: Date

}, {
    timestamps: true
});

// Indexes
autoInvestSchema.index({ status: 1, 'interestRange.min': 1, 'interestRange.max': 1 });
autoInvestSchema.index({ status: 1, 'periodRange.min': 1, 'periodRange.max': 1 });

module.exports = mongoose.model('AutoInvest', autoInvestSchema);
