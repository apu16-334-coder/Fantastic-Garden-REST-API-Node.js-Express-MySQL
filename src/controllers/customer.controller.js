const { Customer } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * getAllCustomer
 * Get all customer 
 * GET /api/v1/customers
 */
const getAllCustomer = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // get api features with options obj
        let features = new ApiFeatures(req.query)
            .filter()
            .search('CustomerName', 'CustomerAddress', 'CustomerEmail')
            .sort()
            .pagination();

        console.log(features.options)

        // Execute the query
        const { count, rows } = await Customer.findAndCountAll(features.options);

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

/**
 * getCustomer
 * Get a customer by id 
 * GET /api/v1/customers/:id
 */
const getCustomer = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find customer
        const customer = await Customer.findByPk(req.params.id);
        if (!customer) return next(new AppError(404, 'customer is not found'));

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: customer
        })
    }
)

/**
 * getMe
 * Get Customer himself or hershelf (only customer)
 * GET /api/v1/customers/me
 */
const getMe = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find customer
        const me = await Customer.findOne({
            where: {
                CustomerId: req.user.id
            }
        });

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: me
        })
    }
)

/**
 * updateMe
 * Update a customer himself or herself by id (only customer)
 * PATCH /api/v1/Customers/me
 */
const updateMe = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // Invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        // filtered request body
        const filtered = filterBody(req.body, 'CustomerName', 'CustomerAddress', 'CustomerEmail', 'PhoneNumber');

        // If match no fields
        if (Object.keys(filtered).length === 0) return next(new AppError(400, "No valid fields to update"));

        // update
        await Customer.update(
            filtered,
            { where: { CustomerId: req.user.id } }
        )

        // Send response
        res.status(200).json({
            success: true,
            message: 'Update successfully'
        })
    }
)

module.exports = { getAllCustomer, getCustomer, getMe, updateMe }