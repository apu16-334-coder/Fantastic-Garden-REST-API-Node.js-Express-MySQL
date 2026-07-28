const router = require('express').Router();
const {createStaff, getAllStaff, deleteStaff, reactivateStaff, getStaff} = require("../controllers/staff.controller");

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


// Admin-only: get a staff
// Admin-only: delete a staff
// GET /api/v1/staffs/:id      → get a staff by id
// DELETE /api/v1/staffs/:id      → delete a staff by id
router.route('/:id')
    .get(restrictTo('admin'), getStaff)
    .delete(restrictTo('admin'), deleteStaff)


// Admin-only: reactivate a staff
// DELETE /api/v1/staffs/:id/reactivate     → reactivate a staff by id
router.patch('/:id/reactivate', reactivateStaff);

module.exports = router

