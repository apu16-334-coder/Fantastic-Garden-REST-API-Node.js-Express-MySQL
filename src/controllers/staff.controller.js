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
        // if admin trying get his profile
        if (req.params.id == req.user.id) return next(new AppError(400, 'Use /api/v1/staffs/me route'))

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
 * getMe
 * Get me by id(staff/admin)
 * GET /api/v1/staffs/me
 */
const getMe = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // find staff
        const me = await Staff.findOne({
            where: {
                StaffId: req.user.id
            }
        });

        // Send response meta-data for pagination
        res.status(200).json({
            success: true,
            data: me
        })
    }
)

/**
 * updateStaff
 * Update a staff or admin by id (only admin)
 * PATCH /api/v1/staffs/:id
 */
const updateStaff = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // if admin trying update his profile
        if (req.params.id == req.user.id) return next(new AppError(400, 'Admin can not update his own profile'));

        // find staff
        const staff = await Staff.findByPk(req.params.id);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(404, 'Staff is not active'));

        // Invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        // filtered request body
        const filtered = filterBody(req.body, 'StaffName', 'StaffEmail');

        // If match no fields
        if (Object.keys(filtered).length === 0) return next(new AppError(400, "No valid fields to update"));

        // update
        await Staff.update(
            filtered,
            { where: { StaffId: req.params.id } }
        )

        // Send response
        res.status(200).json({
            success: true,
            message: 'Update successfully'
        })
    }
)

/**
 * deleteStaff
 * delete a staff (only admin)
 * GET /api/v1/staffs/:id
 */
const deleteStaff = async (req, res, next) => {
    try {
        const t = await sequelize.transaction();

        // Prevent self deactivate through this endpoint
        if (req.user.id == req.params.id) {
            return next(new AppError(403, "Admin cannot delete his own profile"));
        }

        // find user
        const staff = await Staff.findByPk(req.params.id, { transaction: t });
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(400, 'Staff is already deactivated'));

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
        next(err);
    }
}


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

/**
 * changeUserRole
 * Admin-only: change user role
 * PATCH /api/v1/staffs/:id/change-role
 */
const changeUserRole = async (req, res, next) => {
    try {
        const t = await sequelize.transaction();

        // if admin trying update his profile
        if (req.params.id == req.user.id) return next(new AppError(400, 'Admin can not change his own role'));

        // find staff
        const staff = await Staff.findByPk(req.params.id, {transaction: t});
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(404, 'Staff is not active'));

        // Invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const { Role } = req.body;
        if (!Role) return next(new AppError(400, 'Role is required'));

        if (staff.Role === Role) return next(new AppError(400, `Role is already ${Role}`));

        if (Role === 'admin') {
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
        }

        staff.Role = Role;
        await staff.save({ transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            data: staff
        })

    } catch (err) {
        await t.rollback();
        next(err);
    }
}

/**
 * resetStaffPassword
 * Admin-only: reset a staff password by id
 * PATCH /api/v1/staffs/:id/reset-password
 */
const resetUserPassword = catchAsync(
    /** @type {RequestHandler} */
    async (req, res, next) => {
        // if admin trying update his profile
        if (req.params.id == req.user.id) return next(new AppError(400, 'Admin can not reset his or her own password'));

        // find staff
        const staff = await Staff.unscoped().findByPk(req.params.id);
        if (!staff) return next(new AppError(404, 'Staff is not found'));
        if (!staff.IsActive) return next(new AppError(404, 'Staff is not active'));

        // Invalid request body
        if (!req.body) return res.status(400).json({ success: false, message: "invalid request body" });

        const { newPassword } = req.body;

        if (!newPassword) return next(new AppError(400, 'newPassword is required'));

        staff.Password = newPassword; // set new plain password
        await staff.save() // triggers pre("save") → hashing + passwordChangedAt

        res.status(200).json({
            success: true,
            message: "Password reset successfully"
        });
    }
)

module.exports = { createStaff, getAllStaff, deleteStaff, reactivateStaff, getStaff, getMe, updateStaff, changeUserRole, resetUserPassword }