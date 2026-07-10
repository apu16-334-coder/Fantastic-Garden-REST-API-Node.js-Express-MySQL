const router = require('express').Router();
const {createProduct, getAllProducts, getProduct, updateProduct} = require("../controllers/product.controller.js");

const {restrictTo} = require("../middleware/auth.middleware");

// ----------------------
// Staff Routes
// ----------------------

// Admin-only: Create new prodcut 
// get all prodcuts (any logged user)
// POST /api/v1/prodcuts      → create prodcut
// GET /api/v1/products      → get all prodcuts
router.route('/')
    .post(restrictTo('admin'), createProduct)
    .get(getAllProducts)

router.route("/:id")
    .get(getProduct)
    .patch(restrictTo('admin'), updateProduct)



module.exports = router

