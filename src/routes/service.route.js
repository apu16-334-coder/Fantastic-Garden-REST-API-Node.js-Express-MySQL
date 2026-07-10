const router = require('express').Router();
const {createService, getAllServices} = require("../controllers/service.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Service Routes
// ----------------------

// Admin-only: Create new service 
// get all services (any logged user)
// POST /api/v1/services     → create a service
// GET /api/v1/services      → get all services
router.route('/')
    .post(restrictTo('admin'), createService)
    .get(getAllServices)


// // GET /api/v1/servicess/:id     → get a  services(any logged user)
// // PATCH /api/v1/servicess/:id     → update a  services(admin only)
// // DELETE /api/v1/servicess/:id     → delete  a  services(admin only)
// router.route("/:id")
//     .get(getProduct)
//     .patch(restrictTo('admin'), updateProduct)
//     .delete(restrictTo('admin'), deleteProduct);

// // PATCH /api/v1/servicess/:id     → restore  a  services(admin only)
// router.patch("/:id/restore", restrictTo('admin'), restoreProduct);

module.exports = router

