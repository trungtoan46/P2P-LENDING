class CustomError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends CustomError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
    }
}

class NotFoundError extends CustomError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

class UnauthorizedError extends CustomError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

class ForbiddenError extends CustomError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

class AuthenticationError extends CustomError {
    constructor(message = 'Authentication failed') {
        super(message, 401);
    }
}

class AuthorizationError extends CustomError {
    constructor(message = 'Access denied') {
        super(message, 403);
    }
}

class ConflictError extends CustomError {
    constructor(message = 'Resource conflict') {
        super(message, 409);
    }
}

module.exports = {
    CustomError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    AuthenticationError,
    AuthorizationError,
    ConflictError
};
