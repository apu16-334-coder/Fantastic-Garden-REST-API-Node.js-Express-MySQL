const { sequelize, Order, OrderProduct, OrderService, Product, Service, Customer, Staff } = require('../models/index.model');
const { Op, where } = require('sequelize');
const catchAsync = require("../utlis/catchAsync.js");

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");
const validateOrderInput = require("../utlis/validateOrderInput.js");

/**
 * assignStaffToService
 * assign staff to service (only admin)
 * PATCH /api/v1/orders/:orderId/services/:orderServiceId/assign
 */
const assignStaffToService = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find order
        const order = await Order.findByPk(req.params.orderId);
        if (!order) return next(new AppError(404, 'Order is not found'));
        if (order.OrderStatus === 'completed' || order.OrderStatus === 'cancelled') return next(new AppError(400, `Order is ${order.OrderStatus}`));

        const orderService = await OrderService.findOne({
            where: {
                OrderServiceId: req.params.orderServiceId,
                OrderId: req.params.orderId
            }
        })
        if(!orderService) return next(new AppError(404, 'OrderService is not found'));
        if(!orderService.ServiceStatus === 'completed') return next(new AppError(404, `OrderService is completed`));

        // checj invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const {StaffId} = req.body;
        if(!StaffId) return next(new AppError(400, 'StaffId is required'));

        const staff = await Staff.findByPk(StaffId);
        if(!staff) return next(new AppError(404, 'Staff is not found'));
        if(!staff.IsActive) return next(new AppError(404, 'Staff is not Active'));

        const t = await sequelize.transaction();
        try {
            if(orderService.ServiceStatus !== 'in-progress') {            
                orderService.ServiceStatus = 'in-progress';
            }
            orderService.StaffId = StaffId;

            orderService.save();

            if(order.OrderStatus !== 'in-progress') {
                order.OrderStatus = 'in-progress';
            }

            order.save();


            await t.commit();

            res.status(200).json({
                success: true,
                data: orderService
            })

        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
)

module.exports = { assignStaffToService }