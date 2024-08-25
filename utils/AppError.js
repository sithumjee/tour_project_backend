class AppError extends Error {

    constructor(message, statusCode) {
        super(message)

        this.statusCode = statusCode || 500
        this.status = String(statusCode).startsWith('4') ? 'fail' : 'error'

        // we will use AppError class to create only operational errors. So by default isOperational is set to true
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor)
    }
}

module.exports = AppError