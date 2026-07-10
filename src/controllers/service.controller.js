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

/**
 * getService
 * Get a service by id 
 * GET /api/v1/services/:id
 */
const getService = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find Service
        const service = await Service.findByPk(req.params.id);
        if (!service) return next(new AppError(404, 'Service is not found'));

        // if Service is deleted and logges user is not admin
        if (service.IsDeleted && req.user.role !== 'admin') return next(new AppError(404, 'Service is not found'));

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: service
        })
    }
)

/**
 * updateService
 * Update a Service by id (only admin)
 * PATCH /api/v1/services/:id
 */
const updateService = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find Service
        const service = await Service.findByPk(req.params.id);
        if (!service) return next(new AppError(404, 'Service is not found'));

        // Invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        // filtered request body
        const filtered = filterBody(req.body, 'ServiceName', 'ServiceFee');

        // If match no fields
        if (Object.keys(filtered).length === 0) return next(new AppError(400, "No valid fields to update"));

        // update
        await Service.update(
            filtered,
            { where: { ServiceId: req.params.id } }
        )

        // Send response
        res.status(200).json({
            success: true,
            message: 'Update successfully'
        })
    }
)

module.exports = { createService, getAllServices, getService, updateService }