/**
 * @description UserDetails Model - Extended user information and KYC data
 */

const mongoose = require('mongoose');
const { genderRegex, ssnRegex, KYC_STATUS } = require('../constants');

const userDetailsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },

    birth: {
        type: Date,
        required: [true, 'Birth date is required']
    },

    sex: {
        type: String,
        enum: genderRegex,
        required: [true, 'Gender is required']
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
    },

    address: {
        type: String,
        required: [true, 'Address is required'],
        minlength: [10, 'Address must be at least 10 characters'],
        maxlength: [200, 'Address cannot exceed 200 characters']
    },

    city: {
        type: String,
        required: [true, 'City is required'],
        minlength: [2, 'City must be at least 2 characters'],
        maxlength: [50, 'City cannot exceed 50 characters']
    },

    ssn: {
        type: String,
        required: [true, 'SSN/ID number is required'],
        unique: true,
        match: [ssnRegex, 'SSN must be 9 or 12 digits']
    },

    job: {
        type: String,
        required: [true, 'Job/Occupation is required'],
        minlength: [2, 'Job must be at least 2 characters'],
        maxlength: [100, 'Job cannot exceed 100 characters']
    },

    income: {
        type: Number,
        required: [true, 'Income is required'],
        min: [0, 'Income must be a positive number']
    },

    score: {
        type: Number,
        default: 580,
        min: [300, 'Credit score cannot be below 300'],
        max: [850, 'Credit score cannot exceed 850']
    },

    creditGrade: {
        type: String,
        enum: ['A', 'B', 'C', 'D', 'E', 'F', null],
        default: null
    },

    pdPercent: {
        type: Number,
        default: null,
        min: [0, 'PD percent cannot be negative'],
        max: [100, 'PD percent cannot exceed 100']
    },

    scoringDecision: {
        type: String,
        enum: ['APPROVE', 'REVIEW', 'REJECT', null],
        default: null
    },

    lastScoringAt: {
        type: Date,
        default: null
    },

    imageURLs: {
        frontID: {
            type: String,
            default: null
        },
        backID: {
            type: String,
            default: null
        },
        selfie: {
            type: String,
            default: null
        }
    },

    kycStatus: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.PENDING
    },

    kycRejectionReason: {
        type: String,
        default: null
    },

    kycApprovedAt: {
        type: Date,
        default: null
    },

    kycApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Disbursement method preferences (for auto-fill)
    lastDisbursementMethod: {
        type: String,
        enum: ['wallet', 'bank', null],
        default: null
    },

    lastBankName: {
        type: String,
        default: null
    },

    lastBankAccountNumber: {
        type: String,
        default: null
    },

    lastBankAccountHolderName: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
userDetailsSchema.index({ userId: 1 });
userDetailsSchema.index({ ssn: 1 });
userDetailsSchema.index({ kycStatus: 1 });

module.exports = mongoose.model('UserDetails', userDetailsSchema);
