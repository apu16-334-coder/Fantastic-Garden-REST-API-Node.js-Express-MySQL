const { sequelize, Order, OrderService, Staff } = require('../models/index.model');
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
        if (!orderService) return next(new AppError(404, 'OrderService is not found'));
        if (orderService.ServiceStatus === 'completed') return next(new AppError(404, `OrderService is completed`));

        // checj invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const { StaffId } = req.body;
        if (!StaffId) return next(new AppError(400, 'StaffId is required'));

        const staff = await Staff.findByPk(StaffId);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(404, 'Staff is not Active'));
        
        // Check if staff or not
        if (staff.Role !== 'staff') return next(new AppError(404, 'User is not a staff'));

        const t = await sequelize.transaction();
        try {
            if (orderService.ServiceStatus !== 'in-progress') {
                orderService.ServiceStatus = 'in-progress';
            }
            orderService.StaffId = StaffId;

            await orderService.save({ transaction: t });

            if (order.OrderStatus !== 'in-progress') {
                order.OrderStatus = 'in-progress';
            }

            await order.save({ transaction: t });

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


/**
 * updateOrderServiceStatus
 * change service status in-progress/completed  (only staff)
 * PATCH /api/v1/orders/:orderId/services/:orderServiceId/status
 */
const updateOrderServiceStatus = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find order service
        const orderService = await OrderService.findOne({
            where: {
                OrderServiceId: req.params.orderServiceId,
                OrderId: req.params.orderId
            }
        })
        if (!orderService) return next(new AppError(404, 'OrderService is not found'));

        // check staff authorization
        if (orderService.StaffId !== req.user.id) return next(new AppError(403, 'Staff can only update his or her services'));

        // check invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const { ServiceStatus } = req.body;
        if (!ServiceStatus) return next(new AppError(400, 'ServiceStatus is required'));

        const allowedStatus = ['in-progress', 'completed']
        if (!allowedStatus.includes(ServiceStatus)) return next(new AppError(400, `Only [${allowedStatus}] are allowed`));

        if (ServiceStatus === orderService.ServiceStatus) return next(new AppError(400, `OrderService status is already ${ServiceStatus}`));

        // find order
        const order = await Order.findByPk(req.params.orderId);
        if (!order) return next(new AppError(404, 'Order is not found'));

        const t = await sequelize.transaction();
        try {
            if (ServiceStatus === 'completed') {
                orderService.ServiceStatus = ServiceStatus;
                await orderService.save({ transaction: t });

                // fetch FRESH sibling data — not the stale order.OrderServices array
                const allServices = await OrderService.findAll({
                    where: { OrderId: order.OrderId },
                    transaction: t,
                });

                const isOrderCompleted = allServices.every(os => os.ServiceStatus === 'completed');

                if (isOrderCompleted) {
                    order.OrderStatus = 'completed';
                    await order.save({ transaction: t });
                }
            } else if (ServiceStatus === 'in-progress') {
                orderService.ServiceStatus = ServiceStatus;

                await orderService.save({ transaction: t })

                if (order.OrderStatus === 'completed') order.OrderStatus = 'in-progress';

                await order.save({ transaction: t });
            }

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

module.exports = { assignStaffToService, updateOrderServiceStatus }