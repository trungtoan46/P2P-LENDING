/**
 * @description Loan Model - Loan contracts and applications
 */

const mongoose = require('mongoose');
const { LOAN_STATUS } = require('../constants');

const loanSchema = new mongoose.Schema({
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    capital: {
        type: Number,
        required: [true, 'Loan amount is required'],
        min: [1000000, 'Minimum loan amount is 1,000,000 VND'],
        max: [100000000, 'Maximum loan amount is 100,000,000 VND']
    },

    term: {
        type: Number,
        required: [true, 'Loan term is required'],
        min: [1, 'Minimum term is 1 month'],
        max: [18, 'Maximum term is 18 months']
    },

    interestRate: {
        type: Number,
        required: true,
        min: [0.05, 'Interest rate cannot be below 5%'],
        max: [0.30, 'Interest rate cannot exceed 30%']
    },

    purpose: {
        type: String,
        required: [true, 'Loan purpose is required'],
        minlength: [10, 'Purpose must be at least 10 characters'],
        maxlength: [500, 'Purpose cannot exceed 500 characters']
    },

    status: {
        type: String,
        enum: Object.values(LOAN_STATUS),
        default: LOAN_STATUS.PENDING
    },

    totalNotes: {
        type: Number,
        required: true,
        default: 0
    },

    investedNotes: {
        type: Number,
        default: 0
    },

    disbursementDate: {
        type: Date,
        required: true
    },

    // Disbursement Method Information
    method: {
        type: String,
        enum: ['wallet', 'bank']
    },

    walletAccountNumber: {
        type: String,
        default: null
    },

    bankAccountNumber: {
        type: String,
        default: null
    },

    bankAccountHolderName: {
        type: String,
        default: null
    },

    bankName: {
        type: String,
        default: null
    },

    maturityDate: {
        type: Date,
        required: true
    },

    investingEndDate: {
        type: Date,
        default: null
    },

    monthlyPayment: {
        type: Number,
        required: true
    },

    totalInterest: {
        type: Number,
        required: true
    },

    totalRepayment: {
        type: Number,
        required: true
    },

    // Credit score at time of application
    creditScore: {
        type: Number,
        default: 580
    },

    // Admin approval
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    approvedAt: {
        type: Date,
        default: null
    },

    rejectionReason: {
        type: String,
        default: null
    },

    cancelledAt: {
        type: Date,
        default: null
    },

    cancellationReason: {
        type: String,
        default: null
    },

    // Disbursement tracking
    isDisbursed: {
        type: Boolean,
        default: false
    },

    disbursedAt: {
        type: Date,
        default: null
    },

    // Blockchain integration
    blockchainContractId: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Convert interestRate từ decimal sang percentage (0.05 -> 5)
            if (ret.interestRate !== undefined) {
                ret.interestRate = Math.round(ret.interestRate * 10000) / 100;
            }
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: function (doc, ret) {
            // Convert interestRate từ decimal sang percentage (0.05 -> 5)
            if (ret.interestRate !== undefined) {
                ret.interestRate = Math.round(ret.interestRate * 10000) / 100;
            }
            return ret;
        }
    }
});

// Indexes
loanSchema.index({ borrowerId: 1, status: 1 });
loanSchema.index({ status: 1, createdAt: -1 });
loanSchema.index({ disbursementDate: 1 });

// Virtual for completion percentage
loanSchema.virtual('completionPercentage').get(function () {
    if (this.totalNotes === 0) return 0;
    return Math.round((this.investedNotes / this.totalNotes) * 100);
});

// Virtual for remaining amount
loanSchema.virtual('remainingAmount').get(function () {
    const notePrice = 500000; // BASE_UNIT_PRICE
    return (this.totalNotes - this.investedNotes) * notePrice;
});

module.exports = mongoose.model('Loan', loanSchema);
