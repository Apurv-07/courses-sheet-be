const express = require("express");
const router = express.Router();
const {
  updateTopicWithContent,
  createTopic,
  updateTopic,
  deleteTopic,
  toggleTopicStatus,
  getTopic,
} = require("../controllers/topicController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// Unified endpoint to update topic content, assignments, and problems
router.post("/", requireAuth, requireRole("admin"), createTopic);
router.put(
  "/update-with-content",
  requireAuth,
  requireRole("admin"),
  updateTopicWithContent
);
router.put("/:id", requireAuth, requireRole("admin"), updateTopic);
router.delete("/:id", requireAuth, requireRole("admin"), deleteTopic);
router.post("/toggle-status", requireAuth, toggleTopicStatus);
router.get("/:id", requireAuth, async (req, res, next) => {
  // forward to getTopic controller
  try {
    const controller = require("../controllers/topicController");
    return controller.getTopic(req, res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
