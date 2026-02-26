/**
 * @description Reminder Model - Nhắc hẹn thanh toán
 */

const mongoose = require('mongoose');

const REMINDER_TYPE = {
    BEFORE_3_DAYS: 'before_3_days',
    BEFORE_1_DAY: 'before_1_day',
    DUE_DAY: 'due_day',
    OVERDUE: 'overdue'
};

const REMINDER_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

const REMINDER_CHANNEL = {
    PUSH: 'push',
    SMS: 'sms',
    EMAIL: 'email'
};

const reminderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true,
        index: true
    },

    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true
    },

    type: {
        type: String,
        enum: Object.values(REMINDER_TYPE),
        required: true
    },

    status: {
        type: String,
        enum: Object.values(REMINDER_STATUS),
        default: REMINDER_STATUS.PENDING
    },

    channel: {
        type: String,
        enum: Object.values(REMINDER_CHANNEL),
        default: REMINDER_CHANNEL.PUSH
    },

    // Thời gian dự kiến gửi
    scheduledAt: {
        type: Date,
        required: true,
        index: true
    },

    // Thời gian đã gửi thực tế
    sentAt: {
        type: Date,
        default: null
    },

    // Lỗi nếu gửi thất bại
    errorMessage: {
        type: String,
        default: null
    },

    // Nội dung đã gửi
    content: {
        title: String,
        body: String
    },

    // Đánh dấu đã đọc (hiển thị trên app)
    isRead: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes
reminderSchema.index({ scheduledAt: 1, status: 1 });
reminderSchema.index({ userId: 1, createdAt: -1 });

// Statics
reminderSchema.statics.REMINDER_TYPE = REMINDER_TYPE;
reminderSchema.statics.REMINDER_STATUS = REMINDER_STATUS;
reminderSchema.statics.REMINDER_CHANNEL = REMINDER_CHANNEL;

module.exports = mongoose.model('Reminder', reminderSchema);
