const { Attendance, Student, Leave, User } = require("../models");
const { Op } = require("sequelize");

// GET /api/attendance/:studentId/:year/:month
exports.getAttendance = async (req, res) => {
  try {
    const { studentId, year, month } = req.params;
    const targetStudentId = parseInt(studentId, 10);

    // IDOR Protection: Student can only view their own attendance
    if (req.user.role !== "admin" && req.user.studentId !== targetStudentId) {
      return res.status(403).json({ message: "Forbidden: You can only view your own attendance" });
    }

    const rows = await Attendance.findAll({
      where: {
        studentId: targetStudentId,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
      },
      order: [["day", "ASC"]],
    });

    const map = {};
    rows.forEach((r) => {
      map[r.day] = r.status;
    });

    return res.json(map);
  } catch (err) {
    console.error("Attendance get error:", err);
    return res.status(500).json({ message: "Error loading attendance" });
  }
};

// GET /api/attendance/student/:id
exports.getAttendanceForStudent = async (req, res) => {
  try {
    const targetStudentId = parseInt(req.params.id, 10);

    // IDOR Protection: Student can only view their own attendance
    if (req.user.role !== "admin" && req.user.studentId !== targetStudentId) {
      return res.status(403).json({ message: "Forbidden: You can only view your own attendance" });
    }

    const rows = await Attendance.findAll({
      where: { studentId: targetStudentId },
      order: [["year", "ASC"], ["month", "ASC"], ["day", "ASC"]],
    });

    const formatted = rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      year: r.year,
      month: r.month,
      day: r.day,
      date: `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`,
      status: r.status,
    }));

    return res.json(formatted);
  } catch (err) {
    console.error("Attendance for student error:", err);
    return res.status(500).json({ message: "Error loading attendance records" });
  }
};

// GET /api/attendance/class-sheet (Admin only - fetches roster with attendance & approved leaves)
exports.getClassAttendanceSheet = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Only faculty/administrators can view class attendance register" });
    }

    let { date, department, semester, section } = req.query;
    if (!date) {
      const today = new Date();
      date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    // Query students matching department, semester, and section
    const studentWhere = {};
    if (department && department !== "All") {
      studentWhere.department = { [Op.like]: `%${department}%` };
    }
    if (semester && semester !== "All") {
      studentWhere[Op.or] = [
        { semester: parseInt(semester, 10) },
        { className: { [Op.like]: `%${semester}%` } },
      ];
    }
    if (section && section !== "All") {
      studentWhere[Op.and] = studentWhere[Op.and] || [];
      studentWhere[Op.and].push({
        [Op.or]: [
          { section: section },
          { className: { [Op.like]: `%${section}%` } },
        ],
      });
    }

    const students = await Student.findAll({
      where: studentWhere,
      include: [{ model: User, as: "user", attributes: ["username"] }],
      order: [["name", "ASC"]],
    });

    const studentIds = students.map((s) => s.id);

    // Fetch existing attendance records for these students on this date
    const existingAttendance = await Attendance.findAll({
      where: {
        studentId: studentIds,
        year,
        month,
        day,
      },
    });

    const attendanceMap = {};
    existingAttendance.forEach((a) => {
      attendanceMap[a.studentId] = a.status;
    });

    // Check for approved leaves covering this date
    const activeLeaves = await Leave.findAll({
      where: {
        studentId: studentIds,
        status: "approved",
        fromDate: { [Op.lte]: date },
        toDate: { [Op.gte]: date },
      },
    });

    const leaveMap = {};
    activeLeaves.forEach((l) => {
      leaveMap[l.studentId] = {
        leaveType: l.leaveType,
        reason: l.reason,
      };
    });

    // Get current month attendance percentage per student for reference
    const monthlyRecords = await Attendance.findAll({
      where: {
        studentId: studentIds,
        year,
        month,
      },
    });

    const monthlyStats = {};
    monthlyRecords.forEach((m) => {
      if (!monthlyStats[m.studentId]) {
        monthlyStats[m.studentId] = { present: 0, total: 0 };
      }
      if (m.status === "present") monthlyStats[m.studentId].present += 1;
      if (["present", "absent"].includes(m.status)) monthlyStats[m.studentId].total += 1;
    });

    const roster = students.map((s) => {
      const stats = monthlyStats[s.id] || { present: 0, total: 0 };
      const currentPct = stats.total > 0 ? parseFloat(((stats.present / stats.total) * 100).toFixed(1)) : 100;
      const approvedLeave = leaveMap[s.id] || null;
      let status = attendanceMap[s.id] || null;

      // If student has an approved leave and is unmarked, default to 'on_leave'
      if (!status && approvedLeave) {
        status = "on_leave";
      }

      return {
        id: s.id,
        name: s.name,
        username: s.user ? s.user.username : `student_${s.id}`,
        department: s.department,
        className: s.className,
        status, // 'present' | 'absent' | 'on_leave' | null
        hasApprovedLeave: !!approvedLeave,
        leaveDetails: approvedLeave,
        monthlyAttendancePct: currentPct,
      };
    });

    return res.json({
      date,
      year,
      month,
      day,
      department: department || "All",
      semester: semester || "All",
      section: section || "All",
      totalStudents: roster.length,
      markedCount: roster.filter((r) => r.status !== null).length,
      presentCount: roster.filter((r) => r.status === "present").length,
      absentCount: roster.filter((r) => r.status === "absent").length,
      onLeaveCount: roster.filter((r) => r.status === "on_leave").length,
      roster,
    });
  } catch (err) {
    console.error("Get class attendance sheet error:", err);
    return res.status(500).json({ message: "Failed to load class attendance sheet" });
  }
};

