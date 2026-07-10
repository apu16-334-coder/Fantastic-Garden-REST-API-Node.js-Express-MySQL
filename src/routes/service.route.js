const router = require('express').Router();
const {createService} = require("../controllers/service.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Service Routes
// ----------------------

// Admin-only: Create new prodcut 
// get all prodcuts (any logged user)
// POST /api/v1/prodcuts      → create prodcut
// GET /api/v1/products      → get all prodcuts
router.route('/')
    .post(restrictTo('admin'), createService)
//     .get(getAllProducts)


// // GET /api/v1/prodcuts/:id     → get a  prodcut(any logged user)
// // PATCH /api/v1/prodcuts/:id     → update a  prodcut(admin only)
// // DELETE /api/v1/prodcuts/:id     → delete  a  prodcut(admin only)
// router.route("/:id")
//     .get(getProduct)
//     .patch(restrictTo('admin'), updateProduct)
//     .delete(restrictTo('admin'), deleteProduct);

// // PATCH /api/v1/prodcuts/:id     → restore  a  prodcut(admin only)
// router.patch("/:id/restore", restrictTo('admin'), restoreProduct);

module.exports = router

