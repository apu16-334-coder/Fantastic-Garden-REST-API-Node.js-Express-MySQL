const router = require('express').Router();
const { signUp, loginCustomer }= require("../controllers/auth.controller")

router.post('/signup', signUp);
router.post('/login/customer', loginCustomer);

module.exports = router;