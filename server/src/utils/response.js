/**
 * @description Standardized response helpers for API endpoints
 */

const { SUCCESS_CODE, SERVER_ERROR_CODE } = require('../constants');

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const successResponse = (res, data = null, message = 'Success', statusCode = SUCCESS_CODE) => {
    return res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data
    });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Additional error details
 */
const errorResponse = (res, message = 'Internal server error', statusCode = SERVER_ERROR_CODE, errors = null) => {
    const response = {
        success: false,
        statusCode,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items count
 * @param {String} message - Success message
 */
const paginatedResponse = (res, data, page, limit, total, message = 'Success') => {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const safePage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const safeLimit = Number.isNaN(parsedLimit) || parsedLimit < 1 ? 1 : parsedLimit;

    const totalPages = total > 0 ? Math.ceil(total / safeLimit) : 0;

    return res.status(SUCCESS_CODE).json({
        success: true,
        statusCode: SUCCESS_CODE,
        message,
        data,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages
        }
    });
};

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse
};
