/**
 * @description Authentication Middleware - JWT verification and authorization
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { BORROWER, LENDER, ADMIN } = require('../constants');

/**
 * Authenticate JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '') ||
            req.header('x-auth');

        if (!token) {
            throw new AuthenticationError('No authentication token provided');
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.secret);

        const User = require('../models/User');
        const user = await User.findById(decoded.id).select('isActive tokenVersion');

        if (!user) {
            throw new AuthenticationError('User not found');
        }

        if (!user.isActive) {
            throw new AuthenticationError('Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị viên.');
        }

        if (decoded.tokenVersion !== undefined && user.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
            throw new AuthenticationError('Token has been invalidated. Please login again.');
        }

        // Attach user info to request
        req.user = {
            id: decoded.id,
            phone: decoded.phone,
            category: decoded.category
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new AuthenticationError('Invalid token'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new AuthenticationError('Token expired'));
        }
        next(error);
    }
};

/**
 * Check if user is a borrower
 */
const isBorrower = (req, res, next) => {
    if (req.user.category !== BORROWER && req.user.category !== 'both') {
        return next(new AuthorizationError('Access restricted to borrowers only'));
    }
    next();
};

/**
 * Check if user is a lender
 */
const isLender = (req, res, next) => {
    if (req.user.category !== LENDER && req.user.category !== 'both') {
        return next(new AuthorizationError('Access restricted to lenders only'));
    }
    next();
};

/**
 * Check if user is an admin
 */
const isAdmin = (req, res, next) => {
    if (req.user.category !== ADMIN) {
        console.warn(`[isAdmin] Access denied for user ${req.user.id}. Category: ${req.user.category}`);
        return next(new AuthorizationError('Access restricted to administrators only'));
    }
    console.log(`[isAdmin] Access granted for user ${req.user.id}`);
    next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') ||
            req.header('x-auth');

        if (token) {
            const decoded = jwt.verify(token, config.jwt.secret);
            req.user = {
                id: decoded.id,
                phone: decoded.phone,
                category: decoded.category
            };
        }
    } catch (error) {
        if (req.header('Authorization') || req.header('x-auth')) {
            return next(new AuthenticationError('Invalid token'));
        }
    }
    next();
};

module.exports = {
    authenticate,
    isBorrower,
    isLender,
    isAdmin,
    optionalAuth
};
