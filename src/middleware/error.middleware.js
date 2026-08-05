const AppError = require('../utlis/AppError.js') // Custom error class

// This catches routes that don't exist
const noRouteFound = (req, res, next) => {
    next(new AppError(404, `Route Not Found - ${req.url}`))
}

// Global error handler
// Catches all errors thrown in the app
const globalErrorHandler = (err, req, res, next) => {
    // Log stack trace (dev/debugging)
    console.error(err.stack);
    console.log(err)

    // Handle Sequelize errors
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
        err.status = 400;
        err.message = err.errors.map(e => e.message).join(", ")
    }

    const isOperational = err.isOperational; // set this on your AppError class if not already
    const statusCode = err.status || 500;

    res.status(statusCode).json({
        success: false,
        message: (isOperational || statusCode < 500)
            ? err.message
            : 'Something went wrong. Please try again later.'
    });
}

module.exports = { noRouteFound, globalErrorHandler }