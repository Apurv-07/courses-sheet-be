const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, default: "" }, // Rich text content for the topic
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
  status: {
    type: String,
    enum: ["incomplete", "completed"],
    default: "incomplete",
  },
});

module.exports = mongoose.model("Topic", topicSchema);
