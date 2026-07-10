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

module.exports = {createProduct}