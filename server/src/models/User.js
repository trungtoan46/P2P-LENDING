/**
 * @description User Model - Main user account
 */

const mongoose = require('mongoose');
const { userCategoryRegex, phoneRegex } = require('../constants');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        unique: true,
        match: [phoneRegex, 'Invalid phone number format'],
        trim: true
    },

    fullName: {
        type: String,
        trim: true,
        default: null
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },

    category: {
        type: String,
        enum: userCategoryRegex,
        required: [true, 'User category is required'],
        default: 'borrower'
    },

    isActive: {
        type: Boolean,
        default: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    fcmToken: {
        type: String,
        default: null
    },

    lastLogin: {
        type: Date,
        default: null
    },

    refreshToken: {
        type: String,
        default: null
    },

    tokenVersion: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ category: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);
