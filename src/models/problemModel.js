const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    default: "Easy",
  },
  link: { type: String },
  leetcodeLink: { type: String },
  ytLink: { type: String },
});

module.exports = mongoose.model("Problem", problemSchema);
