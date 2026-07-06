const router = require('express').Router();
const {createStaff} = require("../controllers/staff.controller");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new staff
// POST /api/v1/staffs      → create user
router.route('/')
    .post(createStaff)

module.exports = router

