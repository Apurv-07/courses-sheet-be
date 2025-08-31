const express = require("express");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  createSubject,
  getSubjects,
  updateSubject,
  deleteSubject,
  // ...existing code...
  createProblem,
  getProblems,
  updateProblem,
  deleteProblem,
  assignSubjectToUser,
  removeSubjectFromUser,
  getUserDashboard,
  updateUserProgress,
  getAdminDashboard,
} = require("../controllers/dsaController");

const router = express.Router(); // ✅ must be declared before usage

// Admin: Dashboard stats
router.get(
  "/admin-dashboard",
  requireAuth,
  requireRole("admin"),
  getAdminDashboard
);

// Admin: Assign/remove subject to/from user
router.post(
  "/assign-subject",
  requireAuth,
  requireRole("admin"),
  assignSubjectToUser
);
router.post(
  "/remove-subject",
  requireAuth,
  requireRole("admin"),
  removeSubjectFromUser
);

// User: Dashboard and progress
router.get("/dashboard", requireAuth, getUserDashboard);
router.post("/progress", requireAuth, updateUserProgress);

// Category routes
router.post("/categories", requireAuth, requireRole("admin"), createCategory);
router.get("/categories", getCategories);
router.put(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  updateCategory
);
router.delete(
  "/categories/:id",
  requireAuth,
  requireRole("admin"),
  deleteCategory
);

// Subject routes
router.post("/subjects", requireAuth, requireRole("admin"), createSubject);
router.get("/subjects", getSubjects);
router.put("/subjects/:id", requireAuth, requireRole("admin"), updateSubject);
router.delete(
  "/subjects/:id",
  requireAuth,
  requireRole("admin"),
  deleteSubject
);

// Problem routes
router.post("/problems", requireAuth, requireRole("admin"), createProblem);
router.get("/problems", getProblems);
router.put("/problems/:id", requireAuth, requireRole("admin"), updateProblem);
router.delete(
  "/problems/:id",
  requireAuth,
  requireRole("admin"),
  deleteProblem
);

module.exports = router;
