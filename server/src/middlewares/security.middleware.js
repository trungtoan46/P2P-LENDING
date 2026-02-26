/**
 * Security Middleware - Rate Limiting, XSS Protection, Input Sanitization
 */

const rateLimit = require('express-rate-limit');
const xss = require('xss');

/**
 * Rate limiter cho auth routes (strict)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phut
    max: 100, // 100 requests / 15 phut
    message: {
        success: false,
        message: 'Qua nhieu yeu cau. Vui long thu lai sau 15 phut.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter cho API chung
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phut
    max: 1000, // 1000 requests / 15 phut
    message: {
        success: false,
        message: 'Qua nhieu yeu cau. Vui long thu lai sau.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter cho OTP (rat strict)
 */
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phut
    max: 3, // 3 requests / phut
    message: {
        success: false,
        message: 'Qua nhieu yeu cau OTP. Vui long thu lai sau 1 phut.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Sanitize input - loai bo XSS
 */
const sanitizeInput = (req, res, next) => {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    next();
};

/**
 * Helper: Sanitize object recursively
 */
function sanitizeObject(obj) {
    if (typeof obj === 'string') {
        return xss(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }
    if (obj && typeof obj === 'object') {
        const sanitized = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                sanitized[key] = sanitizeObject(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}

module.exports = {
    authLimiter,
    apiLimiter,
    otpLimiter,
    sanitizeInput
};
