const bcrypt = require("bcrypt");
const { Staff } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createStaff
 * create staff (only admin)
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
/**
 * getAllStaff
 * get all the staff (only admin)
 * GET /api/v1/staffs
 */
const getAllStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // get api features with options obj
        const features = new ApiFeatures(req.query)
            .filter()
            .search('StaffName', 'StaffEmail')
            .sort()
            .pagination();
        
        // Execute the query
        const { count, rows } = await Staff.findAndCountAll(features.options);

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            results: rows.length,
            total: count,
            page: features.page,
            limit: features.options.limit,
            data: rows
        })
    }
)

module.exports = { createStaff, getAllStaff }