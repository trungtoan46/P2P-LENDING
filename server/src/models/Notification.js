/**
 * @description Notification Model - Thông báo hệ thống
 */

const mongoose = require('mongoose');

const NOTIFICATION_TYPE = {
    LOAN_CREATED: 'loan_created',
    LOAN_APPROVED: 'loan_approved',
    LOAN_REJECTED: 'loan_rejected',
    LOAN_DISBURSED: 'loan_disbursed',
    LOAN_FUNDED: 'loan_funded',
    LOAN_SIGNED: 'loan_signed',
    REPAYMENT_SUCCESS: 'repayment_success',
    WALLET_DEPOSIT: 'wallet_deposit',
    WALLET_WITHDRAWAL: 'wallet_withdrawal',
    SYSTEM: 'system'
};

const NOTIFICATION_STATUS = {
    UNREAD: 'unread',
    READ: 'read'
};

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: Object.values(NOTIFICATION_TYPE),
        required: true
    },

    title: {
        type: String,
        required: true
    },

    body: {
        type: String,
        required: true
    },

    // Dữ liên quan (tùy chọn)
    data: {
        loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
        amount: Number,
        purpose: String
    },

    status: {
        type: String,
        enum: Object.values(NOTIFICATION_STATUS),
        default: NOTIFICATION_STATUS.UNREAD
    },

    isSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPE = NOTIFICATION_TYPE;
module.exports.NOTIFICATION_STATUS = NOTIFICATION_STATUS;
