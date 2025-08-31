const Progress = require("../models/userExerciseProgressModel");
const Problem = require("../models/problemModel");
const Topic = require("../models/topicModel");
const Subject = require("../models/subjectModel");
const CourseAssignment = require("../models/courseAssignmentModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");

exports.saveExerciseAttempt = async (req, res) => {
  const { exerciseId, answer, status } = req.body;
  const userId = req.user._id;
  // validate exercise
  const exercise = await Problem.findById(exerciseId).populate({
    path: "topic",
    select: "name subject",
    populate: {
      path: "subject",
      select: "name category",
      populate: { path: "category", select: "name" },
    },
  });
  if (!exercise)
    return res
      .status(404)
      .json({ success: false, message: "Exercise not found" });
  const progress = await Progress.findOneAndUpdate(
    { user: userId, exercise: exerciseId },
    { answer, status, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  // Return populated document so frontend gets topic/subject/category
  const populated = await Progress.findById(progress._id).populate({
    path: "exercise",
    populate: {
      path: "topic",
      select: "name subject",
      populate: {
        path: "subject",
        select: "name category",
        populate: { path: "category", select: "name" },
      },
    },
  });

  res.json({ success: true, data: populated });
};

exports.getUserProgress = async (req, res) => {
  const userId = req.user._id;
  const progress = await Progress.find({ user: userId }).populate({
    path: "exercise",
    select: "title topic link",
    populate: {
      path: "topic",
      select: "name subject",
      populate: {
        path: "subject",
        select: "name category",
        populate: { path: "category", select: "name" },
      },
    },
  });
  res.json({ success: true, data: progress });
};

// Admin: list all user submissions with related topic/subject/category and user info
exports.getAllSubmissions = async (req, res) => {
  try {
    const {
      user: userParam,
      subject: subjectParam,
      topic: topicParam,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Support filtering by user id OR username/email (case-insensitive)
    if (userParam) {
      if (mongoose.Types.ObjectId.isValid(userParam)) {
        filter.user = userParam;
      } else {
        const matchedUsers = await User.find({
          $or: [
            { username: new RegExp(userParam, "i") },
            { email: new RegExp(userParam, "i") },
          ],
        }).select("_id");
        const userIds = matchedUsers.map((u) => u._id);
        if (userIds.length > 0) filter.user = { $in: userIds };
        else filter.user = null; // will match nothing
      }
    }

    // If topic or subject filters are provided, find matching exercise ids
    let exerciseIds = null;

    if (topicParam) {
      // topicParam can be an id or a name fragment
      if (mongoose.Types.ObjectId.isValid(topicParam)) {
        const probs = await Problem.find({ topic: topicParam }).select("_id");
        exerciseIds = probs.map((p) => p._id);
      } else {
        const matchedTopics = await Topic.find({
          name: new RegExp(topicParam, "i"),
        }).select("_id");
        const topicIds = matchedTopics.map((t) => t._id);
        if (topicIds.length > 0) {
          const probs = await Problem.find({ topic: { $in: topicIds } }).select(
            "_id"
          );
          exerciseIds = probs.map((p) => p._id);
        } else {
          exerciseIds = [];
        }
      }
    } else if (subjectParam) {
      // subjectParam can be an id or a name fragment
      if (mongoose.Types.ObjectId.isValid(subjectParam)) {
        const topics = await Topic.find({ subject: subjectParam }).select(
          "_id"
        );
        const topicIds = topics.map((t) => t._id);
        const probs = await Problem.find({ topic: { $in: topicIds } }).select(
          "_id"
        );
        exerciseIds = probs.map((p) => p._id);
      } else {
        const matchedSubjects = await Subject.find({
          name: new RegExp(subjectParam, "i"),
        }).select("_id");
        const subjectIds = matchedSubjects.map((s) => s._id);
        if (subjectIds.length > 0) {
          const topics = await Topic.find({
            subject: { $in: subjectIds },
          }).select("_id");
          const topicIds = topics.map((t) => t._id);
          if (topicIds.length > 0) {
            const probs = await Problem.find({
              topic: { $in: topicIds },
            }).select("_id");
            exerciseIds = probs.map((p) => p._id);
          } else {
            exerciseIds = [];
          }
        } else {
          exerciseIds = [];
        }
      }
    }

    if (exerciseIds) filter.exercise = { $in: exerciseIds };

    // If filter.user was explicitly set to null (no matches), return empty
    if (filter.user === null) {
      return res.json({
        success: true,
        data: {
          submissions: [],
          pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
        },
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const lim = Math.min(parseInt(limit, 10) || 20, 200); // cap limit
    const skip = (pageNum - 1) * lim;

    const total = await Progress.countDocuments(filter);
    const submissions = await Progress.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(lim)
      .populate({ path: "user", select: "username email" })
      .populate({
        path: "exercise",
        select: "title link topic",
        populate: {
          path: "topic",
          select: "name subject",
          populate: {
            path: "subject",
            select: "name category",
            populate: { path: "category", select: "name" },
          },
        },
      });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: pageNum,
          limit: lim,
          total,
          totalPages: Math.ceil(total / lim),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// New: aggregated summary for dashboard
exports.getProgressSummary = async (req, res) => {
  const userId = req.user._id;
  // Find subjects assigned to the user (either via CourseAssignment or user.assignedSubjects)
  const assignments = await CourseAssignment.find({ user: userId }).populate(
    "subject"
  );
  const subjectIds = assignments.map((a) => a.subject._id);

  // If no assignments, try user.assignedSubjects
  if (!subjectIds.length) {
    const user = await User.findById(userId).populate("assignedSubjects");
    if (user && user.assignedSubjects && user.assignedSubjects.length) {
      user.assignedSubjects.forEach((s) => subjectIds.push(s._id));
    }
  }

  // Build summary per subject
  const subjects = [];
  for (const sid of subjectIds) {
    const subject = await Subject.findById(sid).lean();
    if (!subject) continue;
    // topics under subject
    const topics = await Topic.find({ subject: sid }).lean();
    // problems per topic
    const topicSummaries = [];
    let subjectTotal = 0;
    let subjectCompleted = 0;
    for (const t of topics) {
      const problems = await Problem.find({ topic: t._id }).select("_id");
      const total = problems.length;
      subjectTotal += total;
      // count completed for this user
      const completedCount = await Progress.countDocuments({
        user: userId,
        exercise: { $in: problems.map((p) => p._id) },
        status: "completed",
      });
      subjectCompleted += completedCount;
      const percent = total > 0 ? (completedCount / total) * 100 : 0;
      topicSummaries.push({
        _id: t._id,
        name: t.name,
        percentCompleted: Math.round(percent),
      });
    }
    const subjectPercent =
      subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0;
    subjects.push({
      _id: subject._id,
      name: subject.name,
      percentCompleted: Math.round(subjectPercent),
      topics: topicSummaries,
    });
  }

  res.json({ success: true, data: { subjects } });
};

// Toggle completion for a topic for the current user by using UserExerciseProgress
exports.toggleTopicCompletion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId } = req.body;
    if (!topicId)
      return res
        .status(400)
        .json({ success: false, message: "topicId required" });

    // find all problems for this topic
    const problems = await Problem.find({ topic: topicId }).select("_id");
    const problemIds = problems.map((p) => p._id);
    const total = problemIds.length;

    if (total === 0) {
      return res.json({
        success: true,
        data: {
          topicId,
          completed: false,
          message: "No exercises in topic",
        },
      });
    }

    // count how many are completed already
    const completedCount = await Progress.countDocuments({
      user: userId,
      exercise: { $in: problemIds },
      status: "completed",
    });

    if (completedCount < total) {
      // Mark all as completed (upsert each)
      const ops = problemIds.map((eid) => ({
        updateOne: {
          filter: { user: userId, exercise: eid },
          update: { $set: { status: "completed", updatedAt: new Date() } },
          upsert: true,
        },
      }));
      await Progress.bulkWrite(ops);
      return res.json({ success: true, data: { topicId, completed: true } });
    } else {
      // Unmark: set completed->attempted for those exercises (do not delete answers)
      await Progress.updateMany(
        { user: userId, exercise: { $in: problemIds }, status: "completed" },
        { $set: { status: "attempted", updatedAt: new Date() } }
      );
      return res.json({ success: true, data: { topicId, completed: false } });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
