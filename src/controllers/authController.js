const User = require("../models/userModel");
const jwt = require("../utils/jwt");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.signup = async (req, res) => {
  const { username, email, password } = req.body;
  console.log("Signup request body:", req.body);
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }
    const user = await User.create({ username, email, password });
    const token = jwt.generateToken(user._id);
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  try {
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    const token = jwt.generateToken(user);
    const safeUser = user.toObject ? user.toObject() : { ...user };
    delete safeUser.password;
    res.status(200).json({ user: safeUser, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

exports.googleOAuth = async (req, res) => {
  console.log("Incoming request:", req.method, req.url, req.body);
  console.log("Headers:", req.headers["content-type"]);
  const { idToken } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken, // same variable
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email } = ticket.getPayload();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ username: name, email });
    }
    // Ensure user.role is included in JWT and response
    const jwtToken = jwt.generateToken(user);
    res.status(200).json({ user, token: jwtToken });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
