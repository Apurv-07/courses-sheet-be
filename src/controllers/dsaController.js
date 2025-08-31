const Category = require("../models/categoryModel");
const Subject = require("../models/subjectModel");
const User = require("../models/userModel");
const Topic = require("../models/topicModel");
const Problem = require("../models/problemModel");
const CourseAssignment = require("../models/courseAssignmentModel");
const UserProgress = require("../models/userProgressModel");
const UserExerciseProgress = require("../models/userExerciseProgressModel");
// Admin: Get dashboard stats
exports.getAdminDashboard = async (req, res) => {
  try {
    const [userCount, subjectCount] = await Promise.all([
      require("../models/userModel").countDocuments(),
      require("../models/subjectModel").countDocuments(),
    ]);
    res.json({
      success: true,
      data: {
        userCount,
        subjectCount,
        // Add more stats as needed
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Admin: Assign subject to user
exports.assignSubjectToUser = async (req, res) => {
  try {
    const { userId, subjectId } = req.body;
    if (!userId || !subjectId)
      return res
        .status(400)
        .json({ success: false, message: "userId and subjectId required" });
    const assignment = await CourseAssignment.findOneAndUpdate(
      { user: userId, subject: subjectId },
      { user: userId, subject: subjectId },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Remove subject from user
exports.removeSubjectFromUser = async (req, res) => {
  try {
    const { userId, subjectId } = req.body;
    if (!userId || !subjectId)
      return res
        .status(400)
        .json({ success: false, message: "userId and subjectId required" });
    await CourseAssignment.findOneAndDelete({
      user: userId,
      subject: subjectId,
    });
    res.json({ success: true, message: "Assignment removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User: Get dashboard data (assigned subjects, progress, resume info)
exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // Prefer assignedSubjects on User document
    const userDoc = await User.findById(userId)
      .populate({
        path: "assignedSubjects",
        populate: { path: "category", select: "name" },
      })
      .populate({
        path: "currentTopic",
        populate: { path: "subject", select: "name" },
      })
      .lean();
    let subjects = Array.isArray(userDoc?.assignedSubjects)
      ? userDoc.assignedSubjects
      : [];

    // If user.assignedSubjects empty, fallback to CourseAssignment entries
    if (!subjects.length) {
      const assignments = await CourseAssignment.find({
        user: userId,
      }).populate("subject");
      subjects = assignments.map((a) => a.subject).filter(Boolean);
    }

    // Dedupe subjects by _id
    const uniqueSubjectsMap = {};
    subjects.forEach((s) => {
      if (s && s._id) uniqueSubjectsMap[String(s._id)] = s;
    });
    subjects = Object.values(uniqueSubjectsMap);

    // Populate topics for each subject for UI consistency
    const TopicModel = require("../models/topicModel");
    for (const subj of subjects) {
      const rawTopics = await TopicModel.find(
        { subject: subj._id },
        "name content"
      );
      // For each topic, compute per-user completion using UserExerciseProgress
      const enrichedTopics = [];
      for (const t of rawTopics) {
        const problems = await Problem.find({ topic: t._id }).select("_id");
        const problemIds = problems.map((p) => p._id);
        const total = problemIds.length;
        let userCompleted = false;
        if (total > 0) {
          const completedCount = await UserExerciseProgress.countDocuments({
            user: userId,
            exercise: { $in: problemIds },
            status: "completed",
          });
          userCompleted = completedCount >= total;
        }
        enrichedTopics.push({
          ...t.toObject(),
          userCompleted,
          problemCount: total,
        });
      }
      subj.topics = enrichedTopics;
    }

    const subjectIds = subjects.map((s) => s._id);

    // Get legacy per-topic/problem progress entries for these subjects
    const progress = subjectIds.length
      ? await UserProgress.find({ user: userId, subject: { $in: subjectIds } })
      : [];

    // Find last visited (for resume)
    let lastVisited = null;
    if (progress.length > 0) {
      lastVisited = progress.reduce((a, b) =>
        a.lastVisited > b.lastVisited ? a : b
      );
    }

    // Include user's exercise attempts stored in UserExerciseProgress
    const attempts = await UserExerciseProgress.find({ user: userId }).populate(
      { path: "exercise", select: "title link topic" }
    );

    res.json({
      success: true,
      data: {
        subjects,
        subjectIds,
        progress,
        resume: lastVisited,
        attempts,
        currentTopic: userDoc?.currentTopic || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// User: Update progress (mark problem/topic as attempted/completed)
exports.updateUserProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, chapter, topic, problem, status } = req.body;
    if (!subject || (!problem && !topic))
      return res.status(400).json({
        success: false,
        message: "subject and problem/topic required",
      });
    const filter = { user: userId, subject };
    if (problem) filter.problem = problem;
    if (topic) filter.topic = topic;
    const update = { status, lastVisited: new Date() };
    const progress = await UserProgress.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
    });
    res.json({ success: true, data: progress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Category handlers
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    const category = await Category.create({ name });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}, "name");
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name)
      return res
        .status(400)
        .json({ success: false, message: "Name is required" });
    const category = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category)
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    res.json({ success: true, data: category, message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Subject handlers
exports.createSubject = async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category)
      return res
        .status(400)
        .json({ success: false, message: "Name and category are required" });
    const subject = await Subject.create({ name, category });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubjects = async (req, res) => {
  console.log("getSubjects", req.query);
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const subjects = await Subject.find(filter, "name category")
      .populate("category", "name")
      .lean();
    // Populate topics for each subject
    const Topic = require("../models/topicModel");
    for (const subj of subjects) {
      subj.topics = await Topic.find({ subject: subj._id }, "name content");
    }
    res.json({ success: true, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;
    if (!name && !category)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    const update = {};
    if (name) update.name = name;
    if (category) update.category = category;
    const subject = await Subject.findByIdAndUpdate(id, update, { new: true });
    if (!subject)
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    res.json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findByIdAndDelete(id);
    if (!subject)
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    res.json({ success: true, data: subject, message: "Subject deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Topic handlers

// Problem handlers
exports.createProblem = async (req, res) => {
  try {
    const { title, topic, description, difficulty, link } = req.body;
    if (!title || !topic)
      return res
        .status(400)
        .json({ success: false, message: "Title and topic are required" });
    const problem = await Problem.create({
      title,
      topic,
      description,
      difficulty,
      link,
    });
    res.status(201).json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignSubjectToUser = async (req, res) => {
  const { userId, subjectId } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { $addToSet: { assignedSubjects: subjectId } },
    { new: true }
  ).populate("assignedSubjects");
  res.json({ success: true, data: user });
};

exports.removeSubjectFromUser = async (req, res) => {
  const { userId, subjectId } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { assignedSubjects: subjectId } },
    { new: true }
  ).populate("assignedSubjects");
  res.json({ success: true, data: user });
};

exports.getProblems = async (req, res) => {
  try {
    const { topic, subject } = req.query;
    let filter = {};
    if (topic) {
      filter.topic = topic;
    }
    // If subject is provided, filter problems by topics that belong to this subject
    if (subject) {
      // Find all topics for this subject
      const topics = await require("../models/topicModel").find(
        { subject },
        "_id"
      );
      const topicIds = topics.map((t) => t._id);
      filter.topic = { $in: topicIds };
    }
    const problems = await Problem.find(
      filter,
      "title topic description link difficulty"
    ).populate({ path: "topic", select: "name subject" });
    res.json({ success: true, data: problems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, topic, description, difficulty, link } = req.body;
    if (!title && !topic && !description && !difficulty && !link)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    const update = {};
    if (title) update.title = title;
    if (topic) update.topic = topic;
    if (description) update.description = description;
    if (difficulty) update.difficulty = difficulty;
    if (link) update.link = link;
    const problem = await Problem.findByIdAndUpdate(id, update, { new: true });
    if (!problem)
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    res.json({ success: true, data: problem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const problem = await Problem.findByIdAndDelete(id);
    if (!problem)
      return res
        .status(404)
        .json({ success: false, message: "Problem not found" });
    res.json({ success: true, data: problem, message: "Problem deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
