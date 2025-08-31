// Create a new topic
const Topic = require("../models/topicModel");
const Assignment = require("../models/courseAssignmentModel");
const Problem = require("../models/problemModel");

/**
 * Unified controller to update a topic's content, assignments, and problems in one API call.
 * Expects: req.body = { topicId, content, assignments, problems }
 * - assignments: array of assignment objects to upsert
 * - problems: array of problem objects to upsert
 */

exports.createTopic = async (req, res) => {
  try {
    const subject = req.query.subject;
    const { name, content } = req.body;
    if (!name || !subject) {
      return res
        .status(400)
        .json({ success: false, message: "Name and subject are required" });
    }
    const topic = await Topic.create({ name, subject, content });
    res.status(201).json({ success: true, data: topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, content, status } = req.body;
    if (!name && !content && status === undefined)
      return res
        .status(400)
        .json({ success: false, message: "Nothing to update" });
    const update = {};
    if (name) update.name = name;
    if (content !== undefined) update.content = content;
    if (status !== undefined) update.status = status;
    const topic = await Topic.findByIdAndUpdate(id, update, { new: true });
    if (!topic)
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    res.json({ success: true, data: topic });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await Topic.findByIdAndDelete(id);
    if (!topic)
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    res.json({ success: true, data: topic, message: "Topic deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTopicWithContent = async (req, res) => {
  const session = await Topic.startSession();
  session.startTransaction();
  try {
    const { topicId, content, assignments, problems } = req.body;
    // Update topic content
    const topic = await Topic.findByIdAndUpdate(
      topicId,
      { content },
      { new: true, session }
    );
    // Upsert assignments (replace all for this topic)
    if (Array.isArray(assignments)) {
      await Assignment.deleteMany({ topic: topicId }, { session });
      if (assignments.length > 0) {
        await Assignment.insertMany(
          assignments.map((a) => ({ ...a, topic: topicId })),
          { session }
        );
      }
    }
    // Upsert problems (replace all for this topic)
    if (Array.isArray(problems)) {
      await Problem.deleteMany({ topic: topicId }, { session });
      if (problems.length > 0) {
        await Problem.insertMany(
          problems.map((p) => ({ ...p, topic: topicId })),
          { session }
        );
      }
    }
    await session.commitTransaction();
    session.endSession();
    res.json({ success: true, topic });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

// New endpoint to toggle a topic's completion status (user action)
exports.toggleTopicStatus = async (req, res) => {
  try {
    const { topicId } = req.body;
    const topic = await Topic.findById(topicId);
    if (!topic)
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });
    topic.status = topic.status === "completed" ? "incomplete" : "completed";
    await topic.save();
    res.json({ success: true, data: topic });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await Topic.findById(id).populate({
      path: "subject",
      select: "name category",
    });
    if (!topic)
      return res
        .status(404)
        .json({ success: false, message: "Topic not found" });

    // get problems for topic
    const problems = await Problem.find({ topic: id }).select(
      "title description link leetcodeLink ytLink difficulty"
    );

    // if user authenticated, compute user's progress for each problem and topic completion
    let userProgressMap = {};
    let userCompleted = false;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const jwt = require("jsonwebtoken");
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id || decoded._id;
        const userAttempts =
          await require("../models/userExerciseProgressModel")
            .find({
              user: userId,
              exercise: { $in: problems.map((p) => p._id) },
            })
            .lean();
        userAttempts.forEach((a) => {
          userProgressMap[String(a.exercise)] = a;
        });
        const completedCount = userAttempts.filter(
          (a) => a.status === "completed"
        ).length;
        userCompleted =
          problems.length > 0 && completedCount >= problems.length;
      } catch (err) {
        // ignore auth errors and return topic without user-specific data
      }
    }

    // merge progress into problems
    const problemsWithProgress = problems.map((p) => {
      const prog = userProgressMap[String(p._id)] || null;
      return { ...p.toObject(), userProgress: prog };
    });

    res.json({
      success: true,
      data: {
        topic,
        problems: problemsWithProgress,
        userCompleted,
        problemCount: problems.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
