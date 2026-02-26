/**
 * @description Authentication Service - Handle user authentication and authorization
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const config = require('../config');
const { hashPassword, comparePassword, generateOTP } = require('../utils/helpers');
const { ValidationError, AuthenticationError, ConflictError } = require('../utils/errors');
const logger = require('../utils/logger');
const smsService = require('../utils/smsService');

class AuthService {
    /**
     * Register new user - Send OTP for verification
     * @param {String} phone - User's phone number
     * @returns {Object} { message, otpSent }
     */
    async register(phone) {
        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            throw new ConflictError('Phone number already registered');
        }

        // Generate OTP
        const code = generateOTP(6);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        await OTP.create({
            phone,
            code,
            expiresAt
        });

        // Log OTP (mock SMS)
        await smsService.sendOTP(phone, code);

        return {
            message: 'OTP sent successfully',
            otpSent: true,
            // Return OTP in development mode for testing
            ...(config.env === 'development' && { code })
        };
    }

    /**
     * Verify OTP and create user account
     * @param {String} phone - User's phone number
     * @param {String} code - OTP code
     * @param {String} password - User's password
     * @param {String} category - User category (borrower/lender/both)
     * @returns {Object} { user, token, refreshToken }
     */
    async verifyOTPAndCreateUser(phone, code, password, category = 'borrower') {
        // Find valid OTP
        const otp = await OTP.findOne({
            phone,
            code,
            isUsed: false,
            expiresAt: { $gt: new Date() }
        });

        if (!otp) {
            throw new ValidationError('Invalid or expired OTP');
        }

        // Check attempts
        if (otp.attempts >= 3) {
            throw new ValidationError('Too many failed attempts. Please request a new OTP');
        }

        // Mark OTP as used
        otp.isUsed = true;
        await otp.save();

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create user
        const user = await User.create({
            phone,
            password: hashedPassword,
            category,
            isVerified: true
        });

        // Generate tokens
        const token = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Save refresh token
        user.refreshToken = refreshToken;
        await user.save();

        return {
            user: user.toJSON(),
            token,
            refreshToken
        };
    }

    /**
     * Login user
     * @param {String} phone - User's phone number
     * @param {String} password - User's password
     * @returns {Object} { user, token, refreshToken }
     */
    async login(phone, password) {
        // Find user
        const user = await User.findOne({ phone });
        if (!user) {
            throw new AuthenticationError('Invalid phone number or password');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new AuthenticationError('Account is deactivated. Please contact support');
        }

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            throw new AuthenticationError('Invalid phone number or password');
        }

        // Generate tokens
        const token = this.generateAccessToken(user);
        const refreshToken = this.generateRefreshToken(user);

        // Update user
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save();

        return {
            user: user.toJSON(),
            token,
            refreshToken
        };
    }

    /**
     * Refresh access token
     * @param {String} refreshToken - Refresh token
     * @returns {Object} { token, refreshToken }
     */
    async refreshToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

            // Find user
            const user = await User.findById(decoded.id);
            if (!user || user.refreshToken !== refreshToken) {
                throw new AuthenticationError('Invalid refresh token');
            }

            // Kiểm tra tài khoản có hoạt động không
            if (!user.isActive) {
                throw new AuthenticationError('Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.');
            }

            // Generate new tokens
            const newToken = this.generateAccessToken(user);
            const newRefreshToken = this.generateRefreshToken(user);

            // Update refresh token
            user.refreshToken = newRefreshToken;
            await user.save();

            return {
                token: newToken,
                refreshToken: newRefreshToken
            };
        } catch (error) {
            throw new AuthenticationError('Invalid or expired refresh token');
        }
    }

    /**
     * Change password
     * @param {String} userId - User ID
     * @param {String} oldPassword - Current password
     * @param {String} newPassword - New password
     * @returns {Object} { message }
     */
    async changePassword(userId, oldPassword, newPassword) {
        const user = await User.findById(userId);
        if (!user) {
            throw new AuthenticationError('User not found');
        }

        // Verify old password
        const isPasswordValid = await comparePassword(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new AuthenticationError('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password and invalidate all tokens
        user.password = hashedPassword;
        user.refreshToken = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        await user.save();

        return {
            message: 'Password changed successfully'
        };
    }

    /**
     * Update FCM token for push notifications
     * @param {String} userId - User ID
     * @param {String} fcmToken - FCM token
     * @returns {Object} { message }
     */
    async updateFCMToken(userId, fcmToken) {
        await User.findByIdAndUpdate(userId, { fcmToken });
        return {
            message: 'FCM token updated successfully'
        };
    }

    /**
     * Generate access token
     * @param {Object} user - User object
     * @returns {String} JWT token
     */
    generateAccessToken(user) {
        return jwt.sign(
            {
                id: user._id,
                phone: user.phone,
                category: user.category,
                tokenVersion: user.tokenVersion || 0
            },
            config.jwt.secret,
            { expiresIn: config.jwt.expiresIn }
        );
    }

    /**
     * Generate refresh token
     * @param {Object} user - User object
     * @returns {String} JWT refresh token
     */
    generateRefreshToken(user) {
        return jwt.sign(
            {
                id: user._id
            },
            config.jwt.refreshSecret,
            { expiresIn: config.jwt.refreshExpiresIn }
        );
    }
}

module.exports = new AuthService();
