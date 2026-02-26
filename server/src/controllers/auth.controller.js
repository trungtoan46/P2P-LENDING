/**
 * @description Authentication Controller - Handle auth requests
 */

const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response');
const { CREATED_CODE } = require('../constants');

class AuthController {
    /**
     * Register new user - Send OTP
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const { phone } = req.body;
            const result = await authService.register(phone);
            return successResponse(res, result, 'OTP sent successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify OTP and create account
     * POST /api/auth/verify-otp
     */
    async verifyOTP(req, res, next) {
        try {
            const { phone, code, password, category } = req.body;
            const result = await authService.verifyOTPAndCreateUser(phone, code, password, category);
            return successResponse(res, result, 'Account created successfully', CREATED_CODE);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { phone, password } = req.body;
            const result = await authService.login(phone, password);
            return successResponse(res, result, 'Login successful');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refresh token
     * POST /api/auth/refresh-token
     */
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const result = await authService.refreshToken(refreshToken);
            return successResponse(res, result, 'Token refreshed successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Change password
     * POST /api/auth/change-password
     */
    async changePassword(req, res, next) {
        try {
            const { oldPassword, newPassword } = req.body;
            const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
            return successResponse(res, result, 'Password changed successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update FCM token
     * POST /api/auth/fcm-token
     */
    async updateFCMToken(req, res, next) {
        try {
            const { fcmToken } = req.body;
            const result = await authService.updateFCMToken(req.user.id, fcmToken);
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
