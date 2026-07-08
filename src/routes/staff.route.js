const router = require('express').Router();
const {createStaff, getAllStaff} = require("../controllers/staff.controller");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new staff
// POST /api/v1/staffs      → create user
router.route('/')
    .post(restrictTo('admin'), createStaff)
    .get(restrictTo('admin'), getAllStaff)

module.exports = router

