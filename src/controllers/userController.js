// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  console.log("Fetching all users...");
  try {
    // Optionally restrict to admin: if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const User = require("../models/userModel");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    console.log("Fetched user profile:", user, req.user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCurrentTopic = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentTopic } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { currentTopic },
      { new: true }
    ).select("-password");
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
