// backend/controllers/attendanceController.js
const Attendance = require("../models/Attendance");
const Student = require("../models/Student"); // one declaration only

// GET /api/attendance/:studentId/:year/:month
exports.getAttendance = async (req, res) => {
  try {
    const { studentId, year, month } = req.params;
    // find all attendance rows for this student/year/month
    const rows = await Attendance.findAll({
      where: { studentId, year: parseInt(year), month: parseInt(month) },
      order: [["day", "ASC"]],
    });

    // return as map: day -> status
    const map = {};
    rows.forEach((r) => (map[r.day] = r.status));
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading attendance" });
  }
};

// GET /api/attendance/student/:id
exports.getAttendanceForStudent = async (req, res) => {
  try {
    const studentId = req.params.id;
    const rows = await Attendance.findAll({
      where: { studentId: parseInt(studentId) },
      order: [["year", "ASC"], ["month", "ASC"], ["day", "ASC"]],
    });
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading attendance for student" });
  }
};

// POST /api/attendance/mark
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, date, status } = req.body;
    if (!studentId || !date || !status) return res.status(400).json({ message: "Missing fields" });

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Invalid date" });

    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();

    // upsert: create or update
    await Attendance.upsert({
      studentId: parseInt(studentId),
      year,
      month,
      day,
      status,
    });

    res.json({ message: "Attendance saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error saving attendance" });
  }
};
