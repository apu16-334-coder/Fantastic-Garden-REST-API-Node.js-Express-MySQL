const router = require('express').Router();
const { createOrder, getAllOrder, getOrder, updateOrder, deleteOrder, reopenOrder } = require("../controllers/order.controller.js");

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
    .get(getAllOrder)


// GET /api/v1/orders/:id   → get a Order by id
// PATCH /api/v1/orders/:id   → update a Order by id(customer if pending)
// DELETE /api/v1/orders/:id   → delete a Order by id(customer and admin)
router.route('/:id')
    .get(getOrder)
    .patch(restrictTo('customer'),updateOrder)
    .delete(restrictTo('customer', 'admin'),deleteOrder)

router.patch('/:id/reopen', restrictTo('admin'), reopenOrder);

module.exports = router

