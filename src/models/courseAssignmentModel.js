const mongoose = require("mongoose");

const courseAssignmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  assignedAt: { type: Date, default: Date.now },
});

courseAssignmentSchema.index({ user: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model("CourseAssignment", courseAssignmentSchema);
