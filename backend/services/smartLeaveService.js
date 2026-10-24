const { Student, Leave, Holiday, Timetable, TimetableSlot, Subject } = require("../models");
const { calculateSubjectAttendance, extractDeptKeywords } = require("./attendanceAnalyticsService");
const { Op } = require("sequelize");

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Evaluates the attendance impact of taking leave on a specific list of calendar dates.
 */
function evaluateLeaveDatesImpact({ dates, currentSubjectAnalytics, timetableSlots, holidaysList, existingLeavesList }) {
  // Set of holiday date strings YYYY-MM-DD
  const holidaySet = new Set(holidaysList.map((h) => h.date));

  // Set of dates already covered by approved leaves
  const approvedLeaveSet = new Set();
  existingLeavesList.forEach((l) => {
    const start = new Date(l.fromDate + "T00:00:00");
    const end = new Date(l.toDate + "T00:00:00");
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      approvedLeaveSet.add(formatLocalDate(d));
    }
  });

  // Track missed classes per subject across the evaluated dates
  const missedPerSubject = {};
  currentSubjectAnalytics.forEach((s) => {
    missedPerSubject[s.subjectId] = 0;
  });

  const dailyBreakdown = [];
  let totalAcademicDays = 0;
  let totalClassesMissed = 0;

  for (const dateStr of dates) {
    const d = new Date(dateStr + "T00:00:00");
    const dayOfWeek = DAY_NAMES[d.getDay()];

    if (dayOfWeek === "Sunday") {
      dailyBreakdown.push({
        date: dateStr,
        dayOfWeek,
        isAcademicDay: false,
        reason: "Sunday / Weekend (No classes missed)",
        missedClasses: [],
      });
      continue;
    }

    if (holidaySet.has(dateStr)) {
      const holiday = holidaysList.find((h) => h.date === dateStr);
      dailyBreakdown.push({
        date: dateStr,
        dayOfWeek,
        isAcademicDay: false,
        reason: `Official Holiday: ${holiday ? holiday.name : "Holiday"} (No classes missed)`,
        missedClasses: [],
      });
      continue;
    }

    if (approvedLeaveSet.has(dateStr)) {
      dailyBreakdown.push({
        date: dateStr,
        dayOfWeek,
        isAcademicDay: false,
        reason: "Already an Approved Leave date",
        missedClasses: [],
      });
      continue;
    }

    // Working academic day
    totalAcademicDays++;
    const scheduledSlots = timetableSlots.filter((slot) => slot.day === dayOfWeek);
    const dayMissedClasses = [];

    scheduledSlots.forEach((slot) => {
      if (!slot.subject) return;
      const subId = slot.subject.id;
      const periods = slot.duration || 1;
      missedPerSubject[subId] = (missedPerSubject[subId] || 0) + periods;
      totalClassesMissed += periods;

      dayMissedClasses.push({
        subjectId: subId,
        subjectName: slot.subject.name,
        subjectCode: slot.subject.code,
        periodNumber: slot.periodNumber,
        time: `${slot.startTime} - ${slot.endTime}`,
        isLab: slot.isLab,
        periods,
      });
    });

    dailyBreakdown.push({
      date: dateStr,
      dayOfWeek,
      isAcademicDay: true,
      reason: scheduledSlots.length > 0 ? `${scheduledSlots.length} classes scheduled` : "No classes on timetable",
      missedClasses: dayMissedClasses,
    });
  }

  // Calculate projected attendance for each subject
  // Formula: Projected Attendance % = Present / (Conducted + Missed Classes) * 100
  let allSubjectsSafe = true;
  let hasBorderlineSubject = false;
  let hasBreachedSubject = false;
  const subjectImpacts = [];

  for (const s of currentSubjectAnalytics) {
    const missed = missedPerSubject[s.subjectId] || 0;
    const projectedConducted = s.totalClasses + missed;
    const projectedPresent = s.present;

    const projectedPercentage = projectedConducted > 0
      ? parseFloat(((projectedPresent / projectedConducted) * 100).toFixed(1))
      : 0;

    const delta = parseFloat((s.attendancePercentage - projectedPercentage).toFixed(1));

    let subjectStatus = "SAFE";
    let detailWhy = "";

    if (missed === 0) {
      subjectStatus = "SAFE";
      detailWhy = `${s.code}: 0 classes missed on requested date(s) (Holiday / Non-instructional day) → No attendance penalty`;
    } else if (projectedPercentage >= 78) {
      subjectStatus = "SAFE";
      detailWhy = `${s.code}: ${s.attendancePercentage}% → ${projectedPercentage}% after leave (${delta}% drop) → SAFE (comfortably above 75%)`;
    } else if (projectedPercentage >= 75) {
      subjectStatus = "MODERATE";
      hasBorderlineSubject = true;
      detailWhy = `${s.code}: ${s.attendancePercentage}% → ${projectedPercentage}% after leave (${delta}% drop) → MODERATE (borderline safe, close to 75%)`;
    } else {
      subjectStatus = "RISKY";
      hasBreachedSubject = true;
      allSubjectsSafe = false;
      if (s.attendancePercentage < 75) {
        detailWhy = `${s.code}: Currently at ${s.attendancePercentage}% (already below 75%) → drops further to ${projectedPercentage}% → DANGER`;
      } else {
        detailWhy = `${s.code}: ${s.attendancePercentage}% → ${projectedPercentage}% after leave (${delta}% drop) → RISKY (Drops below 75% threshold)`;
      }
    }

    subjectImpacts.push({
      subjectId: s.subjectId,
      name: s.name,
      code: s.code,
      currentPercentage: s.attendancePercentage,
      missedClasses: missed,
      projectedConducted,
      projectedPercentage,
      delta,
      status: subjectStatus,
      why: detailWhy,
    });
  }

  // Overall verdict for this leave scenario
  let overallVerdict = "SAFE";
  let summaryExplanation = "";

  if (totalClassesMissed === 0) {
    overallVerdict = "SAFE";
    summaryExplanation = "Fully safe: Official holiday or non-instructional day. Zero classes will be missed during this period.";
  } else if (hasBreachedSubject) {
    overallVerdict = "RISKY";
    const riskySubs = subjectImpacts.filter((s) => s.status === "RISKY").map((s) => s.code);
    summaryExplanation = `Not recommended: Taking leave on these dates causes ${riskySubs.join(", ")} to drop below the mandatory 75% threshold.`;
  } else if (hasBorderlineSubject) {
    overallVerdict = "MODERATE";
    const modSubs = subjectImpacts.filter((s) => s.status === "MODERATE").map((s) => s.code);
    summaryExplanation = `Acceptable with caution: All subjects stay >= 75%, but ${modSubs.join(", ")} attendance becomes tight.`;
  } else {
    overallVerdict = "SAFE";
    summaryExplanation = "Fully safe: All affected subjects comfortably maintain >= 75% attendance after this leave.";
  }

  return {
    overallVerdict,
    summaryExplanation,
    isSafe: overallVerdict === "SAFE",
    isRisky: overallVerdict === "RISKY",
    totalAcademicDays,
    totalClassesMissed,
    dailyBreakdown,
    subjectImpacts,
  };
}