// POST /api/attendance/batch-mark (Admin only - bulk save attendance for class roster)
exports.batchMarkAttendance = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Only faculty/administrators can record class attendance" });
    }

    const { date, records } = req.body;
    if (!date || !Array.isArray(records)) {
      return res.status(400).json({ message: "Valid date and records array are required" });
    }

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Future date validation
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (d > today) {
      return res.status(400).json({ message: "Cannot mark attendance for future dates" });
    }

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    let savedCount = 0;
    for (const rec of records) {
      if (!rec.studentId || !rec.status) continue;
      if (!["present", "absent", "on_leave"].includes(rec.status)) continue;

      const studentId = parseInt(rec.studentId, 10);
      try {
        const existing = await Attendance.findOne({
          where: {
            studentId,
            year,
            month,
            day,
          },
        });

        if (existing) {
          existing.status = rec.status;
          await existing.save();
        } else {
          await Attendance.create({
            studentId,
            year,
            month,
            day,
            status: rec.status,
          });
        }
      } catch (upsertErr) {
        if (upsertErr.name === "SequelizeUniqueConstraintError") {
          await Attendance.update(
            { status: rec.status },
            { where: { studentId, year, month, day } }
          );
        } else {
          throw upsertErr;
        }
      }
      savedCount++;
    }

    return res.json({
      success: true,
      message: `Successfully recorded attendance for ${savedCount} student${savedCount === 1 ? "" : "s"} on ${date}.`,
      savedCount,
      date,
    });
  } catch (err) {
    console.error("Batch mark attendance error:", err);
    return res.status(500).json({ message: "Failed to save class attendance" });
  }
};

// POST /api/attendance/mark (Admin only - single student day mark)
exports.markAttendance = async (req, res) => {
  try {
    // Only Admin/Faculty can mark attendance
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: Students cannot mark attendance. Attendance must be recorded by faculty/administrator.",
      });
    }

    let { studentId, date, year, month, day, status } = req.body;
    if (!studentId) {
      return res.status(400).json({ message: "Student ID is required for marking attendance" });
    }

    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) {
        day = d.getDate();
        month = d.getMonth() + 1;
        year = d.getFullYear();
      }
    }

    if (!year || !month || !day || !status) {
      return res.status(400).json({ message: "Date/year/month/day and status (present/absent/on_leave) are required" });
    }

    if (!["present", "absent", "on_leave"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'present', 'absent', or 'on_leave'" });
    }

    // Future date validation
    const targetDate = new Date(year, month - 1, day, 0, 0, 0);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (targetDate > today) {
      return res.status(400).json({ message: "Cannot mark attendance for future dates" });
    }

    year = parseInt(year, 10);
    month = parseInt(month, 10);
    day = parseInt(day, 10);
    const targetStudentId = parseInt(studentId, 10);

    try {
      const existing = await Attendance.findOne({
        where: {
          studentId: targetStudentId,
          year,
          month,
          day,
        },
      });

      if (existing) {
        existing.status = status;
        await existing.save();
      } else {
        await Attendance.create({
          studentId: targetStudentId,
          year,
          month,
          day,
          status,
        });
      }
    } catch (upsertErr) {
      if (upsertErr.name === "SequelizeUniqueConstraintError") {
        await Attendance.update(
          { status },
          { where: { studentId: targetStudentId, year, month, day } }
        );
      } else {
        throw upsertErr;
      }
    }

    return res.json({
      message: "Attendance saved successfully",
      attendance: { studentId: targetStudentId, year, month, day, status },
    });
  } catch (err) {
    console.error("Mark attendance error:", err);
    return res.status(500).json({ message: "Error saving attendance" });
  }
};

