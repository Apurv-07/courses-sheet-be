const express = require("express");
const {
  getProfile,
  getAllUsers,
  updateCurrentTopic,
} = require("../controllers/userController.js");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

// Get all users (admin only)
router.get("/", requireAuth, getAllUsers);

router.get("/profile", requireAuth, getProfile);

// Update user's current topic
router.post("/update-current-topic", requireAuth, updateCurrentTopic);

module.exports = router;
