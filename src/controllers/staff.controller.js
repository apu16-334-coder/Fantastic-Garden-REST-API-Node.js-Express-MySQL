const { sequelize, Staff, Order, OrderService } = require('../models/index.model');
const catchAsync = require("../utlis/catchAsync.js");
const generateToken = require("../utlis/generateToken.js")
const { Op, where } = require('sequelize');

const filterBody = require("../utlis/filterBody.js");
const AppError = require("../utlis/AppError.js");
const ApiFeatures = require("../utlis/ApiFeatures.js");

/**
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * createStaff
 * create staff (only admin)
 * POST /api/v1/staffs
 */
const createStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const filtered = filterBody(req.body, 'StaffName', 'StaffEmail', 'Password', 'Role', 'IsActive');

        if (filtered.Password?.length < 8) return next(new AppError(400, 'Password must be atleast 8 characters'));

        // Create record of Customer
        const staff = await Staff.create(filtered);

        //response
        res.status(201).json({
            success: true,
            data: {
                StaffId: staff.StaffId,
                StaffName: staff.StaffName,
                StaffEmail: staff.StaffEmail,
                Role: staff.Role
            }
        })
    }
)

/**
 * getAllStaff
 * get all the staff (only admin)
 * GET /api/v1/staffs
 */
const getAllStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // get api features with options obj
        const features = new ApiFeatures(req.query)
            .filter()
            .search('StaffName', 'StaffEmail')
            .sort()
            .pagination();

        // Execute the query
        const { count, rows } = await Staff.findAndCountAll(features.options);

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
 * getStaff
 * Get a staff by id(only admin)
 * GET /api/v1/staffs/:id
 */
const getStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        console.log(req.params.id)
        console.log(req.user.id)
        // if admin trying get his profile
        if(req.params.id == req.user.id) return next(new AppError(400, 'Use /api/v1/staffs/me route'))

        // find staff
        const staff = await Staff.findByPk(req.params.id);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(404, 'Staff is not active'));

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: staff
        })
    }
)


/**
 * deleteStaff
 * delete a staff (only admin)
 * GET /api/v1/staffs/:id
 */
const deleteStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // Prevent self deactivate through this endpoint
        if (req.user.id === req.params.id) {
            return next(new AppError(403, "Admin cannot delete his own profile"));
        }

        // find user
        const staff = await Staff.findByPk(req.params.id);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(400, 'Staff is already deactivated'));

        const t = await sequelize.transaction();
        try {
            // Deactivate
            staff.IsActive = false;
            await staff.save({ transaction: t });

            // Find affected OrderService rows — unfinished service, unfinished order
            const affectedOrderServices = await OrderService.findAll({
                where: {
                    StaffId: staff.StaffId,
                    ServiceStatus: { [Op.ne]: 'completed' }
                },
                include: [{
                    model: Order,
                    attributes: ['OrderId', 'OrderStatus',],
                    where: { OrderStatus: { [Op.notIn]: ['cancelled', 'completed'] } },
                    required: true,
                }],
                transaction: t,
            });

            const affectedOrderServicesIds = affectedOrderServices.map(el => el.OrderServiceId);
            const affectedOrderIds = [... new Set(affectedOrderServices.map(el => el.OrderId))];

            // Reassign — plain column filter, no join needed here
            await OrderService.update(
                { StaffId: null, ServiceStatus: 'pending' },
                {
                    where: { OrderServiceId: { [Op.in]: affectedOrderServicesIds } },
                    transaction: t,
                }
            )

            // Re-check each affected order fresh
            for (const orderId of affectedOrderIds) {
                const siblings = await OrderService.findAll({
                    where: { OrderId: orderId },
                    transaction: t,
                });

                const hasInProgress = siblings.some(os => os.ServiceStatus === 'in-progress');

                if (!hasInProgress) {
                    await Order.update(
                        { OrderStatus: 'pending' },
                        { where: { OrderId: orderId }, transaction: t }
                    );
                }
            }

            await t.commit();
            res.status(204).send()

        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
)

/**
 * reactivateStaff
 * reactivate a staff (only admin)
 * GET /api/v1/staffs/:id/reactivate
 */
const reactivateStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find user
        const staff = await Staff.findByPk(req.params.id);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (staff.IsActive) return next(new AppError(400, 'Staff is already activated'));

        staff.IsActive = true;

        await staff.save();

        res.status(200).json({
            success: true,
            data: staff
        })
    }
)

module.exports = { createStaff, getAllStaff, deleteStaff, reactivateStaff, getStaff }