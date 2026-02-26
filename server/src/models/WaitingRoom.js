/**
 * @description WaitingRoom Model - Investment waiting room for loan matching
 */

const mongoose = require('mongoose');

const waitingRoomSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: true,
        index: true
    },

    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    amount: {
        type: Number,
        required: true,
        min: [500000, 'Minimum investment amount is 500,000 VND']
    },

    notes: {
        type: Number,
        required: true,
        min: [1, 'Minimum 1 note required']
    },

    status: {
        type: String,
        enum: ['waiting', 'matched', 'cancelled', 'expired'],
        default: 'waiting'
    },

    priority: {
        type: Number,
        default: 0
    },

    expiresAt: {
        type: Date,
        default: null
    },

    matchedAt: {
        type: Date,
        default: null
    },

    cancelledAt: {
        type: Date,
        default: null
    },

    cancellationReason: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
waitingRoomSchema.index({ loanId: 1, status: 1 });
waitingRoomSchema.index({ investorId: 1, status: 1 });
waitingRoomSchema.index({ status: 1, priority: -1, createdAt: 1 });

// Compound index for matching
waitingRoomSchema.index({ loanId: 1, status: 1, priority: -1 });

module.exports = mongoose.model('WaitingRoom', waitingRoomSchema);
