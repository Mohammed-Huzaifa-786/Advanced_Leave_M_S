const User = require("../models/User");
const Student = require("../models/Student");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SALT_ROUNDS = 10;

// ------------------- LOGIN -------------------
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user)
      return res.status(400).json({ message: "Invalid username" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET
    );

    let student = null;
    let studentId = null;

    if (user.role === "student") {
      student = await Student.findOne({ where: { userId: user.id } });

      if (!student) {
        return res.status(400).json({ message: "Student profile not found" });
      }

      studentId = student.id;
    }

    return res.json({
      message: "Login successful",
      token,
      role: user.role,
      userId: user.id,
      studentId: studentId,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ------------------- SIGNUP -------------------
exports.signup = async (req, res) => {
  try {
    const { username, password, role, name, className, department } = req.body;

    if (!username || !password || !role)
      return res.status(400).json({ message: "Missing required fields" });

    const existing = await User.findOne({ where: { username } });
    if (existing)
      return res.status(400).json({ message: "Username already taken" });

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      username,
      password: hash,
      role,
    });

    // Create student profile ONLY if role === student
    if (role === "student") {
      await Student.create({
        userId: user.id,
        name: name || username,
        className: className || "",
        department: department || "",
      });
    }

    return res.json({
      message: `${role} account created successfully!`,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Signup failed" });
  }
};

// ------------------- FORGOT PASSWORD -------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    const tempPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    user.password = hash;
    await user.save();

    return res.json({
      message: "Temporary password created",
      tempPassword,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Password reset failed" });
  }
};
