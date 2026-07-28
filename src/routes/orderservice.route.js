const express = require("express");
const router = express.Router({ mergeParams: true }) // ← key line

const {assignStaffToService, updateOrderServiceStatus} = require("../controllers/orderservice.controller")

const {restrictTo} = require("../middleware/auth.middleware");

//  assign staff to service (only admin)
// PATCH /api/v1/orders/:orderId/services/:orderServiceId/assign
router.patch("/:orderServiceId/assign", restrictTo('admin'), assignStaffToService)

//  change service status in-progress/completed  (only staff)
// PATCH /api/v1/orders/:orderId/services/:orderServiceId/status
router.patch("/:orderServiceId/status", restrictTo('staff'), updateOrderServiceStatus)

module.exports = router;