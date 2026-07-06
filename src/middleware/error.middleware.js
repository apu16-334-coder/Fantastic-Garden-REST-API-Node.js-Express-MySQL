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

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error '
    })
}

module.exports = { noRouteFound, globalErrorHandler }
