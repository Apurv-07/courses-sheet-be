const express = require("express");
const { signup, login, googleOAuth } = require("../controllers/authController");
const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google", googleOAuth);

module.exports = router;
