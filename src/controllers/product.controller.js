const { Product } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createProduct
 * create product (only admin)
 * POST /api/v1/products
 */
const createProduct = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const filtered = filterBody(req.body, 'ProductName', 'UnitPrice');

        // Create record of Customer
        const product = await Product.create(filtered);

        //response
        res.status(201).json({
            success: true,
            data: product
        })
    }
)


/**
 * getAllProduct
 * Get all products 
 * GET /api/v1/products
 */
const getAllProduct = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // get api features with options obj
        const features = new ApiFeatures(req.query)
            .filter()
            .search('ProductName')
            .sort()
            .pagination();

        // Execute the query
        const { count, rows } = await Product.findAndCountAll(features.options);

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

module.exports = { createProduct, getAllProduct }