const mongoose = require("mongoose");

const userExerciseProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  exercise: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  answer: { type: String },
  status: {
    type: String,
    enum: ["not_started", "attempted", "completed"],
    default: "not_started",
  },
  updatedAt: { type: Date, default: Date.now },
});

// prevent duplicate entries per user+exercise
userExerciseProgressSchema.index({ user: 1, exercise: 1 }, { unique: true });

module.exports = mongoose.model(
  "UserExerciseProgress",
  userExerciseProgressSchema
);
