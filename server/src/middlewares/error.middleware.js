const {
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    AuthenticationError,
    AuthorizationError
} = require('../utils/errors');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    const isDev = process.env.NODE_ENV === 'development';
    const logPayload = {
        message: err.message,
        path: req.path,
        method: req.method
    };
    if (isDev) {
        logPayload.stack = err.stack;
    }
    logger.error('Error:', logPayload);

    // Custom errors
    if (err instanceof ValidationError) {
        return errorResponse(res, err.message, 400, err.errors);
    }

    if (err instanceof NotFoundError) {
        return errorResponse(res, err.message, 404);
    }

    if (err instanceof UnauthorizedError) {
        return errorResponse(res, err.message, 401);
    }

    if (err instanceof ForbiddenError) {
        return errorResponse(res, err.message, 403);
    }

    if (err instanceof AuthenticationError) {
        return errorResponse(res, err.message, 401);
    }

    if (err instanceof AuthorizationError) {
        return errorResponse(res, err.message, 403);
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(res, 'Invalid token', 401);
    }

    if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expired', 401);
    }

    // Mongoose errors
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message
        }));
        return errorResponse(res, 'Validation failed', 400, errors);
    }

    if (err.name === 'CastError') {
        return errorResponse(res, `Invalid ${err.path}: ${err.value}`, 400);
    }

    // Default error
    return errorResponse(
        res,
        process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        err.statusCode || 500
    );
};

module.exports = errorHandler;
