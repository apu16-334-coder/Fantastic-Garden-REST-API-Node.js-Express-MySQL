const bcrypt = require("bcrypt");
const { Staff } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createStaff
 * create staff only
 * POST /api/v1/staffs
 */
const createStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const filtered = filterBody(req.body, 'StaffName', 'StaffEmail', 'Password', 'Role', 'IsActive');

        if (filtered.Password?.length < 8) return next(new AppError(400, 'Password must be atleast 8 characters'));

        // Create record of Customer
        const staff = await Staff.create(filtered);

        //response
        res.status(201).json({
            success: true,
            data: {
                StaffId: staff.StaffId,
                StaffName: staff.StaffName,
                StaffEmail: staff.StaffEmail,
                Role: staff.Role
            }
        })
    }
)

module.exports = {createStaff}