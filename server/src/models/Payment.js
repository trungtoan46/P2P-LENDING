/**
 * @description Payment Model - Thanh toán hàng tháng
 */

const mongoose = require('mongoose');
const { SETTLEMENT_STATUS } = require('../constants');

const paymentSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true,
        index: true
    },

    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    orderNo: {
        type: Number,
        required: true
    },

    principalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    interestAmount: {
        type: Number,
        required: true,
        min: 0
    },

    penaltyAmount: {
        type: Number,
        default: 0,
        min: 0
    },

    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },

    dueDate: {
        type: Date,
        required: true
    },

    paidDate: {
        type: Date,
        default: null
    },

    status: {
        type: String,
        enum: Object.values(SETTLEMENT_STATUS),
        default: SETTLEMENT_STATUS.UNDUE
    }
}, {
    timestamps: true
});

paymentSchema.index({ loanId: 1, orderNo: 1 });
paymentSchema.index({ borrowerId: 1, status: 1 });
paymentSchema.index({ dueDate: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

