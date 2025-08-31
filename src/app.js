const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

const topicRoutes = require("./routes/topicRoutes");
const authRoutes = require("./routes/authRoutes");
const dsaRoutes = require("./routes/dsaRoutes");
const userRoutes = require("./routes/userRoutes");
const progressRoutes = require("./routes/progressRoutes");

const app = express();

dotenv.config();

app.use(
  cors({
    origin: ["http://localhost:3000", "https://courses-sheet-fe2.vercel.app"], // allow your React app
    credentials: true, // if you ever send cookies
  })
);

// middleware to parse JSON bodies
app.use(express.json());

// if you also expect form data
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", dsaRoutes);
app.use("/api/user", userRoutes);
app.use("/api/topics", topicRoutes);
// progress routes
app.use("/api/progress", progressRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
