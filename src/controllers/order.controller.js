const { sequelize, Order, OrderProduct, OrderService, Product, Service, Customer } = require('../models/index.model');
const { Op, where } = require('sequelize');
const catchAsync = require("../utlis/catchAsync.js");

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");
const validateOrderInput = require("../utlis/validateOrderInput.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createOrder
 * create order (only admin)
 * POST /api/v1/orders
 */
const createOrder = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // checj invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const { products = [], services = [] } = req.body;

        if (products.length === 0 && services.length === 0) {
            return next(new AppError(400, 'An order must include at least one product or service.'));
        }

        // Validate products and services
        const validationErr = validateOrderInput(products, services);
        if (validationErr.length > 0) return next(new AppError(400, validationErr.join(', ')));

        // ---- Products ----
        const productIds = products.map(p => p.ProductId);
        const dbProducts = productIds.length > 0
            ? await Product.findAll({ where: { ProductId: { [Op.in]: productIds }, IsDeleted: false } })
            : [];

        const dbProductIds = dbProducts.map(p => p.ProductId);
        const missingProducts = productIds.filter(id => !dbProductIds.includes(id));
        if (missingProducts.length > 0) {
            return next(new AppError(400, `Product(s) not found: ${missingProducts.join(', ')}`));
        }

        // ---- Auto-attach Delivery service if the order has any products ----
        let finalServices = [...services];
        const deliveryService = await Service.findOne({
            where: { ServiceName: 'Delivery' },
            attributes: ['ServiceId']
        });

        if (dbProducts.length > 0 ) {
            const alreadyIncluded = finalServices.some(s => s.ServiceId === deliveryService.ServiceId);
            if (!alreadyIncluded) {
                finalServices.push({ ServiceId: deliveryService.ServiceId });
            }
        }

        // ---- Services (including the auto-added delivery one) ----
        const serviceIds = finalServices.map(s => s.ServiceId);
        const dbServices = serviceIds.length > 0
            ? await Service.findAll({ where: { ServiceId: { [Op.in]: serviceIds }, IsDeleted: false } })
            : [];

        const dbServiceIds = dbServices.map(s => s.ServiceId);
        const missingServices = serviceIds.filter(id => !dbServiceIds.includes(id));
        if (missingServices.length > 0) {
            return next(new AppError(400, `Service(s) not found: ${missingServices.join(', ')}`));
        }

        // ---- Calculate TotalCost server-side ----
        let totalCost = 0;
        products.forEach(p => {
            const dbProduct = dbProducts.find(dp => dp.ProductId === p.ProductId);
            totalCost += dbProduct.UnitPrice * p.Quantity;
        });
        dbServices.forEach(s => {
            totalCost += s.ServiceFee;
        });

        // creating tables
        const t = await sequelize.transaction();
        try {
            // Create the Order itself
            const order = await Order.create(
                {
                    CustomerId: req.user.id,
                    TotalCost: totalCost,
                },
                { transaction: t }
            );

            // Create OrderProduct line items
            if (products.length > 0) {
                const orderProductRows = products.map(p => ({
                    OrderId: order.OrderId,
                    ProductId: p.ProductId,
                    Quantity: p.Quantity,
                }));
                await OrderProduct.bulkCreate(orderProductRows, { transaction: t });
            }

            // Create OrderService line items — StaffId left null, admin assigns later
            if (finalServices.length > 0) {
                const orderServiceRows = finalServices.map(s => ({
                    OrderId: order.OrderId,
                    ServiceId: s.ServiceId,
                    StaffId: null,
                }));
                await OrderService.bulkCreate(orderServiceRows, { transaction: t });
            }

            await t.commit();

            res.status(201).json({
                status: 'success',
                data: order
            });
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
)

module.exports = { createOrder }