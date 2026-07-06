const router = require('express').Router();
const {createStaff} = require("../controllers/staff.controller");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new staff
// POST /api/v1/staffs      → create user
router.route('/')
    .post(restrictTo('admin'), createStaff)

module.exports = router

