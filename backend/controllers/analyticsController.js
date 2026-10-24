const { calculateSubjectAttendance } = require("../services/attendanceAnalyticsService");
const { planSmartLeave } = require("../services/smartLeaveService");

// GET /api/analytics/subject-attendance
exports.getSubjectAttendance = async (req, res) => {
  try {
    let studentId;

    if (req.user.role === "student") {
      studentId = req.user.studentId;
      if (!studentId) {
        return res.status(403).json({ message: "Student profile not associated with this user" });
      }
    } else if (req.user.role === "admin") {
      // Admin can inspect any student's analytics
      studentId = req.query.studentId || req.params.studentId;
      if (!studentId) {
        return res.status(400).json({ message: "Student ID required for admin inspection" });
      }
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const data = await calculateSubjectAttendance(parseInt(studentId, 10));
    return res.json(data);
  } catch (err) {
    console.error("Subject attendance analytics error:", err);
    return res.status(500).json({ message: err.message || "Failed to calculate subject attendance" });
  }
};

// POST /api/analytics/smart-leave-plan
exports.getSmartLeavePlan = async (req, res) => {
  try {
    let studentId;

    if (req.user.role === "student") {
      // Strict IDOR Protection: Always derive studentId from JWT
      studentId = req.user.studentId;
      if (!studentId) {
        return res.status(403).json({ message: "Student profile not associated with this account" });
      }
    } else if (req.user.role === "admin") {
      studentId = req.body.studentId;
      if (!studentId) {
        return res.status(400).json({ message: "Student ID required for admin preview" });
      }
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    const { duration, fromDate, toDate } = req.body;

    const plan = await planSmartLeave({
      studentId: parseInt(studentId, 10),
      duration: duration ? parseInt(duration, 10) : 1,
      fromDate,
      toDate,
    });

    return res.json(plan);
  } catch (err) {
    console.error("Smart leave planning error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate smart leave plan" });
  }
};
