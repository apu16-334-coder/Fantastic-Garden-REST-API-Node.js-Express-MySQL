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

module.exports = { getAllCustomer }