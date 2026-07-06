const bcrypt = require("bcrypt");
const { Customer } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * signUp
 * public signup customer only
 * POST /api/v1/auth/signup
 */
const signUp = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const filtered = filterBody(req.body, 'CustomerName', 'CustomerAddress', 'CustomerEmail', 'Password', 'PhoneNumber');

        if (filtered.Password?.length < 8) return next(new AppError(400, 'Password must be atleast 8 characters'));

        // Create record of Customer
        await Customer.create(filtered);

        //response
        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please log in.'
        })
    }
)

module.exports = { signUp }