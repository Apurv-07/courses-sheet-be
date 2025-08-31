const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic" },
  problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
  status: {
    type: String,
    enum: ["not_started", "attempted", "completed"],
    default: "not_started",
  },
  lastVisited: { type: Date, default: Date.now },
});

userProgressSchema.index(
  { user: 1, problem: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("UserProgress", userProgressSchema);