/**
 * Smart Leave Planner Engine
 * Handles:
 * - Specific date range analysis (fromDate to toDate)
 * - Number of days recommendation search across the upcoming 30 calendar days
 */
async function planSmartLeave({ studentId, duration = 1, fromDate, toDate }) {
  // 1. Fetch current subject analytics
  const analytics = await calculateSubjectAttendance(studentId);
  const currentSubjectAnalytics = analytics.subjects;

  // 2. Fetch student's published timetable
  let timetable = null;
  if (analytics.timetableId) {
    timetable = await Timetable.findByPk(analytics.timetableId, {
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [{ model: Subject, as: "subject" }],
        },
      ],
    });
  }

  if (!timetable) {
    const student = await Student.findByPk(studentId);
    let semester = student ? student.semester : 7;
    let section = student ? student.section : "A";
    if (student && (!semester || !section)) {
      const match = (student.className || "").match(/(\d+)\s*([A-Za-z]+)/);
      if (match) {
        if (!semester) semester = parseInt(match[1], 10);
        if (!section) section = match[2].toUpperCase();
      }
    }
    semester = semester || 7;
    const rawDepartment = (student && student.department) || "CSE";
    const deptKeywords = extractDeptKeywords(rawDepartment);
    const deptConditions = deptKeywords.map((k) => ({
      department: { [Op.like]: `%${k}%` },
    }));

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
  }

  const timetableSlots = timetable ? timetable.slots : [];

  // 3. Fetch official holidays
  const holidays = await Holiday.findAll({
    order: [["date", "ASC"]],
  });

  // 4. Fetch student's approved leaves
  const existingLeaves = await Leave.findAll({
    where: {
      studentId,
      status: "approved",
    },
  });

  // Mode 1: Exact Date Range Analysis
  if (fromDate && toDate) {
    const dates = [];
    const curr = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");

    while (curr <= end) {
      dates.push(formatLocalDate(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const evaluation = evaluateLeaveDatesImpact({
      dates,
      currentSubjectAnalytics,
      timetableSlots,
      holidaysList: holidays,
      existingLeavesList: existingLeaves,
    });

    return {
      mode: "DATE_RANGE",
      fromDate,
      toDate,
      currentOverallAttendance: analytics.overall.percentage,
      ...evaluation,
    };
  }

  // Mode 2: Duration Search & Ranked Date Recommendations
  const leaveDays = Math.max(1, parseInt(duration, 10) || 1);
  const candidateRecommendations = [];

  // Look ahead over next 30 days starting from tomorrow
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);

  const windowSize = leaveDays;
  for (let offset = 0; offset <= 30; offset++) {
    const windowDates = [];
    const windowStart = new Date(startDate);
    windowStart.setDate(windowStart.getDate() + offset);

    // Build consecutive working/calendar window of size windowSize
    let added = 0;
    let scanDay = new Date(windowStart);

    while (added < windowSize && windowDates.length < 14) {
      const dStr = formatLocalDate(scanDay);
      const isSunday = scanDay.getDay() === 0;
      const isHol = holidays.some((h) => h.date === dStr);

      windowDates.push(dStr);
      // Count towards desired leave duration if it's an academic day
      if (!isSunday && !isHol) {
        added++;
      }
      scanDay.setDate(scanDay.getDate() + 1);
    }

    if (added >= windowSize) {
      const evalResult = evaluateLeaveDatesImpact({
        dates: windowDates,
        currentSubjectAnalytics,
        timetableSlots,
        holidaysList: holidays,
        existingLeavesList: existingLeaves,
      });

      const label = windowDates.length === 1
        ? windowDates[0]
        : `${windowDates[0]} to ${windowDates[windowDates.length - 1]}`;

      candidateRecommendations.push({
        label,
        dates: windowDates,
        startDate: windowDates[0],
        endDate: windowDates[windowDates.length - 1],
        verdict: evalResult.overallVerdict,
        isSafe: evalResult.isSafe,
        isRisky: evalResult.isRisky,
        summaryExplanation: evalResult.summaryExplanation,
        totalClassesMissed: evalResult.totalClassesMissed,
        subjectImpacts: evalResult.subjectImpacts,
      });
    }
  }

  // Deduplicate overlapping candidate recommendations
  const uniqueRecommendations = [];
  const seenLabels = new Set();
  for (const cand of candidateRecommendations) {
    if (!seenLabels.has(cand.label)) {
      seenLabels.add(cand.label);
      uniqueRecommendations.push(cand);
    }
  }

  // Sort recommendations: SAFE first, then MODERATE, then RISKY
  uniqueRecommendations.sort((a, b) => {
    const rank = { SAFE: 1, MODERATE: 2, RISKY: 3 };
    return (rank[a.verdict] || 99) - (rank[b.verdict] || 99);
  });

  const safeDates = uniqueRecommendations.filter((r) => r.verdict === "SAFE");
  const moderateDates = uniqueRecommendations.filter((r) => r.verdict === "MODERATE");
  const riskyDates = uniqueRecommendations.filter((r) => r.verdict === "RISKY");

  const hasSafeDate = safeDates.length > 0;
  const noSafeDateMessage = !hasSafeDate
    ? "No fully safe leave dates are currently available while maintaining 75% attendance."
    : null;

  return {
    mode: "RECOMMENDATION",
    duration: leaveDays,
    currentOverallAttendance: analytics.overall.percentage,
    hasSafeDate,
    noSafeDateMessage,
    recommendedDates: safeDates.slice(0, 5),
    alternativeDates: moderateDates.slice(0, 5),
    avoidDates: riskyDates.slice(0, 5),
    allEvaluatedWindows: uniqueRecommendations.slice(0, 15),
    currentSubjectAnalytics,
  };
}

module.exports = {
  planSmartLeave,
};
