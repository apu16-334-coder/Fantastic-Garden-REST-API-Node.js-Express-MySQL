const router = require('express').Router();
const {getAllCustomer} = require("../controllers/customer.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Customer Routes
// ----------------------

// 
// get all Customer (any logged user)
// GET /api/v1/customers      → get all Customers
router.route('/')
    .get(restrictTo('admin') ,getAllCustomer)


module.exports = router

