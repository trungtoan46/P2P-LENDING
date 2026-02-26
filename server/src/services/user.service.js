/**
 * @description User Service - Handle user profile and details management
 */

const User = require('../models/User');
const UserDetails = require('../models/UserDetails');
const { NotFoundError, ValidationError } = require('../utils/errors');
const { sanitizeUser } = require('../utils/helpers');

class UserService {
    /**
     * Get user by ID
     * @param {String} userId - User ID
     * @returns {Object} User object
     */
    async getUserById(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return sanitizeUser(user);
    }

    /**
     * Get user profile with details
     * @param {String} userId - User ID
     * @returns {Object} { user, details }
     */
    async getUserProfile(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        const details = await UserDetails.findOne({ userId });

        return {
            user: sanitizeUser(user),
            details: details || null
        };
    }

    /**
     * Create or update user details
     * @param {String} userId - User ID
     * @param {Object} data - User details data
     * @returns {Object} UserDetails object
     */
    async updateUserDetails(userId, data) {
        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        // Check if SSN is already used by another user
        if (data.ssn) {
            const existingDetails = await UserDetails.findOne({
                ssn: data.ssn,
                userId: { $ne: userId }
            });
            if (existingDetails) {
                throw new ValidationError('SSN/ID number is already registered');
            }
        }

        // Create or update details
        let details = await UserDetails.findOne({ userId });

        if (details) {
            // Update existing details
            Object.assign(details, data);
            await details.save();
        } else {
            // Create new details
            details = await UserDetails.create({
                userId,
                ...data
            });
        }

        return details;
    }

    /**
     * Upload KYC images
     * @param {String} userId - User ID
     * @param {Object} images - { frontID, backID, selfie }
     * @returns {Object} Updated UserDetails
     */
    async uploadKYCImages(userId, images) {
        let details = await UserDetails.findOne({ userId });

        if (!details) {
            throw new NotFoundError('User details not found. Please complete your profile first');
        }

        // Update image URLs
        if (images.frontID) details.imageURLs.frontID = images.frontID;
        if (images.backID) details.imageURLs.backID = images.backID;
        if (images.selfie) details.imageURLs.selfie = images.selfie;

        // Reset KYC status to pending if images are updated
        details.kycStatus = 'pending';
        details.kycRejectionReason = null;

        await details.save();

        return details;
    }

    /**
     * Get user details by user ID
     * @param {String} userId - User ID
     * @returns {Object} UserDetails object
     */
    async getUserDetails(userId) {
        const details = await UserDetails.findOne({ userId }).populate('userId', 'phone category');
        if (!details) {
            throw new NotFoundError('User details not found');
        }
        return details;
    }

    /**
     * Update user category (borrower/lender/both)
     * @param {String} userId - User ID
     * @param {String} category - New category
     * @returns {Object} Updated user
     */
    async updateUserCategory(userId, category) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        user.category = category;
        await user.save();

        return sanitizeUser(user);
    }

    /**
     * Deactivate user account
     * @param {String} userId - User ID
     * @returns {Object} { message }
     */
    async deactivateUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        user.isActive = false;
        await user.save();

        return {
            message: 'User account deactivated successfully'
        };
    }

    /**
     * Activate user account (Admin only)
     * @param {String} userId - User ID
     * @returns {Object} { message }
     */
    async activateUser(userId) {
        const user = await User.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        user.isActive = true;
        await user.save();

        return {
            message: 'User account activated successfully'
        };
    }

    /**
     * Approve KYC (Admin only)
     * @param {String} userId - User ID
     * @param {String} adminId - Admin user ID
     * @returns {Object} Updated UserDetails
     */
    async approveKYC(userId, adminId) {
        const details = await UserDetails.findOne({ userId });
        if (!details) {
            throw new NotFoundError('User details not found');
        }
        const updateData = {
            kycStatus: 'approved',
            kycApprovedAt: new Date(),
            kycApprovedBy: adminId,
            kycRejectionReason: null
        };

        await UserDetails.updateOne({ userId }, { $set: updateData });
        Object.assign(details, updateData);

        // Cập nhật trạng thái xác thực cho User
        await User.findByIdAndUpdate(userId, { isVerified: true });

        return details;
    }

    /**
     * Reject KYC (Admin only)
     * @param {String} userId - User ID
     * @param {String} reason - Rejection reason
     * @returns {Object} Updated UserDetails
     */
    async rejectKYC(userId, reason) {
        const details = await UserDetails.findOne({ userId });
        if (!details) {
            throw new NotFoundError('User details not found');
        }
        const updateData = {
            kycStatus: 'rejected',
            kycRejectionReason: reason
        };

        await UserDetails.updateOne({ userId }, { $set: updateData });
        Object.assign(details, updateData);

        return details;
    }

    /**
     * Get all users (Admin only)
     * @param {Object} filters - { category, isActive, kycStatus }
     * @param {Number} page - Page number
     * @param {Number} limit - Items per page
     * @returns {Object} { users, total }
     */
    async getAllUsers(filters = {}, page = 1, limit = 10) {
        const query = {};

        if (filters.category) query.category = filters.category;
        if (filters.isActive !== undefined) query.isActive = filters.isActive;

        const skip = (page - 1) * limit;

        const users = await User.find(query)
            .select('-password -refreshToken')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        return {
            users,
            total
        };
    }

    /**
     * Get users with pending KYC (Admin only)
     * @returns {Array} List of UserDetails with pending KYC
     */
    async getPendingKycUsers() {
        console.log('[UserService] Fetching pending KYC users...');
        const pendingDetails = await UserDetails.find({ kycStatus: 'pending' })
            .populate('userId', 'phone category isActive')
            .sort({ createdAt: -1 });

        console.log(`[UserService] Found ${pendingDetails.length} pending KYC users`);

        // Map lại để trả về structure ổn định cho frontend
        return pendingDetails.map(detail => {
            const obj = detail.toObject();
            // Đảm bảo userId là string ID chính của user chính
            const userObj = obj.userId;
            return {
                ...obj,
                userId: userObj?._id?.toString() || obj.userId?.toString(),
                userPhone: userObj?.phone,
                userCategory: userObj?.category
            };
        });
    }
}

module.exports = new UserService();
