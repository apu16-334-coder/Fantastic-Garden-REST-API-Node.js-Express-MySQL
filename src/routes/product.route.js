const router = require('express').Router();
const {createProduct} = require("../controllers/product.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new prodcut and get all prodcuts
// POST /api/v1/prodcuts      → create prodcut
// GET /api/v1/products      → get all prodcuts
router.route('/')
    .post(restrictTo('admin'), createProduct)
    // .get(restrictTo('admin'), getAllProdcuts)



module.exports = router

