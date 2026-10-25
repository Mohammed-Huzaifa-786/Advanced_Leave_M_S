const path = require("path");
const fs = require("fs");
const { Leave, Student, User, Attendance } = require("../models");

// Safely clean up an uploaded file if leave application fails
const cleanupUploadedFile = async (file) => {
  if (!file || !file.path) return;
  try {
    const uploadDir = path.resolve(__dirname, "..", "uploads", "certificates");
    const filePath = path.resolve(file.path);

    // Robust path containment check using path.relative()
    const rel = path.relative(uploadDir, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel) || rel === "") {
      return;
    }

    // Safety guard: do not delete if file is already linked to an existing leave
    // Fail-safe: if the DB query fails, abort deletion
    if (file.filename) {
      try {
        const existing = await Leave.findOne({ where: { document: file.filename } });
        if (existing) return;
      } catch (dbErr) {
        console.error("Failed to verify database reference for upload cleanup; aborting deletion:", dbErr.message);
        return;
      }
    }

    try {
      await fs.promises.unlink(filePath);
    } catch (unlinkErr) {
      if (unlinkErr.code !== "ENOENT") {
        console.error("Error unlinking uploaded file:", unlinkErr.message);
      }
    }
  } catch (err) {
    console.error("Failed to clean up uploaded file:", err.message);
  }
};

// Apply for leave (Students only - uses token's studentId, saves document attachment)
exports.applyLeave = async (req, res) => {
  let leaveCreated = false;
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    // Use studentId from authenticated user
    let studentId = req.user.studentId;

    // If for any reason studentId is missing in token, look up from DB
    if (!studentId && req.user.role === "student") {
      const student = await Student.findOne({ where: { userId: req.user.id } });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId) {
      await cleanupUploadedFile(req.file);
      return res.status(403).json({ message: "Only registered students can apply for leave" });
    }

    if (!leaveType || !fromDate || !toDate || !reason) {
      await cleanupUploadedFile(req.file);
      return res.status(400).json({ message: "Leave type, from date, to date, and reason are required" });
    }

    if (new Date(fromDate) > new Date(toDate)) {
      await cleanupUploadedFile(req.file);
      return res.status(400).json({ message: "From date cannot be later than to date" });
    }

    const documentName = req.file ? req.file.filename : null;

    const leave = await Leave.create({
      studentId,
      leaveType,
      fromDate,
      toDate,
      reason,
      document: documentName,
      status: "pending",
    });

    leaveCreated = true;

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      leave,
    });
  } catch (error) {
    if (!leaveCreated) {
      await cleanupUploadedFile(req.file);
    }
    console.error("Leave apply error:", error);
    return res.status(500).json({ message: "Failed to submit leave application" });
  }
};

exports.cleanupUploadedFile = cleanupUploadedFile;

// Get all leaves (Admin only - includes student and user details)
exports.getAllLeaves = async (req, res) => {
  try {
    const leaves = await Leave.findAll({
      include: [
        {
          model: Student,
          as: "student",
          attributes: ["id", "name", "className", "department"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["username"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const formatted = leaves.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      student: l.student,
      studentName: l.student ? l.student.name : `Student #${l.studentId}`,
      className: l.student ? l.student.className : "",
      department: l.student ? l.student.department : "",
      username: l.student && l.student.user ? l.student.user.username : "",
      leaveType: l.leaveType,
      fromDate: l.fromDate,
      toDate: l.toDate,
      reason: l.reason,
      document: l.document,
      documentUrl: l.document ? `/uploads/certificates/${l.document}` : null,
      status: l.status,
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Get all leaves error:", error);
    return res.status(500).json({ message: "Failed to retrieve leave applications" });
  }
};

// Get my leaves (Student only - returns only leaves of authenticated student)
exports.getMyLeaves = async (req, res) => {
  try {
    let studentId = req.user.studentId;

    if (!studentId && req.user.role === "student") {
      const student = await Student.findOne({ where: { userId: req.user.id } });
      if (student) studentId = student.id;
    }

    if (!studentId) {
      return res.status(403).json({ message: "Student profile not found" });
    }

    const leaves = await Leave.findAll({
      where: { studentId },
      order: [["createdAt", "DESC"]],
    });

    const formatted = leaves.map((l) => ({
      id: l.id,
      studentId: l.studentId,
      leaveType: l.leaveType,
      fromDate: l.fromDate,
      toDate: l.toDate,
      reason: l.reason,
      document: l.document,
      documentUrl: l.document ? `/uploads/certificates/${l.document}` : null,
      status: l.status,
      createdAt: l.createdAt,
    }));

    return res.json(formatted);
  } catch (error) {
    console.error("Get my leaves error:", error);
    return res.status(500).json({ message: "Failed to retrieve your leave history" });
  }
};

// Approve leave (Admin only)
exports.approveLeave = async (req, res) => {
  try {
    const id = req.params.id;
    if (req.body?.status === "rejected") {
      return exports.rejectLeave(req, res);
    }
    const leave = await Leave.findByPk(id);

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    leave.status = "approved";
    await leave.save();

    // Automatically synchronize approved leave date range with Attendance as 'on_leave'
    try {
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const cur = new Date(start);
        while (cur <= end) {
          const year = cur.getFullYear();
          const month = cur.getMonth() + 1;
          const day = cur.getDate();

          try {
            const existing = await Attendance.findOne({
              where: {
                studentId: leave.studentId,
                year,
                month,
                day,
              },
            });

            if (existing) {
              existing.status = "on_leave";
              await existing.save();
            } else {
              await Attendance.create({
                studentId: leave.studentId,
                year,
                month,
                day,
                status: "on_leave",
              });
            }
          } catch (upsertErr) {
            if (upsertErr.name === "SequelizeUniqueConstraintError") {
              await Attendance.update(
                { status: "on_leave" },
                { where: { studentId: leave.studentId, year, month, day } }
              );
            } else {
              throw upsertErr;
            }
          }

          cur.setDate(cur.getDate() + 1);
        }
      }
    } catch (syncErr) {
      console.error("Error syncing approved leave to attendance:", syncErr);
    }

    return res.json({ message: "Leave application approved and synchronized with attendance records", leave });
  } catch (error) {
    console.error("Approve leave error:", error);
    return res.status(500).json({ message: "Failed to approve leave" });
  }
};

// Reject leave (Admin only)
exports.rejectLeave = async (req, res) => {
  try {
    const id = req.params.id;
    const leave = await Leave.findByPk(id);

    if (!leave) {
      return res.status(404).json({ message: "Leave application not found" });
    }

    leave.status = "rejected";
    await leave.save();

    // Revert any on_leave attendance records in this range for this student
    try {
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const cur = new Date(start);
        while (cur <= end) {
          const year = cur.getFullYear();
          const month = cur.getMonth() + 1;
          const day = cur.getDate();

          const existing = await Attendance.findOne({
            where: {
              studentId: leave.studentId,
              year,
              month,
              day,
              status: "on_leave",
            },
          });

          if (existing) {
            await existing.destroy();
          }

          cur.setDate(cur.getDate() + 1);
        }
      }
    } catch (revertErr) {
      console.error("Error reverting on_leave attendance:", revertErr);
    }

    return res.json({ message: "Leave application rejected", leave });
  } catch (error) {
    console.error("Reject leave error:", error);
    return res.status(500).json({ message: "Failed to reject leave" });
  }
};

