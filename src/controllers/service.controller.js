const { Service } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createService
 * create service (only admin)
 * POST /api/v1/services
 */
const createService = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const filtered = filterBody(req.body, 'ServiceName', 'ServiceFee');

        // Create record of Customer
        const service = await Service.create(filtered);

        //response
        res.status(201).json({
            success: true,
            data: service
        })
    }
)

/**
 * getAllService
 * Get all services 
 * GET /api/v1/services
 */
const getAllServices = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        const extraQueryFilter = req.user.role === 'admin'
            ? {}
            : { isDeleted: false };

        console.log(extraQueryFilter)

        // get api features with options obj
        let features = new ApiFeatures(req.query, extraQueryFilter)
            .filter()
            .search('ServiceName')
            .sort()
            .pagination();

        // Execute the query
        const { count, rows } = await Service.findAndCountAll(features.options);

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

module.exports = { createService, getAllServices }