const bcrypt = require("bcrypt");
const { Customer, Staff } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")

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

/**
 * loginCustomer
 * login customer only
 * POST /api/v1/auth/login/customer'
 */
const loginCustomer = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        // get requested email and password
        const { CustomerEmail, Password } = req.body;

        if (!CustomerEmail) return next(new AppError(400, 'CustomerEmail is required'));

        if (!Password) return next(new AppError(400, 'Password is required'));

        const customer = await Customer.unscoped().findOne({ where: { CustomerEmail } });

        // Constant-time response (always compare password even if user doesn't exist)
        const hashToCompare = (customer)
            ? customer.Password
            : "$2b$12$gCPPVO/Abj4wrRg/qGdX0eF1.eizqSvFQpiUQ9MsMqc/CkC1KajxK";

        const isPasswordMatch = await bcrypt.compare(Password, hashToCompare);

        // if user is not found or password does not match
        if (!customer || !isPasswordMatch) {
            return next(new AppError(401, "Invalid Email or password"));
        }

        const token = generateToken({ id: customer.CustomerId, role: 'customer' });

        //response
        res.status(201).json({
            success: true,
            token,
            data: {
                CustomerId: customer.CustomerId,
                CustomerName: customer.CustomerName,
                CustomerAddress: customer.CustomerAddress,
                CustomerEmail: customer.CustomerEmail,
                PhoneNumber: customer.PhoneNumber,
            }
        })
    }
)

/**
 * loginStaff
 * login staff only
 * POST /api/v1/auth/login/staff'
 */
const loginStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        // get requested email and password
        const { StaffEmail, Password } = req.body;

        if (!StaffEmail) return next(new AppError(400, 'StaffEmail is required'));

        if (!Password) return next(new AppError(400, 'Password is required'));

        const staff = await Staff.unscoped().findOne({ where: { StaffEmail } });

        // Constant-time response (always compare password even if user doesn't exist)
        const hashToCompare = (staff)
            ? staff.Password
            : "$2b$12$gCPPVO/Abj4wrRg/qGdX0eF1.eizqSvFQpiUQ9MsMqc/CkC1KajxK";

        const isPasswordMatch = await bcrypt.compare(Password, hashToCompare);

        // if user is not found or password does not match
        if (!staff || !isPasswordMatch) {
            return next(new AppError(401, "Invalid Email or password"));
        }

        const token = generateToken({ id: staff.StaffId, role: staff.Role });

        //response
        res.status(201).json({
            success: true,
            token,
            data: {
                StaffId: staff.StaffId,
                StaffName: staff.StaffName,               
                StaffEmail: staff.StaffEmail,
                Role: staff.Role,
            }
        })
    }
)

module.exports = { signUp, loginCustomer, loginStaff }