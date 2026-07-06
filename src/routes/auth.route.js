const router = require('express').Router();
const { signUp, loginCustomer, loginStaff }= require("../controllers/auth.controller")

router.post('/signup', signUp);
router.post('/login/customer', loginCustomer);
router.post('/login/staff', loginStaff);

module.exports = router;