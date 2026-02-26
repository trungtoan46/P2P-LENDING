/**
 * @description User Controller - Handle user profile requests
 */

const userService = require('../services/user.service');
const { successResponse, paginatedResponse } = require('../utils/response');

class UserController {
    /**
     * Get current user profile
     * GET /api/users/profile
     */
    async getProfile(req, res, next) {
        try {
            const result = await userService.getUserProfile(req.user.id);
            return successResponse(res, result, 'Profile retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update user details
     * PUT /api/users/profile
     */
    async updateProfile(req, res, next) {
        try {
            const result = await userService.updateUserDetails(req.user.id, req.body);
            return successResponse(res, result, 'Profile updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Upload KYC images
     * POST /api/users/kyc/upload
     */
    async uploadKYC(req, res, next) {
        try {
            const images = {
                frontID: req.files?.frontID?.[0]?.path,
                backID: req.files?.backID?.[0]?.path,
                selfie: req.files?.selfie?.[0]?.path
            };
            const result = await userService.uploadKYCImages(req.user.id, images);
            return successResponse(res, result, 'KYC images uploaded successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user by ID
     * GET /api/users/:id
     */
    async getUserById(req, res, next) {
        try {
            const result = await userService.getUserById(req.params.id);
            return successResponse(res, result, 'User retrieved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update user category
     * PUT /api/users/category
     */
    async updateCategory(req, res, next) {
        try {
            const { category } = req.body;
            const result = await userService.updateUserCategory(req.user.id, category);
            return successResponse(res, result, 'Category updated successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all users (Admin only)
     * GET /api/users
     */
    async getAllUsers(req, res, next) {
        try {
            const { category, isActive, page = 1, limit = 10 } = req.query;
            const filters = { category, isActive };
            const result = await userService.getAllUsers(filters, page, limit);
            return paginatedResponse(
                res,
                result.users,
                page,
                limit,
                result.total,
                'Users retrieved successfully'
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve KYC (Admin only)
     * POST /api/users/:id/kyc/approve
     */
    async approveKYC(req, res, next) {
        try {
            const result = await userService.approveKYC(req.params.id, req.user.id);
            return successResponse(res, result, 'KYC approved successfully');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject KYC (Admin only)
     * POST /api/users/:id/kyc/reject
     */
    async rejectKYC(req, res, next) {
        try {
            const { reason } = req.body;
            const result = await userService.rejectKYC(req.params.id, reason);
            return successResponse(res, result, 'KYC rejected');
        } catch (error) {
            next(error);
        }
    }

    /**
     * Activate user (Admin only)
     * POST /api/users/:id/activate
     */
    async activateUser(req, res, next) {
        try {
            const result = await userService.activateUser(req.params.id);
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deactivate user (Admin only)
     * POST /api/users/:id/deactivate
     */
    async deactivateUser(req, res, next) {
        try {
            const result = await userService.deactivateUser(req.params.id);
            return successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get users with pending KYC (Admin only)
     * GET /api/users/kyc/pending
     */
    async getPendingKycUsers(req, res, next) {
        try {
            const result = await userService.getPendingKycUsers();
            console.log(`[UserController] getPendingKycUsers - Result count: ${result?.length || 0}`);
            return successResponse(res, result, 'Pending KYC users retrieved successfully');
        } catch (error) {
            console.error('[UserController] getPendingKycUsers - Error:', error);
            next(error);
        }
    }
}

module.exports = new UserController();
