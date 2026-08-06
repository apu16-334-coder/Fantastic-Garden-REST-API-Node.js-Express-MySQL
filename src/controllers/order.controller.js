const { sequelize, Staff, Order, OrderProduct, OrderService, Product, Service, Customer } = require('../models/index.model');
const { Op } = require('sequelize');
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
const createOrder = async (req, res, next) => {
    try {
        // checj invalid request body
        if (!req.body) return next(new AppError(400, 'Invalid request body'));

        const { products = [], services = [] } = req.body;

        if (products.length === 0 && services.length === 0) {
            return next(new AppError(400, 'An order must include at least one product or service.'));
        }

        // Validate products and services
        const validationErr = validateOrderInput(products, services);
        if (validationErr.length > 0) return next(new AppError(400, validationErr.join(', ')));

        const t = await sequelize.transaction();

        // ---- Products ----
        const productIds = products.map(p => p.ProductId);
        const dbProducts = productIds.length > 0
            ? await Product.findAll({ where: { ProductId: { [Op.in]: productIds }, IsDeleted: false }, transaction: t })
            : [];

        const dbProductIds = dbProducts.map(p => p.ProductId);
        const missingProducts = productIds.filter(id => !dbProductIds.includes(id));
        if (missingProducts.length > 0) {
            return next(new AppError(400, `Product(s) not found: ${missingProducts.join(', ')}`));
        }

        // ---- Auto-attach Delivery service if the order has any products ----
        let finalServices = [...services];
        const deliveryService = await Service.findOne({
            where: { ServiceName: 'Delivery', IsDeleted: false },
            attributes: ['ServiceId'],
            transaction: t
        });

        if (dbProducts.length > 0 && deliveryService) {
            const alreadyIncluded = finalServices.some(s => s.ServiceId === deliveryService.ServiceId);
            if (!alreadyIncluded) {
                finalServices.push({ ServiceId: deliveryService.ServiceId });
            }
        }

        // ---- Services (including the auto-added delivery one) ----
        const serviceIds = finalServices.map(s => s.ServiceId);
        const dbServices = serviceIds.length > 0
            ? await Service.findAll({ where: { ServiceId: { [Op.in]: serviceIds }, IsDeleted: false }, transaction: t })
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
        next(err)
    }
}

/**
 * getAllOrder
 * get all the orders 
 * GET /api/v1/orders
 */
const getAllOrder = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        let extraFilter = {};
        let orderServiceInclude = {
            model: OrderService,
            attributes: ['OrderServiceId', 'ServiceStatus'],
            include: [
                { model: Service, attributes: ['ServiceId', 'ServiceName', 'ServiceFee'] },
                { model: Staff, attributes: ['StaffId', 'StaffName'] },
            ],
        };
        let includeCustomer = false;

        if (req.user.role === 'customer') {
            extraFilter = { CustomerId: req.user.id };
        } else if (req.user.role === 'staff') {
            orderServiceInclude = {
                ...orderServiceInclude,
                where: { StaffId: req.user.id },
                required: true, // INNER JOIN — only orders where this staff is assigned
            };
            extraFilter = { OrderStatus: { [Op.ne]: 'cancelled' } };
            includeCustomer = true;
        } else if (req.user.role === 'admin') {
            includeCustomer = true; // admin gets to see who placed each order
        }

        const features = new ApiFeatures(req.query, extraFilter)
            .filter()
            .sort()
            .pagination();

        const include = [
            {
                model: OrderProduct,
                attributes: ['OrderProductId', 'Quantity'],
                include: [{ model: Product, attributes: ['ProductId', 'ProductName', 'UnitPrice'] }],
            },
            orderServiceInclude,
        ];

        if (includeCustomer) {
            include.unshift({ model: Customer, attributes: ['CustomerId', 'CustomerName'] });
        }

        const { count, rows } = await Order.findAndCountAll({
            ...features.options,
            distinct: true,
            include,
            attributes: { exclude: ['CustomerId'] }
        });

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
 * getOrder
 * Get a order by id 
 * GET /api/v1/orders/:id
 */
