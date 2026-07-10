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

module.exports = { createService }