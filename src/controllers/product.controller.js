const { Product } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");
const { where } = require('sequelize');

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
const getAllProducts = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        const extraQueryFilter = req.user.role === 'admin'
            ? {}
            : { isDeleted: false };

        console.log(extraQueryFilter)

        // get api features with options obj
        let features = new ApiFeatures(req.query, extraQueryFilter)
            .filter()
            .search('ProductName')
            .sort()
            .pagination();

        console.log(features.options)

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

/**
 * getProduct
 * Get a product by id 
 * GET /api/v1/products/:id
 */
const getProduct = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {       
        // find product
        const product = await Product.findByPk(req.params.id);
        if(!product) return next(new AppError(404, 'Product is not found'));

        if(product.IsDeleted && req.user.role === 'staff') return next(new AppError(404, 'Product is not found'));

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: product
        })
    }
)





module.exports = { createProduct, getAllProducts, getProduct }