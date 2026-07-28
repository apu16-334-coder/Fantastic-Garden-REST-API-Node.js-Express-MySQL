const router = require('express').Router();
const {createStaff, getAllStaff, deleteStaff, reactivateStaff, getStaff, getMe, updateStaff, changeUserRole} = require("../controllers/staff.controller");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new staff and get all satffs
// POST /api/v1/staffs      → create user
// GET /api/v1/staffs      → get all staffs
router.route('/')
    .post(restrictTo('admin'), createStaff)
    .get(restrictTo('admin'), getAllStaff)

// get a staff by id (staff, admin)
// GET /api/v1/staffs/me     → Get staff himself or hershelf
router.get('/me', restrictTo('staff', 'admin'), getMe)

// Admin-only: get a staff
// Admin-only: update a staff
// Admin-only: delete a staff
// GET /api/v1/staffs/:id      → get a staff by id
// PATCH /api/v1/staffs/:id      → update a staff by id
// DELETE /api/v1/staffs/:id      → delete a staff by id
router.route('/:id')
    .get(restrictTo('admin'), getStaff)
    .patch(restrictTo('admin'), updateStaff)
    .delete(restrictTo('admin'), deleteStaff)

// Admin-only: reactivate a staff
// DELETE /api/v1/staffs/:id/reactivate     → reactivate a staff by id
router.patch('/:id/reactivate', restrictTo('admin'), reactivateStaff);

// Admin-only: change user role of  a staff or admin
// DELETE /api/v1/staffs/:id/change-role     → change-role of a staff by id
router.patch('/:id/change-role', restrictTo('admin'), changeUserRole);

module.exports = router

