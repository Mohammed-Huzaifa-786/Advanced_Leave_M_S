const router = require("express").Router();
const { Leave, Attendance, Student } = require("../models");
const auth = require("../middleware/authMiddleware");

// Admin only: attendance report
router.get("/attendance", auth, auth.authorize("admin"), async (req, res) => {
  try {
    const a = await Attendance.findAll({
      include: [{ model: Student, as: "student", attributes: ["id", "name", "className", "department"] }],
      order: [["year", "DESC"], ["month", "DESC"], ["day", "DESC"]],
    });
    return res.json(a);
  } catch (err) {
    console.error("Report attendance error:", err);
    return res.status(500).json({ message: "Failed to load attendance report" });
  }
});

// Admin only: leaves report
router.get("/leaves", auth, auth.authorize("admin"), async (req, res) => {
  try {
    const l = await Leave.findAll({
      include: [{ model: Student, as: "student", attributes: ["id", "name", "className", "department"] }],
      order: [["createdAt", "DESC"]],
    });
    return res.json(l);
  } catch (err) {
    console.error("Report leaves error:", err);
    return res.status(500).json({ message: "Failed to load leaves report" });
  }
});

module.exports = router;