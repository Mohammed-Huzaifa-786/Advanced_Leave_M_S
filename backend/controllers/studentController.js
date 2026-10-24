const { User, Student } = require("../models");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// Get all students (Admin only)
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: User, as: "user", attributes: ["id", "username", "role"] }],
      order: [["id", "ASC"]],
    });

    const formatted = students.map((s) => ({
      id: s.id,
      userId: s.userId,
      name: s.name,
      className: s.className,
      department: s.department,
      semester: s.semester || 7,
      section: s.section || "A",
      username: s.user ? s.user.username : "",
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Get all students error:", err);
    return res.status(500).json({ message: "Failed to retrieve students" });
  }
};

// Add student (Admin only - creates User first, then Student)
exports.addStudent = async (req, res) => {
  try {
    const { name, username, department, className, password, semester, section } = req.body;

    if (!name || !username) {
      return res.status(400).json({ message: "Name and username are required" });
    }

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const defaultPassword = password || "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

    // 1. Create User
    const user = await User.create({
      username,
      password: hashedPassword,
      role: "student",
    });

    // 2. Create Student linked by userId
    const student = await Student.create({
      userId: user.id,
      name,
      className: className || "",
      department: department || "",
      semester: semester ? parseInt(semester, 10) : 7,
      section: section || "A",
    });

    return res.status(201).json({
      id: student.id,
      userId: student.userId,
      name: student.name,
      className: student.className,
      department: student.department,
      semester: student.semester,
      section: student.section,
      username: user.username,
      message: "Student added successfully",
    });
  } catch (err) {
    console.error("Add student error:", err);
    return res.status(500).json({ message: "Failed to create student account" });
  }
};

// Get single student (Admin or the student themselves)
exports.getStudentById = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    // IDOR Protection: Student can only view their own profile
    if (req.user.role !== "admin" && req.user.studentId !== targetId) {
      return res.status(403).json({ message: "Forbidden: You can only view your own profile" });
    }

    const student = await Student.findByPk(targetId, {
      include: [{ model: User, as: "user", attributes: ["id", "username", "role"] }],
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({
      id: student.id,
      userId: student.userId,
      name: student.name,
      className: student.className,
      department: student.department,
      semester: student.semester || 7,
      section: student.section || "A",
      username: student.user ? student.user.username : "",
    });
  } catch (err) {
    console.error("Get student error:", err);
    return res.status(500).json({ message: "Failed to load student profile" });
  }
};

// Update student (Admin or the student themselves)
exports.updateStudent = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);

    // IDOR Protection: Student can only update their own profile
    if (req.user.role !== "admin" && req.user.studentId !== targetId) {
      return res.status(403).json({ message: "Forbidden: You can only update your own profile" });
    }

    const student = await Student.findByPk(targetId, {
      include: [{ model: User, as: "user" }],
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const { name, department, className, username, semester, section } = req.body;

    // If username is being changed, verify uniqueness
    if (username && student.user && username !== student.user.username) {
      const existing = await User.findOne({ where: { username } });
      if (existing) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      student.user.username = username;
      await student.user.save();
    }

    if (name !== undefined) student.name = name;
    if (department !== undefined) student.department = department;
    if (className !== undefined) student.className = className;
    if (semester !== undefined) student.semester = parseInt(semester, 10);
    if (section !== undefined) student.section = section;

    await student.save();

    return res.json({
      message: "Student updated successfully",
      student: {
        id: student.id,
        userId: student.userId,
        name: student.name,
        className: student.className,
        department: student.department,
        semester: student.semester,
        section: student.section,
        username: student.user ? student.user.username : "",
      },
    });
  } catch (err) {
    console.error("Update student error:", err);
    return res.status(500).json({ message: "Failed to update student" });
  }
};

// Delete student (Admin only - cascades to User, Student, Leaves, Attendance)
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const userId = student.userId;
    await student.destroy();
    if (userId) {
      await User.destroy({ where: { id: userId } });
    }

    return res.json({ message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete student error:", err);
    return res.status(500).json({ message: "Failed to delete student" });
  }
};

// Reset student password (Admin only)
exports.changePassword = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const password = req.body.password || req.body.newPassword;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const student = await Student.findByPk(targetId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const user = await User.findByPk(student.userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    user.password = hashed;
    await user.save();

    return res.json({ message: "Student password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};

