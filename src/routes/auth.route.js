const router = require('express').Router();
const { signUp, loginCustomer, loginStaff, changePassword }= require("../controllers/auth.controller")

const { protect } = require('../middleware/auth.middleware.js')

// Customer Signup
// POST /api/v1/auth/signup
router.post('/signup', signUp);

// Log in customer
// POST /api/v1/auth/login/customer
router.post('/login/customer', loginCustomer);

// Log in staff
// POST /api/v1/auth/login/staff
router.post('/login/staff', loginStaff);

// change password of existing user
// PATCH /api/v1/auth/change-password
router.patch("/change-password", protect, changePassword)

module.exports = router;