const getOrder = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        const orderId = req.params.id;
        let where = { OrderId: orderId };

        // if logged user is staff
        if (req.user.role === 'staff') {
            where = { ...where, OrderStatus: { [Op.ne]: 'cancelled' } };
        }

        const include = [
            {
                model: Customer, attributes: ['CustomerId', 'CustomerName', 'CustomerEmail', 'CustomerAddress', 'PhoneNumber']
            },
            {
                model: OrderProduct,
                attributes: ['OrderProductId', 'Quantity'],
                include: [{ model: Product, attributes: ['ProductId', 'ProductName', 'UnitPrice'] }],
            },
            {
                model: OrderService,
                attributes: ['OrderServiceId', 'ServiceStatus'],
                include: [
                    { model: Service, attributes: ['ServiceId', 'ServiceName', 'ServiceFee'] },
                    { model: Staff, attributes: ['StaffId', 'StaffName', 'StaffEmail'] },
                ],
            },
        ];

        const order = await Order.findOne({
            where,
            include,
            attributes: { exclude: ['CustomerId'] }
        });

        if (!order) return next(new AppError(404, 'No order found with that ID'));


        if (req.user.role === 'customer' && order.Customer.CustomerId !== req.user.id) return next(new AppError(403, 'Customer can only get his orders'));

        if (req.user.role === 'staff') {
            let isBelong = false;
            order.OrderServices.forEach((os => {
                if (os.Staff?.StaffId === req.user.id) isBelong = true
            }))

            if (!isBelong) return next(new AppError(403, 'Staff can only get orders, he or she assigned'));
        }

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: order
        })
    }
)

/**
 * updateOrder
 * Update a order by id (only customer)
 * PATCH /api/v1/orders/:id
 */
const updateOrder = async (req, res, next) => {
    try {
        // Replace line items inside a transaction
        const t = await sequelize.transaction();

        // find product
        const order = await Order.findByPk(req.params.id, { transaction: t });

        if (!order) return next(new AppError(404, 'No order found with that ID'));

        if (order.OrderStatus !== 'pending') return next(new AppError(400, 'Only pending order can update'));

        if (order.CustomerId !== req.user.id) return next(new AppError(403, 'Customer can only update his orders'));

        // Validate body — identical to createOrder
        if (!req.body) return next(new AppError(400, 'Invalid request body'));

        const { products = [], services = [] } = req.body;

        if (products.length === 0 && services.length === 0) {
            return next(new AppError(400, 'An order must include at least one product or service.'));
        }

        const validationErr = validateOrderInput(products, services);
        if (validationErr.length > 0) return next(new AppError(400, validationErr.join(', ')));

        // Re-validate products exist
        const productIds = products.map(p => p.ProductId);
        const dbProducts = productIds.length > 0
            ? await Product.findAll({ where: { ProductId: { [Op.in]: productIds }, IsDeleted: false }, transaction: t })
            : [];

        const dbProductIds = dbProducts.map(p => p.ProductId);
        const missingProducts = productIds.filter(id => !dbProductIds.includes(id));
        if (missingProducts.length > 0) {
            return next(new AppError(400, `Product(s) not found: ${missingProducts.join(', ')}`));
        }

        // Auto-attach Delivery service if the order has any products
        let finalServices = [...services];
        const deliveryService = await Service.findOne({
            where: { ServiceName: 'Delivery' },
            attributes: ['ServiceId'],
            transaction: t,
        });

        if (dbProducts.length > 0 && deliveryService) {
            const alreadyIncluded = finalServices.some(s => s.ServiceId === deliveryService.ServiceId);
            if (!alreadyIncluded) {
                finalServices.push({ ServiceId: deliveryService.ServiceId });
            }
        }

        // Re-validate services exist
        const serviceIds = finalServices.map(s => s.ServiceId);
        const dbServices = serviceIds.length > 0
            ? await Service.findAll({ where: { ServiceId: { [Op.in]: serviceIds }, IsDeleted: false }, transaction: t })
            : [];

        const dbServiceIds = dbServices.map(s => s.ServiceId);
        const missingServices = serviceIds.filter(id => !dbServiceIds.includes(id));
        if (missingServices.length > 0) {
            return next(new AppError(400, `Service(s) not found: ${missingServices.join(', ')}`));
        }

        // Recalculate TotalCost from scratch — never trust old TotalCost or client input
        let totalCost = 0;
        products.forEach(p => {
            const dbProduct = dbProducts.find(dp => dp.ProductId === p.ProductId);
            totalCost += dbProduct.UnitPrice * p.Quantity;
        });
        dbServices.forEach(s => {
            totalCost += s.ServiceFee;
        });

        // Wipe old line items for this order
        await OrderProduct.destroy({ where: { OrderId: order.OrderId }, transaction: t });
        await OrderService.destroy({ where: { OrderId: order.OrderId }, transaction: t });

        // Insert the new ones
        if (products.length > 0) {
            const orderProductRows = products.map(p => ({
                OrderId: order.OrderId,
                ProductId: p.ProductId,
                Quantity: p.Quantity,
            }));
            await OrderProduct.bulkCreate(orderProductRows, { transaction: t });
        }

        if (finalServices.length > 0) {
            const orderServiceRows = finalServices.map(s => ({
                OrderId: order.OrderId,
                ServiceId: s.ServiceId,
                StaffId: null,
            }));
            await OrderService.bulkCreate(orderServiceRows, { transaction: t });
        }

        // Update the order's TotalCost
        await order.update({ TotalCost: totalCost }, { transaction: t });

        await t.commit();

        // Send response
        res.status(200).json({
            success: true,
            message: 'Update successfully'
        })
    } catch (err) {
        await t.rollback();
        next(err);
    }
}

