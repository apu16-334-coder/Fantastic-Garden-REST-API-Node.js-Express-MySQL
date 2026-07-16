const express = require("express");
const router = express.Router({ mergeParams: true }) // ← key line

const {assignStaffToService} = require("../controllers/orderservice.controller")

const {restrictTo} = require("../middleware/auth.middleware");

//  assign staff to service (only admin)
// PATCH /api/v1/orders/:orderId/services/:orderServiceId/assign
router.patch("/:orderServiceId/assign", restrictTo('admin'), assignStaffToService)

module.exports = router;