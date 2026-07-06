// Load dependencies
const jwt = require("jsonwebtoken");

// Import important Modules
const catchAsync = require("../utlis/catchAsync.js");
const { Customer, Staff } = require('../models/index.model');
const AppError = require("../utlis/AppError");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */
/**
 * Middleware to protect routes by verifying JWT tokens
 * 1. Check for token in Authorization header
 * 2. Verify token
 * 3. Check if user exists
 * 4. Check if password was changed after token issued
 * 5. Attach user to req object
 */
const protect = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // Get token from header
        const token = req.headers.authorization?.startsWith('Bearer')
            ? req.headers.authorization.split(" ")[1]
            : undefined;

        // If no token found
        if (!token) return next(new AppError(401, 'You are not logged in. Please log in'));

        // verify and decode the token 
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return next(new AppError(401, "Invalid or expired token"));
        }

        console.log(decoded.role);

        const user = decoded.role === 'customer'
            ? await Customer.findOne({ where: { CustomerEmail: decoded.email} })
            : await Staff.findOne({ where: { StaffEmail: decoded.email } });

        console.log(user)
        // Check if user still exists
        if (!user) {
            return next(new AppError(401, "User is no longer exists"));
        }
     
        // Attach user to request
        req.user = decoded;
        next()
    }
)

/**
 * restrictTo
 * Middleware to restrict access based on user roles
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'manager')
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!req.user || !roles.includes(req.user.role)) {
            return next(new AppError(403, "Access denied. Insufficient permission"));
        }
        next()
    }
}

module.exports = { protect, restrictTo }