/**
 * deleteOrder
 * delete a order by id (admin,customer)
 * must pass CancellationReason in request body as json
 * DELETE /api/v1/orders/:id
 */
const deleteOrder = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find order
        const order = await Order.findByPk(req.params.id);
        if (!order) return next(new AppError(404, 'Order is not found'));
        if (order.OrderStatus === 'cancelled') return next(new AppError(400, 'Order is already cancelled'));

        if (req.user.role === 'customer') {
            if (order.OrderStatus !== 'pending') return next(new AppError(400, 'Customer can only cancelled the order when it is pending'));

            if (order.CustomerId !== req.user.id) return next(new AppError(403, 'Customer can only cancel his orders'));
        }

        if (req.user.role === 'admin') {
            if (order.OrderStatus === 'completed') return next(new AppError(400, 'Admin can only cancelled the order when it is not completed'));
        }

        if (!req.body) return next(new AppError(400, 'Invalid request body'));
        const { CancellationReason } = req.body;
        if (!CancellationReason) return next(new AppError(400, 'CancellationReason is required'));

        // execute query
        order.OrderStatus = 'cancelled';
        order.CancellationReason = CancellationReason;
        await order.save();

        // Send response
        res.status(204).send()
    }
)

/**
 * reopenOrder
 * reopen a order by id (admin)
 * DELETE /api/v1/orders/:id
 */
const reopenOrder = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        const orderId = req.params.id;
        let where = { OrderId: orderId };
        const include = [
            {
                model: OrderService,
                attributes: ['OrderServiceId', 'ServiceStatus'],
            },
        ];

        // find order
        const order = await Order.findOne({
            where,
            include
        });
        if (!order) return next(new AppError(404, 'Order is not found'));
        if (order.OrderStatus !== 'cancelled') return next(new AppError(400, 'Order is not cancelled'));

        // Find the status of order
        let isProgress = false;
        order.OrderServices.forEach(os => {
            if (os.ServiceStatus === 'in-progress') {
                isProgress = true;
            }
        })

        // set order status
        order.OrderStatus = isProgress
            ? 'in-progress'
            : 'pending'

        // execute query
        await order.save()

        // Send response
        res.status(200).json({
            success: true,
            data: order
        });
    }
)

module.exports = { createOrder, getAllOrder, getOrder, updateOrder, deleteOrder, reopenOrder }