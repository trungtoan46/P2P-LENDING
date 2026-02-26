/**
 * @description Validation Middleware - Request validation using Joi
 */

const { ValidationError } = require('../utils/errors');

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            console.log('[Validation Middleware] Error details:', JSON.stringify(errors, null, 2));
            console.log('[Validation Middleware] Request body:', JSON.stringify(req.body, null, 2));

            return next(new ValidationError('Validation failed', errors));
        }

        // Replace req.body with validated value
        req.body = value;
        next();
    };
};

/**
 * Validate request query parameters against Joi schema
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            console.log('[Validation Middleware - Query] Error details:', JSON.stringify(errors, null, 2));
            console.log('[Validation Middleware - Query] Request query:', JSON.stringify(req.query, null, 2));

            return next(new ValidationError('Validation failed', errors));
        }

        // Replace req.query with validated value
        req.query = value;
        next();
    };
};

/**
 * Validate request params against Joi schema
 * @param {Object} schema - Joi schema
 * @returns {Function} Express middleware
 */
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new ValidationError('Validation failed', errors));
        }

        // Replace req.params with validated value
        req.params = value;
        next();
    };
};

module.exports = {
    validateBody,
    validateQuery,
    validateParams
};
