const { Student, Attendance, Timetable, TimetableSlot, Subject, Holiday } = require("../models");
const { Op } = require("sequelize");

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function extractDeptKeywords(dept) {
  if (!dept) return ["CSE"];
  const cleaned = dept.trim();
  const keywords = [];
  const match = cleaned.match(/\b(CSE|ISE|ECE|MECH|CIVIL|AIML|AIDS|DS|IT)\b/i);
  if (match) {
    keywords.push(match[1].toUpperCase());
  }
  keywords.push(cleaned);
  // Also strip prefixes like 'BE (' or 'B.E.'
  const stripped = cleaned.replace(/^(B\.?E\.?|B\.?TECH\.?)\s*\(?|\)?$/gi, "").trim();
  if (stripped) keywords.push(stripped);
  return [...new Set(keywords.filter(Boolean))];
}

/**
 * Calculates Subject-Wise Attendance for a student based on:
 * - Recorded daily attendance in Attendance table
 * - Published Timetable for student's department, semester, and section
 */
async function calculateSubjectAttendance(studentId) {
  const student = await Student.findByPk(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  // 1. Find published timetable applicable to student's department, semester, and section
  // Fallback parsing for semester and section if not explicitly set
  let semester = student.semester;
  let section = student.section;
  if (!semester || !section) {
    const match = (student.className || "").match(/(\d+)\s*([A-Za-z]+)/);
    if (match) {
      if (!semester) semester = parseInt(match[1], 10);
      if (!section) section = match[2].toUpperCase();
    } else {
      const numMatch = (student.className || "").match(/(\d+)/);
      if (numMatch && !semester) semester = parseInt(numMatch[1], 10);
    }
  }
  semester = semester || 7;
  const rawDepartment = student.department || "CSE";
  const deptKeywords = extractDeptKeywords(rawDepartment);
  const deptConditions = deptKeywords.map((k) => ({
    department: { [Op.like]: `%${k}%` },
  }));

  // Match timetable with section first, otherwise fallback to any published timetable for dept & sem
  let timetable = null;
  if (section) {
    timetable = await Timetable.findOne({
      where: {
        [Op.or]: deptConditions,
        semester,
        section,
        status: "published",
      },
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [{ model: Subject, as: "subject" }],
        },
      ],
    });
  }

  // Fallback if section-specific timetable was not found
  if (!timetable) {
    timetable = await Timetable.findOne({
      where: {
        [Op.or]: deptConditions,
        semester,
        status: "published",
      },
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [{ model: Subject, as: "subject" }],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });
  }

  // Collect all unique subjects from timetable or department
  const subjectsMap = {};

  if (timetable && timetable.slots) {
    timetable.slots.forEach((s) => {
      if (s.subject && !subjectsMap[s.subject.id]) {
        subjectsMap[s.subject.id] = {
          id: s.subject.id,
          name: s.subject.name,
          code: s.subject.code,
          isLab: s.subject.isLab,
          weeklyPeriods: s.subject.weeklyPeriods,
          present: 0,
          conducted: 0,
          onLeave: 0,
        };
      }
    });
  }

  // If no timetable found, fallback to subjects in the student's department/sem
  if (Object.keys(subjectsMap).length === 0) {
    const deptSubjects = await Subject.findAll({
      where: {
        [Op.or]: deptConditions,
        semester,
      },
    });
    deptSubjects.forEach((sub) => {
      subjectsMap[sub.id] = {
        id: sub.id,
        name: sub.name,
        code: sub.code,
        isLab: sub.isLab,
        weeklyPeriods: sub.weeklyPeriods,
        present: 0,
        conducted: 0,
        onLeave: 0,
      };
    });
  }

  // 2. Fetch all daily attendance records for this student
  const attendanceRecords = await Attendance.findAll({
    where: { studentId },
    order: [["year", "ASC"], ["month", "ASC"], ["day", "ASC"]],
  });

  // Map each attendance date to the day's scheduled classes
  if (timetable && timetable.slots && timetable.slots.length > 0) {
    attendanceRecords.forEach((att) => {
      const recordDate = new Date(att.year, att.month - 1, att.day);
      const dayOfWeek = DAY_NAMES[recordDate.getDay()];

      // Find slots scheduled on this day
      const daySlots = timetable.slots.filter((s) => s.day === dayOfWeek);

      daySlots.forEach((slot) => {
        if (!slot.subject) return;
        const subId = slot.subject.id;
        if (!subjectsMap[subId]) return;

        const count = slot.duration || 1;

        if (att.status === "present") {
          subjectsMap[subId].conducted += count;
          subjectsMap[subId].present += count;
        } else if (att.status === "absent") {
          subjectsMap[subId].conducted += count;
        } else if (att.status === "on_leave") {
          // Approved leave: tracked as excused, does not penalize conducted attendance percentage
          subjectsMap[subId].onLeave = (subjectsMap[subId].onLeave || 0) + count;
        }
      });
    });
  } else {
    // If no published timetable exists yet, calculate proportional estimate if attendance exists
    const totalDaily = attendanceRecords.length;
    const presentDaily = attendanceRecords.filter((a) => a.status === "present").length;
    const leaveDaily = attendanceRecords.filter((a) => a.status === "on_leave").length;

    Object.values(subjectsMap).forEach((sub) => {
      sub.conducted = totalDaily - leaveDaily;
      sub.present = presentDaily;
      sub.onLeave = leaveDaily;
    });
  }

  // 3. Compute percentages, status, and safe miss / recovery metrics
  const subjectAnalytics = Object.values(subjectsMap).map((sub) => {
    const conducted = sub.conducted;
    const present = sub.present;
    const absent = Math.max(0, conducted - present);
    const onLeave = sub.onLeave || 0;

    const percentage = conducted > 0
      ? parseFloat(((present / conducted) * 100).toFixed(1))
      : 0;

    let status = "SAFE";
    if (conducted > 0) {
      if (percentage >= 75) {
        status = "SAFE";
      } else if (percentage >= 65) {
        status = "WARNING";
      } else {
        status = "DANGER";
      }
    }

    // Safe miss formula:
    // P / (C + m) >= 0.75 => m <= floor((P - 0.75 * C) / 0.75)
    let safeToMiss = 0;
    let classesToRecover = 0;
    let guidance = "";

    if (conducted === 0) {
      guidance = onLeave > 0 ? "All scheduled classes excused by approved leave." : "No classes conducted yet.";
    } else if (percentage >= 75) {
      safeToMiss = Math.max(0, Math.floor((present - 0.75 * conducted) / 0.75));
      guidance = safeToMiss > 0
        ? `You can safely miss ${safeToMiss} class${safeToMiss === 1 ? "" : "es"} without dropping below 75%.`
        : "You are right at the 75% threshold. Missing any upcoming class will push attendance below 75%.";
    } else {
      // (P + r) / (C + r) >= 0.75 => 0.25 * r >= 0.75 * C - P => r >= ceil((0.75 * C - P) / 0.25)
      classesToRecover = Math.max(1, Math.ceil((0.75 * conducted - present) / 0.25));
      guidance = `You are already below the 75% requirement. Attend the next ${classesToRecover} consecutive class${classesToRecover === 1 ? "" : "es"} to recover your attendance.`;
    }

    return {
      subjectId: sub.id,
      name: sub.name,
      code: sub.code,
      isLab: sub.isLab,
      present,
      absent,
      onLeave,
      totalClasses: conducted + onLeave,
      attendancePercentage: percentage,
      status,
      safeToMiss,
      classesToRecover,
      guidance,
    };
  });

  // Overall Attendance Summary
  const totalConducted = subjectAnalytics.reduce((sum, s) => sum + s.totalClasses, 0);
  const totalPresent = subjectAnalytics.reduce((sum, s) => sum + s.present, 0);
  const totalAbsent = subjectAnalytics.reduce((sum, s) => sum + s.absent, 0);
  const totalOnLeave = subjectAnalytics.reduce((sum, s) => sum + (s.onLeave || 0), 0);
  const evaluatedConducted = totalPresent + totalAbsent;
  const overallPercentage = evaluatedConducted > 0
    ? parseFloat(((totalPresent / evaluatedConducted) * 100).toFixed(1))
    : 0;

  return {
    student: {
      id: student.id,
      name: student.name,
      department: student.department,
      semester,
      section: timetable ? timetable.section : (section || "B"),
    },
    hasTimetable: !!timetable,
    timetableId: timetable ? timetable.id : null,
    timetableName: timetable ? timetable.name : null,
    totalSubjects: subjectAnalytics.length,
    overall: {
      present: totalPresent,
      absent: totalAbsent,
      onLeave: totalOnLeave,
      totalConducted,
      percentage: overallPercentage,
      status: overallPercentage >= 75 ? "SAFE" : overallPercentage >= 65 ? "WARNING" : "DANGER",
    },
    subjects: subjectAnalytics,
  };
}

module.exports = {
  calculateSubjectAttendance,
  extractDeptKeywords,
};
