const router = require('express').Router();
const { getAllCustomer, getCustomer, getMe } = require("../controllers/customer.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Customer Routes
// ----------------------

// get all Customer (admin only)
// GET /api/v1/customers      → get all Customers
router.route('/')
    .get(restrictTo('admin') ,getAllCustomer)

// get a Customer by id (customer only)
// GET /api/v1/customers/me     → Get Customer himself or hershelf
router.get('/me', restrictTo('customer'), getMe)




// get a Customer by id (admin only)
// GET /api/v1/customers      → get a Customer by id
router.route('/:id')
    .get(restrictTo('admin') ,getCustomer)



module.exports = router

