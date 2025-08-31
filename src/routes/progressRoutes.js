const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const progressController = require("../controllers/progressController");

// POST /api/progress/attempt -> save an exercise attempt
router.post("/attempt", requireAuth, progressController.saveExerciseAttempt);

// GET /api/progress -> list user's progress entries
router.get("/", requireAuth, progressController.getUserProgress);

// GET /api/progress/summary -> aggregated summary for dashboard
router.get("/summary", requireAuth, progressController.getProgressSummary);

// Admin: list all submissions
router.get(
  "/all",
  requireAuth,
  requireRole("admin"),
  progressController.getAllSubmissions
);

// Toggle topic completion for current user
router.post(
  "/topic-toggle",
  requireAuth,
  progressController.toggleTopicCompletion
);

module.exports = router;
