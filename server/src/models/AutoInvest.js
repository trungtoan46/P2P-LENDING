/**
 * @description AutoInvest Model - Cấu hình đầu tư tự động cho Lender
 * Dựa trên logic 'WaitingRoom' của server cũ
 */

const mongoose = require('mongoose');

const autoInvestSchema = new mongoose.Schema({
    investorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Tổng vốn cam kết đầu tư
    capital: {
        type: Number,
        required: true,
        min: [1000000, 'Vốn tối thiểu 1,000,000 VND']
    },

    // Vốn tối đa cho MỘT khoản vay (để phân tán rủi ro)
    maxCapitalPerLoan: {
        type: Number,
        required: true,
        default: 10000000 // Mặc định 10tr
    },

    // Tổng số nodes (đơn vị đầu tư) tương ứng với capital
    totalNodes: {
        type: Number,
        required: true,
        default: 0
    },

    // Số notes đã được match
    matchedNodes: {
        type: Number,
        default: 0
    },

    // Số vốn đã được match
    matchedCapital: {
        type: Number,
        default: 0
    },

    // Khoảng lãi suất mong muốn
    interestRange: {
        min: { type: Number, required: true, default: 10 },
        max: { type: Number, required: true, default: 20 }
    },

    // Khoảng kỳ hạn mong muốn (tháng)
    periodRange: {
        min: { type: Number, required: true, default: 1 },
        max: { type: Number, required: true, default: 12 }
    },

    // Các mục đích vay chấp nhận (vd: "Kinh doanh", "Tiêu dùng")
    purpose: [{
        type: String,
        trim: true
    }],

    // Danh sách các khoản vay đã match
    loans: [{
        loanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
        nodeMatch: { type: Number, required: true },
        amount: { type: Number, required: true },
        matchedAt: { type: Date, default: Date.now }
    }],

    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'cancelled'],
        default: 'active',
        index: true
    },

    cancelledAt: { type: Date },
    completedAt: { type: Date }

}, {
    timestamps: true
});

// Indexes cho matching
autoInvestSchema.index({ status: 1, createdAt: 1 }); // FIFO matching
// Index cho range query
autoInvestSchema.index({
    status: 1,
    'interestRange.min': 1,
    'interestRange.max': 1,
    'periodRange.min': 1,
    'periodRange.max': 1
});

module.exports = mongoose.model('AutoInvest', autoInvestSchema);
