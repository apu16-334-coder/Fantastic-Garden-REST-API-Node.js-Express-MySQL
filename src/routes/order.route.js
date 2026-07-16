const router = require('express').Router();
const { createOrder } = require("../controllers/order.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

const orderserviceRouter = require('./orderservice.route.js') // ← import

router.use('/:orderId/services', orderserviceRouter) // ← this is the connection

// ----------------------
// Order Routes
// ----------------------

// customer only: Create new Order 
// get all Orders (any logged user)
// POST /api/v1/orders     → create a Order
// GET /api/v1/orders      → get all Orders
router.route('/')
    .post(restrictTo('customer'), createOrder)

module.exports = router

