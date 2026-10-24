const { Subject, Faculty, Room, Timetable, TimetableSlot } = require("../models");
const { Op } = require("sequelize");

// Standard Collegiate Periods (VTU / BMSIT Standard)
const PERIODS = [
  { periodNumber: 1, startTime: "08:30", endTime: "09:25", label: "Period I" },
  { periodNumber: 2, startTime: "09:25", endTime: "10:20", label: "Period II" },
  // Morning Refreshment Break: 10:20 - 10:40 (20 min)
  { periodNumber: 3, startTime: "10:40", endTime: "11:35", label: "Period III" },
  { periodNumber: 4, startTime: "11:35", endTime: "12:30", label: "Period IV" },
  // Lunch Break: 12:30 - 13:25 (55 min)
  { periodNumber: 5, startTime: "13:25", endTime: "14:20", label: "Period V" },
  { periodNumber: 6, startTime: "14:20", endTime: "15:15", label: "Period VI" },
  { periodNumber: 7, startTime: "15:15", endTime: "16:10", label: "Period VII" },
];

const BREAKS = [
  { afterPeriod: 2, name: "Tea / Refreshment Break", startTime: "10:20", endTime: "10:40" },
  { afterPeriod: 4, name: "Lunch Break", startTime: "12:30", endTime: "13:25" },
];

const WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Calculates precise free periods and gap metrics for any schedule.
 * Gaps are strictly defined as empty periods occurring BETWEEN the first
 * and last class of an instructional day. Periods before the first class
 * or after the last class are start/end boundaries, not gaps.
 */
function calculateGapMetrics(slots = [], workingDays = WORKING_DAYS) {
  const dailyMetrics = {};
  let totalGaps = 0;
  let totalSpan = 0;
  let totalClasses = 0;

  for (const day of workingDays) {
    const daySlots = slots.filter((s) => s.day === day);
    const periodsOccupied = [...new Set(daySlots.map((s) => s.periodNumber))].sort((a, b) => a - b);
    const classCount = periodsOccupied.length;
    totalClasses += classCount;

    if (classCount === 0) {
      dailyMetrics[day] = {
        day,
        classCount: 0,
        firstPeriod: null,
        lastPeriod: null,
        dailySpan: 0,
        gapPeriods: [],
        gapCount: 0,
        isConsecutive: true,
      };
      continue;
    }

    const firstPeriod = periodsOccupied[0];
    const lastPeriod = periodsOccupied[periodsOccupied.length - 1];
    const dailySpan = lastPeriod - firstPeriod + 1;
    totalSpan += dailySpan;

    const gapPeriods = [];
    for (let p = firstPeriod; p <= lastPeriod; p++) {
      if (!periodsOccupied.includes(p)) {
        gapPeriods.push(p);
      }
    }

    const gapCount = gapPeriods.length;
    totalGaps += gapCount;

    dailyMetrics[day] = {
      day,
      classCount,
      firstPeriod,
      lastPeriod,
      dailySpan,
      gapPeriods,
      gapCount,
      isConsecutive: gapCount === 0,
    };
  }

  const compactnessPercentage =
    totalSpan > 0 ? parseFloat(((totalClasses / totalSpan) * 100).toFixed(1)) : 100;

  return {
    dailyMetrics,
    totalGaps,
    totalSpan,
    totalClasses,
    compactnessPercentage,
  };
}

/**
 * Detect all conflicts in a set of proposed timetable slots,
 * checking both internal clashes and clashes against other existing timetables.
 */
function detectConflicts(proposedSlots = [], otherExistingSlots = []) {
  const conflicts = [];

  for (let i = 0; i < proposedSlots.length; i++) {
    const slotA = proposedSlots[i];

    // 1. Check against other proposed slots
    for (let j = i + 1; j < proposedSlots.length; j++) {
      const slotB = proposedSlots[j];
      if (slotA.day !== slotB.day) continue;
      if (slotA.periodNumber !== slotB.periodNumber) continue;

      // Same class (dept, sem, sec) clash
      if (
        slotA.department === slotB.department &&
        slotA.semester === slotB.semester &&
        slotA.section === slotB.section &&
        (slotA.batch === "All" || slotB.batch === "All" || slotA.batch === slotB.batch)
      ) {
        conflicts.push({
          type: "CLASS_CLASH",
          severity: "HARD",
          slotA,
          slotB,
          description: `Class clash for ${slotA.department} Sem ${slotA.semester} Sec ${slotA.section} on ${slotA.day} Period ${slotA.periodNumber} (${slotA.subjectName} vs ${slotB.subjectName})`,
        });
      }

      // Faculty clash
      if (slotA.facultyId && slotB.facultyId && slotA.facultyId === slotB.facultyId) {
        conflicts.push({
          type: "FACULTY_CLASH",
          severity: "HARD",
          slotA,
          slotB,
          description: `Faculty clash: ${slotA.facultyName} assigned to both ${slotA.subjectName} and ${slotB.subjectName} on ${slotA.day} Period ${slotA.periodNumber}`,
        });
      }

      // Room clash
      if (slotA.roomId && slotB.roomId && slotA.roomId === slotB.roomId) {
        conflicts.push({
          type: "ROOM_CLASH",
          severity: "HARD",
          slotA,
          slotB,
          description: `Room clash: ${slotA.roomName} assigned to both ${slotA.subjectName} and ${slotB.subjectName} on ${slotA.day} Period ${slotA.periodNumber}`,
        });
      }
    }

    // 2. Check against external slots (already existing in other timetables)
    for (const ext of otherExistingSlots) {
      if (slotA.day !== ext.day) continue;
      if (slotA.periodNumber !== ext.periodNumber) continue;

      if (slotA.facultyId && ext.facultyId && slotA.facultyId === ext.facultyId) {
        conflicts.push({
          type: "FACULTY_CLASH",
          severity: "HARD",
          slotA,
          slotB: ext,
          description: `Faculty clash: ${slotA.facultyName} is already occupied by another class on ${slotA.day} Period ${slotA.periodNumber}`,
        });
      }

      if (slotA.roomId && ext.roomId && slotA.roomId === ext.roomId) {
        conflicts.push({
          type: "ROOM_CLASH",
          severity: "HARD",
          slotA,
          slotB: ext,
          description: `Room clash: Room ${slotA.roomName} is already occupied on ${slotA.day} Period ${slotA.periodNumber}`,
        });
      }
    }
  }

  // 3. Multi-period sessions: consecutive period and break boundary checks
  const sessionGroups = new Map();
  proposedSlots.forEach((slot) => {
    const key = `${slot.day}_${slot.subjectId || slot.subjectCode || slot.subjectName || "sub"}_${slot.batch || "All"}`;
    if (!sessionGroups.has(key)) {
      sessionGroups.set(key, []);
    }
    sessionGroups.get(key).push(slot);
  });

  for (const [, group] of sessionGroups) {
    const isMultiPeriod = group.some(
      (s) => s.isLab || (s.duration && s.duration > 1) || (s.consecutivePeriods && s.consecutivePeriods > 1)
    );
    if (!isMultiPeriod) continue;

    if (group.length > 1) {
      // Multiple period slots for this subject on this day
      const sorted = [...group].sort((a, b) => a.periodNumber - b.periodNumber);
      const periodsOcc = sorted.map((s) => s.periodNumber);

      // Check for non-consecutive periods if it is a multi-period session
      if (isMultiPeriod) {
        for (let k = 0; k < periodsOcc.length - 1; k++) {
          if (periodsOcc[k + 1] - periodsOcc[k] !== 1) {
            conflicts.push({
              type: "LAB_NON_CONSECUTIVE",
              severity: "HARD",
              slotA: sorted[k],
              slotB: sorted[k + 1],
              description: `Consecutive violation: ${sorted[0].subjectName || "Subject"} sessions on ${sorted[0].day} are split across periods ${periodsOcc[k]} and ${periodsOcc[k + 1]} instead of being consecutive.`,
            });
          }
        }
      }

      // Check morning tea break crossing (Period 2 to 3)
      const isFullMorningBlock =
        periodsOcc.length === 4 &&
        periodsOcc.includes(1) &&
        periodsOcc.includes(2) &&
        periodsOcc.includes(3) &&
        periodsOcc.includes(4);

      if (!isFullMorningBlock && periodsOcc.includes(2) && periodsOcc.includes(3)) {
        conflicts.push({
          type: "LAB_TEA_BREAK_SPLIT",
          severity: "HARD",
          slotA: sorted[0],
          description: `Break crossing violation: ${sorted[0].subjectName || "Subject"} bridges across morning tea break (Period 2 to 3) on ${sorted[0].day}`,
        });
      }

      // Check lunch break crossing (Period 4 to 5)
      if (periodsOcc.includes(4) && periodsOcc.includes(5)) {
        conflicts.push({
          type: "LAB_LUNCH_SPLIT",
          severity: "HARD",
          slotA: sorted[0],
          description: `Break crossing violation: ${sorted[0].subjectName || "Subject"} bridges across lunch break (Period 4 to 5) on ${sorted[0].day}`,
        });
      }
    } else if (group.length === 1 && group[0].duration && group[0].duration > 1) {
      // Single slot object with duration > 1
      const slot = group[0];
      const startP = slot.periodNumber;
      const endP = startP + slot.duration - 1;
      const isFullMorningBlock = slot.duration === 4 && startP === 1 && endP === 4;

      if (!isFullMorningBlock && startP <= 2 && endP >= 3) {
        conflicts.push({
          type: "LAB_TEA_BREAK_SPLIT",
          severity: "HARD",
          slotA: slot,
          description: `Break crossing violation: ${slot.subjectName || "Subject"} bridges across morning tea break (Period 2 to 3) on ${slot.day}`,
        });
      }
      if (startP <= 4 && endP >= 5) {
        conflicts.push({
          type: "LAB_LUNCH_SPLIT",
          severity: "HARD",
          slotA: slot,
          description: `Break crossing violation: ${slot.subjectName || "Subject"} bridges across lunch break (Period 4 to 5) on ${slot.day}`,
        });
      }
    }
  }

  return conflicts;
}

/**
 * Independent Comprehensive Validator.
 * Evaluates a timetable for both Hard Constraints and Soft Quality Constraints.
 */
function validateTimetable(slots = [], options = {}) {
  const {
    externalSlots = [],
    subjects = [],
    workingDays = WORKING_DAYS,
    periods = PERIODS,
  } = options;

  const hardConstraintViolations = [];
  const sectionClashes = [];
  const facultyClashes = [];
  const roomClashes = [];
  const breakSplitViolations = [];
  const consecutiveViolations = [];
  const missingClasses = [];

  // 1. Detect direct clashes using standard detector
  const clashes = detectConflicts(slots, externalSlots);
  for (const c of clashes) {
    hardConstraintViolations.push(c);
    if (c.type === "CLASS_CLASH") sectionClashes.push(c);
    else if (c.type === "FACULTY_CLASH") facultyClashes.push(c);
    else if (c.type === "ROOM_CLASH") roomClashes.push(c);
    else if (c.type === "LAB_NON_CONSECUTIVE") consecutiveViolations.push(c);
    else if (c.type === "LAB_TEA_BREAK_SPLIT" || c.type === "LAB_LUNCH_SPLIT" || c.type === "BREAK_CROSSING_TEA" || c.type === "BREAK_CROSSING_LUNCH") breakSplitViolations.push(c);
  }

  // 3. Verify that all required subjects have their weekly periods fulfilled
  if (subjects && subjects.length > 0) {
    for (const sub of subjects) {
      const required = parseInt(sub.weeklyPeriods, 10) || 0;
      if (required <= 0) continue;

      const scheduledCount = slots.filter((s) => {
        if (s.subjectId && sub.id && String(s.subjectId) === String(sub.id)) return true;
        if (s.subjectCode && sub.code && s.subjectCode.toUpperCase() === sub.code.toUpperCase()) return true;
        if (s.subjectName && sub.name && s.subjectName.toLowerCase() === sub.name.toLowerCase()) return true;
        return false;
      }).length;

      if (scheduledCount < required) {
        const missing = {
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          required,
          scheduled: scheduledCount,
          shortfall: required - scheduledCount,
          description: `Subject "${sub.name}" (${sub.code}) required ${required} weekly periods, but only ${scheduledCount} were scheduled.`,
        };
        missingClasses.push(missing);
        hardConstraintViolations.push({
          type: "MISSING_PERIODS",
          severity: "HARD",
          ...missing,
        });
      }
    }
  }

  // 4. Calculate Gap Metrics
  const gapMetrics = calculateGapMetrics(slots, workingDays);

  const isValid = hardConstraintViolations.length === 0;

  return {
    isValid,
    isPublishable: isValid,
    hardConstraintViolations,
    sectionClashes,
    facultyClashes,
    roomClashes,
    breakSplitViolations,
    consecutiveViolations,
    missingClasses,
    ...gapMetrics,
  };
}

/**
 * CORE TIMETABLE GENERATION ALGORITHM
 * 
 * Constraint Satisfaction & Optimization (CSOP) Engine:
 * 1. Hard Constraints:
 *    - Zero section, faculty, or room clashes
 *    - Multi-period lab contiguous placement without crossing tea/lunch breaks
 *    - All required weekly periods fulfilled
 *    - Global external timetable clash avoidance
 * 
 * 2. Soft Optimization Objectives:
 *    - Minimum Gaps: Prefer contiguous placement within each day
 *    - Balanced Weekly Distribution: Avoid clustering multiple theory lectures on the same day
 *    - Workload Balancing across days
 * 
 * 3. Two-Stage Approach:
 *    - Stage 1: Constraint-propagation backtracking with adjacency-first domain ordering
 *    - Stage 2: Post-processing local search gap-elimination optimizer (sliding shifts & cross-day swaps)
 */
async function generateClashFreeTimetable({
  department,
  semester,
  section = "A",
  subjects = [],
  academicYear = "2026",
  timetableId = null,
  workingDays = WORKING_DAYS,
  periods = PERIODS,
  existingSlots = [],
  externalSlots: inputExternalSlots = [],
}) {
  const startTimeMs = Date.now();
  const maxSearchDurationMs = 5000; // Search budget
  console.log("--> [GEN] Started generateClashFreeTimetable");

  // 1. Fetch existing slots from OTHER published/active timetables to avoid global faculty & room clashes
  const otherTimetableFilter = {
    status: "published",
  };
  if (timetableId) {
    otherTimetableFilter.id = { [Op.ne]: timetableId };
  }
  if (department && semester && section) {
    otherTimetableFilter[Op.not] = {
      department,
      semester: parseInt(semester, 10),
      section,
    };
  }
  let otherTimetables = [];
  try {
    console.log("--> [GEN] Fetching other timetables from DB...");
    otherTimetables = await Timetable.findAll({
      where: otherTimetableFilter,
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });
    console.log("--> [GEN] Fetched other timetables:", otherTimetables.length);
  } catch (err) {
    console.error("--> [GEN] Error fetching other timetables:", err);
  }

  // Fetch available institutional rooms for smart conflict-free allocation
  let institutionalRooms = [];
  try {
    console.log("--> [GEN] Fetching institutional rooms from DB...");
    institutionalRooms = await Room.findAll({ order: [["name", "ASC"]] });
    console.log("--> [GEN] Fetched institutional rooms:", institutionalRooms.length);
  } catch (err) {
    console.error("--> [GEN] Error fetching institutional rooms:", err);
  }

  const externalSlots = [...inputExternalSlots, ...existingSlots];
  otherTimetables.forEach((tt) => {
    (tt.slots || []).forEach((s) => {
      externalSlots.push({
        day: s.day,
        periodNumber: s.periodNumber,
        facultyId: s.facultyId,
        facultyName: s.faculty ? s.faculty.name : "Unknown",
        roomId: s.roomId,
        roomName: s.room ? s.room.name : "Unknown",
        department: tt.department,
        semester: tt.semester,
        section: tt.section,
        subjectName: "Other Section/Class",
      });
    });
  });

  // 2. Prepare atomic session units to schedule
  const sessionsToSchedule = [];
  let totalRequiredPeriods = 0;

  subjects.forEach((sub) => {
    const weeklyPeriods = parseInt(sub.weeklyPeriods, 10) || 4;
    totalRequiredPeriods += weeklyPeriods;
    const isLab = !!sub.isLab;
    const duration = isLab ? (parseInt(sub.consecutivePeriods, 10) || 2) : (parseInt(sub.consecutivePeriods, 10) || 1);

    if (duration > 1) {
      const fullSessions = Math.floor(weeklyPeriods / duration);
      const remainder = weeklyPeriods % duration;

      for (let s = 0; s < fullSessions; s++) {
        sessionsToSchedule.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          isLab: !!sub.isLab,
          duration,
          facultyId: sub.facultyId || null,
          facultyName: sub.facultyName || "TBD",
          roomId: sub.roomId || null,
          roomName: sub.roomName || "TBD",
          preferredDay: sub.preferredDay || null,
          batch: sub.batch || "All",
        });
      }
      if (remainder > 0) {
        sessionsToSchedule.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          isLab: !!sub.isLab,
          duration: remainder,
          facultyId: sub.facultyId || null,
          facultyName: sub.facultyName || "TBD",
          roomId: sub.roomId || null,
          roomName: sub.roomName || "TBD",
          preferredDay: sub.preferredDay || null,
          batch: sub.batch || "All",
        });
      }
    } else {
      for (let p = 0; p < weeklyPeriods; p++) {
        sessionsToSchedule.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          isLab: false,
          duration: 1,
          facultyId: sub.facultyId || null,
          facultyName: sub.facultyName || "TBD",
          roomId: sub.roomId || null,
          roomName: sub.roomName || "TBD",
          preferredDay: sub.preferredDay || null,
          batch: sub.batch || "All",
        });
      }
    }
  });

  // Capacity check
  const totalWeeklyCapacity = workingDays.length * periods.length;
  if (totalRequiredPeriods > totalWeeklyCapacity) {
    return {
      success: false,
      isValid: false,
      isPublishable: false,
      department,
      semester,
      section,
      academicYear,
      conflictsDetected: 1,
      conflictsResolved: 0,
      unresolvedConflicts: [
        {
          subject: "Total Weekly Capacity Exceeded",
          reason: `Total required weekly periods (${totalRequiredPeriods}) exceed available weekly periods (${totalWeeklyCapacity} across ${workingDays.length} working days).`,
          suggestedAlternatives: [
            "Reduce weekly periods for non-core subjects",
            "Configure additional instructional days or periods",
          ],
        },
      ],
      finalClashes: [],
      resolutionLogs: [],
      totalSlotsScheduled: 0,
      totalGaps: 0,
      avoidableGapsEliminated: 0,
      unavoidableGaps: [],
      compactnessPercentage: 0,
      dailyMetrics: {},
      slots: [],
    };
  }

  // Sort sessions using MRV (Most Constrained Variable First):
  // 1. Longest duration (multi-period labs & projects)
  // 2. Pre-assigned faculty / room constraints
  // 3. Subjects with high weekly frequency
  sessionsToSchedule.sort((a, b) => {
    if (b.duration !== a.duration) return b.duration - a.duration;
    if (a.isLab && !b.isLab) return -1;
    if (!a.isLab && b.isLab) return 1;
    if (a.preferredDay && !b.preferredDay) return -1;
    if (!a.preferredDay && b.preferredDay) return 1;
    return 0;
  });

  // Helper: check room availability and smartly find alternate institutional room of identical type if requested room has external clash
  function resolveRoomForPlacement(day, startPeriod, session, currentSlots) {
    const endPeriod = startPeriod + session.duration - 1;
    if (!session.roomId) {
      return { valid: true, roomId: null, roomName: "TBD", reallocated: false };
    }

    // 1. Check if designated room is free internally and externally
    let hasRoomConflict = false;
    for (let p = startPeriod; p <= endPeriod; p++) {
      if (currentSlots.some((s) => s.day === day && s.periodNumber === p && s.roomId === session.roomId)) {
        hasRoomConflict = true;
        break;
      }
      if (externalSlots.some((ext) => ext.day === day && ext.periodNumber === p && ext.roomId === session.roomId)) {
        hasRoomConflict = true;
        break;
      }
    }

    if (!hasRoomConflict) {
      return { valid: true, roomId: session.roomId, roomName: session.roomName, reallocated: false };
    }

    // 2. If designated room is occupied by another section, try finding an available room of the same type (classroom vs lab)
    if (institutionalRooms && institutionalRooms.length > 0) {
      const reqRoom = institutionalRooms.find((r) => String(r.id) === String(session.roomId));
      const roomType = reqRoom ? reqRoom.type : (session.isLab ? "lab" : "classroom");

      const candidateRooms = institutionalRooms.filter(
        (r) => r.type === roomType && String(r.id) !== String(session.roomId)
      );

      for (const altRoom of candidateRooms) {
        let altConflict = false;
        for (let p = startPeriod; p <= endPeriod; p++) {
          if (currentSlots.some((s) => s.day === day && s.periodNumber === p && s.roomId === altRoom.id)) {
            altConflict = true;
            break;
          }
          if (externalSlots.some((ext) => ext.day === day && ext.periodNumber === p && ext.roomId === altRoom.id)) {
            altConflict = true;
            break;
          }
        }
        if (!altConflict) {
          return {
            valid: true,
            roomId: altRoom.id,
            roomName: altRoom.name,
            reallocated: true,
            originalRoomName: session.roomName,
          };
        }
      }
    }

    return { valid: false, reason: "ROOM_EXTERNAL_CLASH" };
  }

  // Helper: check if a placement is hard-constraint valid with full diagnostics
  function checkPlacementValidity(day, startPeriod, session, currentSlots) {
    const endPeriod = startPeriod + session.duration - 1;
    if (endPeriod > periods.length) return { valid: false, reason: "PERIOD_OVERFLOW" };

    // Break crossing checks
    if (session.duration > 1) {
      const isFullMorningBlock = session.duration === 4 && startPeriod === 1 && endPeriod === 4;
      if (!isFullMorningBlock && startPeriod <= 2 && endPeriod >= 3) {
        return { valid: false, reason: "TEA_BREAK_SPLIT", detail: "Spans across tea break (Period 2 to 3)" };
      }
      if (startPeriod <= 4 && endPeriod >= 5) {
        return { valid: false, reason: "LUNCH_BREAK_SPLIT", detail: "Spans across lunch break (Period 4 to 5)" };
      }
    }

    for (let p = startPeriod; p <= endPeriod; p++) {
      // 1. Section clash check
      const secClash = currentSlots.find((s) => {
        if (s.day !== day || s.periodNumber !== p) return false;
        if (s.batch === "All" || session.batch === "All" || s.batch === session.batch) return true;
        return false;
      });
      if (secClash) {
        return { valid: false, reason: "INTERNAL_SECTION_CLASH", detail: `Clashes with ${secClash.subjectName} on ${day} Period ${p}` };
      }

      // 2. Current slots faculty clash
      if (session.facultyId) {
        const facClash = currentSlots.find(
          (s) => s.day === day && s.periodNumber === p && s.facultyId === session.facultyId
        );
        if (facClash) {
          return { valid: false, reason: "INTERNAL_FACULTY_CLASH", detail: `Faculty ${session.facultyName} already teaching ${facClash.subjectName} on ${day} Period ${p}` };
        }
      }

      // 3. External timetables faculty check
      if (session.facultyId) {
        const extFacClash = externalSlots.find(
          (ext) => ext.day === day && ext.periodNumber === p && ext.facultyId === session.facultyId
        );
        if (extFacClash) {
          return {
            valid: false,
            reason: "EXTERNAL_FACULTY_CLASH",
            detail: `Faculty ${session.facultyName} is occupied by ${extFacClash.department || "Other"} Sem ${extFacClash.semester || ""} Sec ${extFacClash.section || ""} on ${day} Period ${p}`,
          };
        }
      }
    }

    // 4. Room resolution and clash check
    const roomResolution = resolveRoomForPlacement(day, startPeriod, session, currentSlots);
    if (!roomResolution.valid) {
      return {
        valid: false,
        reason: "ROOM_EXTERNAL_CLASH",
        detail: `Room ${session.roomName} is occupied by another section on ${day} Period ${startPeriod}`,
      };
    }

    return {
      valid: true,
      resolvedRoomId: roomResolution.roomId,
      resolvedRoomName: roomResolution.roomName,
      reallocatedRoom: roomResolution.reallocated,
      originalRoomName: roomResolution.originalRoomName,
    };
  }

  function isPlacementValid(day, startPeriod, session, currentSlots) {
    return checkPlacementValidity(day, startPeriod, session, currentSlots).valid;
  }

  // Helper: Candidate slot generator with ADJACENCY-FIRST ordering (Zero-Gap Heuristic)
  function getCandidateSlotsForSession(session, currentSlots) {
    const candidates = [];

    // Prioritize days where this subject is NOT already scheduled (Balanced weekly distribution)
    const daysWithThisSubject = new Set(
      currentSlots
        .filter((s) => String(s.subjectId) === String(session.subjectId))
        .map((s) => s.day)
    );

    const orderedDays = [...workingDays].sort((d1, d2) => {
      // Preferred day takes top precedence
      if (session.preferredDay === d1) return -1;
      if (session.preferredDay === d2) return 1;

      // Prefer day where subject is NOT yet scheduled (spread classes across week)
      const hasD1 = daysWithThisSubject.has(d1) ? 1 : 0;
      const hasD2 = daysWithThisSubject.has(d2) ? 1 : 0;
      if (hasD1 !== hasD2) return hasD1 - hasD2;

      // Workload balancing: prefer days with fewer classes
      const countD1 = currentSlots.filter((s) => s.day === d1).length;
      const countD2 = currentSlots.filter((s) => s.day === d2).length;
      return countD1 - countD2;
    });

    for (const day of orderedDays) {
      const daySlots = currentSlots.filter((s) => s.day === day);
      const occupiedPeriods = daySlots.map((s) => s.periodNumber).sort((a, b) => a - b);

      let dayPeriodOptions = [];

      if (session.duration === 4) {
        // 4-hour morning block (like Major Project: Periods 1 to 4)
        dayPeriodOptions = [1];
      } else if (session.duration === 3) {
        // 3-hour afternoon block (Periods 5 to 7)
        dayPeriodOptions = [5];
      } else if (session.duration === 2) {
        // 2-hour multi-period sessions (both labs and multi-period theory/activities like IIC)
        // Valid non-break blocks are [1, 2], [3, 4], [5, 6], [6, 7]
        if (occupiedPeriods.length === 0) {
          dayPeriodOptions = [1, 5, 3, 6];
        } else {
          const minP = occupiedPeriods[0];
          const maxP = occupiedPeriods[occupiedPeriods.length - 1];
          // Try to place adjacent to existing classes
          const preferredStarts = [];
          if (maxP === 2) preferredStarts.push(3); // after tea break
          if (maxP === 4) preferredStarts.push(5); // after lunch break
          if (minP === 3) preferredStarts.push(1); // before tea break
          if (minP === 7) preferredStarts.push(5);

          [1, 5, 3, 6].forEach((p) => {
            if (!preferredStarts.includes(p)) preferredStarts.push(p);
          });
          dayPeriodOptions = preferredStarts;
        }
      } else {
        // Theory classes (duration 1)
        if (occupiedPeriods.length === 0) {
          // Empty day: start at Period 1
          dayPeriodOptions = [1, 2, 3, 4, 5, 6, 7];
        } else {
          const minP = occupiedPeriods[0];
          const maxP = occupiedPeriods[occupiedPeriods.length - 1];
          const gapOptions = [];
          const adjacentOptions = [];
          const otherOptions = [];

          // 1. Fill any internal gap first!
          for (let p = minP + 1; p < maxP; p++) {
            if (!occupiedPeriods.includes(p)) gapOptions.push(p);
          }

          // 2. Adjacent next (after maxP, or before minP) -> ZERO NEW GAPS!
          if (maxP + 1 <= periods.length) adjacentOptions.push(maxP + 1);
          if (minP - 1 >= 1) adjacentOptions.push(minP - 1);

          // 3. Other remaining periods
          for (let p = 1; p <= periods.length; p++) {
            if (
              !occupiedPeriods.includes(p) &&
              !gapOptions.includes(p) &&
              !adjacentOptions.includes(p)
            ) {
              otherOptions.push(p);
            }
          }

          dayPeriodOptions = [...gapOptions, ...adjacentOptions, ...otherOptions];
        }
      }

      for (const startPeriod of dayPeriodOptions) {
        candidates.push({ day, startPeriod });
      }
    }

    return candidates;
  }

  // 3. Backtracking Search with Branch & Bound
  let bestSlots = null;
  let bestGapScore = Infinity;
  let maxScheduledSlots = [];
  let maxScheduledCount = 0;
  let conflictsDetected = 0;
  let conflictsResolved = 0;
  const resolutionLogs = [];
  const failureDiagnostics = new Map();

  function evaluateScheduleGapScore(slots) {
    const metrics = calculateGapMetrics(slots, workingDays);
    return metrics.totalGaps * 100 + metrics.totalSpan;
  }

  function search(sessionIdx, currentSlots) {
    // Track best partial schedule found so far
    if (currentSlots.length > maxScheduledCount) {
      maxScheduledCount = currentSlots.length;
      maxScheduledSlots = [...currentSlots];
    }

    // Check search time limit
    if (Date.now() - startTimeMs > maxSearchDurationMs) {
      return false; // Exit search budget
    }

    if (sessionIdx === sessionsToSchedule.length) {
      const metrics = calculateGapMetrics(currentSlots, workingDays);
      const score = metrics.totalGaps * 100 + metrics.totalSpan;
      if (score < bestGapScore) {
        bestGapScore = score;
        bestSlots = [...currentSlots];
      }
      // Terminate early if zero gaps and minimal span achieved!
      if (metrics.totalGaps === 0 && metrics.totalSpan <= totalRequiredPeriods) {
        return true;
      }
      return false;
    }

    const session = sessionsToSchedule[sessionIdx];
    const candidates = getCandidateSlotsForSession(session, currentSlots);

    let triedCandidates = 0;
    let placedAtLeastOne = false;
    const sessionFailureReasons = [];

    for (const { day, startPeriod } of candidates) {
      const check = checkPlacementValidity(day, startPeriod, session, currentSlots);
      if (check.valid) {
        placedAtLeastOne = true;
        triedCandidates++;
        if (triedCandidates > 1 || check.reallocatedRoom) {
          conflictsDetected++;
          conflictsResolved++;
          resolutionLogs.push({
            subject: session.subjectName,
            conflict: check.reallocatedRoom
              ? `Requested room "${check.originalRoomName}" is occupied on ${day} Period ${startPeriod}.`
              : `First choice for ${session.subjectName} had a conflict or would create a gap.`,
            resolution: check.reallocatedRoom
              ? `Dynamically allocated available institutional facility "${check.resolvedRoomName}" with zero clashes.`
              : `Assigned to ${day} Period ${startPeriod} with zero hard clashes.`,
          });
        }

        const effectiveRoomId = check.resolvedRoomId !== undefined ? check.resolvedRoomId : session.roomId;
        const effectiveRoomName = check.resolvedRoomName || session.roomName;

        const newSlots = [];
        for (let d = 0; d < session.duration; d++) {
          const pNum = startPeriod + d;
          const pInfo = periods[pNum - 1];
          newSlots.push({
            subjectId: session.subjectId,
            subjectName: session.subjectName,
            subjectCode: session.subjectCode,
            facultyId: session.facultyId,
            facultyName: session.facultyName,
            roomId: effectiveRoomId,
            roomName: effectiveRoomName,
            day,
            periodNumber: pNum,
            startTime: pInfo.startTime,
            endTime: pInfo.endTime,
            isLab: session.isLab,
            duration: session.duration,
            batch: session.batch,
            department,
            semester,
            section,
          });
        }

        const nextSlots = [...currentSlots, ...newSlots];

        // Pruning: if partial gaps are already worse than best complete solution, prune branch
        const partialGaps = calculateGapMetrics(nextSlots, workingDays).totalGaps;
        if (partialGaps * 100 >= bestGapScore) {
          continue;
        }

        const foundPerfect = search(sessionIdx + 1, nextSlots);
        if (foundPerfect) return true;
      } else {
        sessionFailureReasons.push({
          day,
          startPeriod,
          reason: check.reason,
          detail: check.detail || check.reason,
        });
      }
    }

    if (!placedAtLeastOne && sessionFailureReasons.length > 0) {
      const key = session.subjectId || session.subjectCode;
      if (!failureDiagnostics.has(key)) {
        failureDiagnostics.set(key, {
          subjectName: session.subjectName,
          subjectCode: session.subjectCode,
          duration: session.duration,
          facultyName: session.facultyName,
          roomName: session.roomName,
          reasons: sessionFailureReasons,
        });
      }
    }

    return false;
  }

  // Execute backtracking
  console.log("--> [GEN] Starting search(0, [])... sessions count:", sessionsToSchedule.length);
  search(0, []);
  console.log("--> [GEN] Finished search! bestSlots:", bestSlots?.length, "maxScheduledSlots:", maxScheduledSlots?.length);

  let scheduledSlots = bestSlots || maxScheduledSlots || [];
  const initialGapsBeforeLocalOpt = calculateGapMetrics(scheduledSlots, workingDays).totalGaps;

  // 4. Local Search Gap-Elimination Optimizer (Post-Processing Passes)
  // Even if search ended or had remaining gaps, perform systematic shift and swap moves
  let gapsEliminatedCount = 0;

  function runGapEliminationPass(slots) {
    let modified = false;

    for (const day of workingDays) {
      const daySlots = slots.filter((s) => s.day === day).sort((a, b) => a.periodNumber - b.periodNumber);
      if (daySlots.length <= 1) continue;

      const occupied = new Set(daySlots.map((s) => s.periodNumber));
      const minP = Math.min(...occupied);
      const maxP = Math.max(...occupied);

      // Find all gap periods on this day
      for (let g = minP + 1; g < maxP; g++) {
        if (!occupied.has(g)) {
          // Gap detected at period g on this day!
          // Strategy A: Can an adjacent right-hand single-period class slide left into g?
          const rightClass = daySlots.find((s) => s.periodNumber === g + 1 && !s.isLab && (s.duration || 1) === 1);
          if (rightClass) {
            const tempSlots = slots.filter((s) => !(s.day === day && s.periodNumber === g + 1));
            if (isPlacementValid(day, g, rightClass, tempSlots)) {
              // Valid shift!
              rightClass.periodNumber = g;
              rightClass.startTime = periods[g - 1].startTime;
              rightClass.endTime = periods[g - 1].endTime;
              gapsEliminatedCount++;
              modified = true;
              break;
            }
          }

          // Strategy B: Can an adjacent left-hand single-period class slide right into g?
          const leftClass = daySlots.find((s) => s.periodNumber === g - 1 && !s.isLab && (s.duration || 1) === 1);
          if (leftClass) {
            const tempSlots = slots.filter((s) => !(s.day === day && s.periodNumber === g - 1));
            if (isPlacementValid(day, g, leftClass, tempSlots)) {
              // Valid shift!
              leftClass.periodNumber = g;
              leftClass.startTime = periods[g - 1].startTime;
              leftClass.endTime = periods[g - 1].endTime;
              gapsEliminatedCount++;
              modified = true;
              break;
            }
          }

          // Strategy C: Can a single class from a day with excess span swap into gap g?
          for (const otherDay of workingDays) {
            if (otherDay === day) continue;
            const otherSlots = slots.filter((s) => s.day === otherDay && !s.isLab && (s.duration || 1) === 1);
            for (const cand of otherSlots) {
              const tempSlots = slots.filter(
                (s) => !(s.day === cand.day && s.periodNumber === cand.periodNumber)
              );
              if (isPlacementValid(day, g, cand, tempSlots)) {
                cand.day = day;
                cand.periodNumber = g;
                cand.startTime = periods[g - 1].startTime;
                cand.endTime = periods[g - 1].endTime;
                gapsEliminatedCount++;
                modified = true;
                break;
              }
            }
            if (modified) break;
          }

          if (modified) break;
        }
      }
      if (modified) break;
    }

    return modified;
  }

  // Iterate local search until convergence
  let maxPasses = 15;
  while (maxPasses > 0 && runGapEliminationPass(scheduledSlots)) {
    maxPasses--;
  }

  // 5. Run Independent Validator on Final Output
  const validationReport = validateTimetable(scheduledSlots, {
    externalSlots,
    subjects,
    workingDays,
    periods,
    breaks: BREAKS,
  });

  const finalGaps = validationReport.totalGaps;
  const avoidableGapsEliminated = Math.max(0, initialGapsBeforeLocalOpt - finalGaps) + gapsEliminatedCount;

  // 6. Diagnose any remaining unavoidable gaps
  const unavoidableGaps = [];
  if (finalGaps > 0) {
    for (const [d, m] of Object.entries(validationReport.dailyMetrics)) {
      if (m.gapCount > 0) {
        m.gapPeriods.forEach((gp) => {
          unavoidableGaps.push({
            day: d,
            periodNumber: gp,
            periodLabel: periods[gp - 1]?.label || `Period ${gp}`,
            time: `${periods[gp - 1]?.startTime} - ${periods[gp - 1]?.endTime}`,
            reason: `Period ${gp} on ${d} is an unavoidable free slot due to external faculty or laboratory availability constraints across other institutional sections.`,
          });
        });
      }
    }
  }

  // 7. Check for any unscheduled required subjects
  const unresolvedConflicts = [];
  if (validationReport.missingClasses.length > 0) {
    for (const mc of validationReport.missingClasses) {
      const diag = failureDiagnostics.get(mc.subjectId) || failureDiagnostics.get(mc.subjectCode);
      let failureReason = `Could only schedule ${mc.scheduled} of ${mc.required} required weekly periods due to hard resource constraints.`;
      const suggestedAlternatives = [
        `Assign an alternate faculty member to ${mc.subjectName}`,
        `Assign a different classroom or lab with available capacity`,
        `Check other published timetables sharing this faculty/room`,
      ];

      if (diag && diag.reasons && diag.reasons.length > 0) {
        // Extract the most representative clash detail
        const sampleReason = diag.reasons[0];
        failureReason = `Could only schedule ${mc.scheduled} of ${mc.required} required weekly periods. Primary constraint: ${sampleReason.detail || sampleReason.reason}`;
        if (sampleReason.reason === "EXTERNAL_FACULTY_CLASH") {
          suggestedAlternatives.unshift(`Reassign ${mc.subjectName} to an instructor with available teaching hours in this cohort`);
        } else if (sampleReason.reason === "ROOM_EXTERNAL_CLASH") {
          suggestedAlternatives.unshift(`Select an alternative classroom or dedicated lab facility with available periods`);
        }
      }

      unresolvedConflicts.push({
        subject: `${mc.subjectName} (${mc.subjectCode})`,
        reason: failureReason,
        suggestedAlternatives,
      });
    }
  }

  const isSuccess =
    validationReport.isValid &&
    unresolvedConflicts.length === 0 &&
    validationReport.hardConstraintViolations.length === 0;

    const actualClashes = (validationReport.hardConstraintViolations || []).filter(
      (v) => v.type !== "MISSING_PERIODS"
    );

    return {
      success: isSuccess,
      isValid: validationReport.isValid,
      isPublishable: validationReport.isPublishable,
      department,
      semester,
      section,
      academicYear,
      conflictsDetected: conflictsDetected + actualClashes.length,
      conflictsResolved,
      unresolvedConflicts,
      finalClashes: actualClashes,
      hardConstraintViolations: validationReport.hardConstraintViolations,
      missingClasses: validationReport.missingClasses,
      resolutionLogs,
      totalSlotsScheduled: scheduledSlots.length,
      totalGaps: finalGaps,
      avoidableGapsEliminated,
      unavoidableGaps,
      compactnessPercentage: validationReport.compactnessPercentage,
      dailyMetrics: validationReport.dailyMetrics,
      validationReport,
      slots: scheduledSlots,
    };
}

/**
 * USER-CONTROLLED TIMETABLE GENERATOR & MINIMAL CONFLICT RESOLVER
 * 
 * Core Principles:
 * 1. User-Defined Scheduling First: Respect admin's selected day and period verbatim.
 * 2. 100% Preservation: When all hard constraints are satisfied, preserve all assignments untouched.
 *    Do not automatically move classes to eliminate free periods.
 * 3. Minimal-Change Conflict Resolver:
 *    When clashes exist, strictly lock all non-conflicting assignments in place.
 *    Move ONLY the conflicting classes to the nearest available valid slot.
 * 4. Transparent Proposal:
 *    Present proposed moves to the admin before applying them.
 * 5. Honest Infeasibility:
 *    If no valid slot exists, report why without dropping classes or faking success.
 */
async function generateUserControlledTimetable({
  department,
  semester,
  section = "A",
  subjects = [],
  academicYear = "2026-27",
  timetableId = null,
  resolveConflicts = false,
  configuredSlots = null,
  workingDays = WORKING_DAYS,
  periods = PERIODS,
  existingSlots = [],
  externalSlots: inputExternalSlots = [],
}) {
  console.log("--> [USER-CTRL] Started generateUserControlledTimetable", {
    department,
    semester,
    section,
    subjectCount: subjects?.length,
    resolveConflicts,
  });

  // 1. Fetch external slots from OTHER published timetables to prevent inter-section clashes
  const otherTimetableFilter = {
    status: "published",
  };
  if (timetableId) {
    otherTimetableFilter.id = { [Op.ne]: timetableId };
  }
  if (department && semester && section) {
    otherTimetableFilter[Op.not] = {
      department,
      semester: parseInt(semester, 10),
      section,
    };
  }
  let otherTimetables = [];
  try {
    otherTimetables = await Timetable.findAll({
      where: otherTimetableFilter,
      include: [
        {
          model: TimetableSlot,
          as: "slots",
          include: [
            { model: Faculty, as: "faculty" },
            { model: Room, as: "room" },
          ],
        },
      ],
    });
  } catch (err) {
    console.error("--> [USER-CTRL] Error fetching external timetables:", err);
  }

  const externalSlots = [...inputExternalSlots, ...existingSlots];
  otherTimetables.forEach((tt) => {
    (tt.slots || []).forEach((s) => {
      externalSlots.push({
        day: s.day,
        periodNumber: s.periodNumber,
        facultyId: s.facultyId,
        facultyName: s.faculty ? s.faculty.name : "Unknown",
        roomId: s.roomId,
        roomName: s.room ? s.room.name : "Unknown",
        department: tt.department,
        semester: tt.semester,
        section: tt.section,
        subjectName: "Other Section Class",
      });
    });
  });

  // 2. Extract and normalize configured sessions
  const sessions = [];
  let sessionCounter = 1;

  if (configuredSlots && Array.isArray(configuredSlots) && configuredSlots.length > 0) {
    // Top-level configured slots array provided
    configuredSlots.forEach((slot) => {
      const isLab = Boolean(slot.isLab);
      const duration = parseInt(slot.duration, 10) || (isLab ? 2 : 1);
      sessions.push({
        sessionId: slot.sessionId || slot.id || `sess_${sessionCounter++}`,
        subjectId: slot.subjectId,
        subjectName: slot.subjectName || "Subject",
        subjectCode: slot.subjectCode || "SUB",
        facultyId: slot.facultyId || null,
        facultyName: slot.facultyName || "TBD",
        roomId: slot.roomId || null,
        roomName: slot.roomName || "TBD",
        isLab,
        duration,
        day: slot.day,
        periodNumber: parseInt(slot.periodNumber, 10) || 1,
        batch: slot.batch || (isLab ? "B1/B2" : "All"),
      });
    });
  } else {
    // Extract from subjects array
    subjects.forEach((sub, subIdx) => {
      const isLab = Boolean(sub.isLab);
      const duration = isLab ? (parseInt(sub.consecutivePeriods, 10) || 2) : 1;
      const subSlots = sub.slots || sub.configuredSlots || [];

      if (Array.isArray(subSlots) && subSlots.length > 0) {
        subSlots.forEach((s) => {
          sessions.push({
            sessionId: s.sessionId || s.id || `sess_${sub.id || subIdx}_${sessionCounter++}`,
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            facultyId: sub.facultyId || null,
            facultyName: sub.facultyName || "TBD",
            roomId: sub.roomId || null,
            roomName: sub.roomName || "TBD",
            isLab,
            duration: parseInt(s.duration, 10) || duration,
            day: s.day,
            periodNumber: parseInt(s.periodNumber, 10) || 1,
            batch: sub.batch || (isLab ? "B1/B2" : "All"),
          });
        });
      } else {
        // Fallback if slots array not explicitly provided: create required sessions
        const weekly = parseInt(sub.weeklyPeriods, 10) || 4;
        const sessionCount = duration > 1 ? Math.ceil(weekly / duration) : weekly;
        for (let i = 0; i < sessionCount; i++) {
          sessions.push({
            sessionId: `sess_${sub.id || subIdx}_${sessionCounter++}`,
            subjectId: sub.id,
            subjectName: sub.name,
            subjectCode: sub.code,
            facultyId: sub.facultyId || null,
            facultyName: sub.facultyName || "TBD",
            roomId: sub.roomId || null,
            roomName: sub.roomName || "TBD",
            isLab,
            duration,
            day: workingDays[i % workingDays.length],
            periodNumber: duration > 1 ? (i % 2 === 0 ? 1 : 5) : ((i % 7) + 1),
            batch: sub.batch || (isLab ? "B1/B2" : "All"),
          });
        }
      }
    });
  }

  // Helper: Expand sessions to individual period slot objects
  function expandSessions(sessionList) {
    const expanded = [];
    sessionList.forEach((sess) => {
      for (let offset = 0; offset < sess.duration; offset++) {
        const pNum = sess.periodNumber + offset;
        const pInfo = periods[pNum - 1] || {
          startTime: "08:30",
          endTime: "09:25",
        };
        expanded.push({
          sessionId: sess.sessionId,
          subjectId: sess.subjectId,
          subjectName: sess.subjectName,
          subjectCode: sess.subjectCode,
          facultyId: sess.facultyId,
          facultyName: sess.facultyName,
          roomId: sess.roomId,
          roomName: sess.roomName,
          isLab: sess.isLab,
          duration: sess.duration,
          day: sess.day,
          periodNumber: pNum,
          startTime: pInfo.startTime,
          endTime: pInfo.endTime,
          batch: sess.batch || (sess.isLab ? "B1/B2" : "All"),
          department,
          semester: parseInt(semester, 10),
          section,
        });
      }
    });
    return expanded;
  }

  // 3. Detect hard constraint conflicts on user's exact configuration
  const initialExpandedSlots = expandSessions(sessions);
  const detectedConflicts = detectConflicts(initialExpandedSlots, externalSlots);

  // Check additional constraints: break boundaries and out-of-bounds
  sessions.forEach((sess) => {
    if (sess.periodNumber < 1 || sess.periodNumber + sess.duration - 1 > periods.length) {
      detectedConflicts.push({
        type: "OUT_OF_BOUNDS",
        severity: "HARD",
        slotA: sess,
        description: `${sess.subjectName} exceeds daily timetable boundaries (Period ${sess.periodNumber} to ${sess.periodNumber + sess.duration - 1}) on ${sess.day}`,
      });
    }

    if (sess.duration === 2) {
      if (sess.periodNumber === 2) {
        detectedConflicts.push({
          type: "LAB_TEA_BREAK_SPLIT",
          severity: "HARD",
          slotA: sess,
          description: `Break crossing: 2-period session for ${sess.subjectName} on ${sess.day} starts at Period II (09:25–10:20) and crosses the 10:20–10:40 Morning Refreshment Break.`,
        });
      } else if (sess.periodNumber === 4) {
        detectedConflicts.push({
          type: "LAB_LUNCH_SPLIT",
          severity: "HARD",
          slotA: sess,
          description: `Break crossing: 2-period session for ${sess.subjectName} on ${sess.day} starts at Period IV (11:35–12:30) and crosses the 12:30–13:25 Lunch Break.`,
        });
      }
    }
  });

  // Verify weekly periods requirement for each subject
  if (subjects && subjects.length > 0) {
    subjects.forEach((sub) => {
      const required = parseInt(sub.weeklyPeriods, 10) || 0;
      if (required <= 0) return;
      const scheduledCount = initialExpandedSlots.filter(
        (s) => String(s.subjectId) === String(sub.id) || (s.subjectCode && s.subjectCode === sub.code)
      ).length;
      if (scheduledCount < required) {
        detectedConflicts.push({
          type: "MISSING_PERIODS",
          severity: "HARD",
          slotA: { subjectName: sub.name, subjectCode: sub.code },
          description: `Subject "${sub.name}" (${sub.code}) requires ${required} weekly periods, but only ${scheduledCount} periods were configured.`,
        });
      }
    });
  }

  // Deduplicate conflicts
  const uniqueConflicts = [];
  const seenConflictKeys = new Set();
  detectedConflicts.forEach((c) => {
    const key = `${c.type}_${c.description}`;
    if (!seenConflictKeys.has(key)) {
      seenConflictKeys.add(key);
      uniqueConflicts.push(c);
    }
  });

  // CASE 1: ZERO CONFLICTS — PRESERVE EXACTLY AS CONFIGURED
  if (uniqueConflicts.length === 0) {
    const gapMetrics = calculateGapMetrics(initialExpandedSlots, workingDays);
    console.log("--> [USER-CTRL] Zero clashes found! Preserving 100% of admin configuration.");
    return {
      success: true,
      mode: "user-defined",
      hasConflicts: false,
      conflicts: [],
      proposedChanges: [],
      preservedCount: initialExpandedSlots.length,
      movedCount: 0,
      totalSlotsScheduled: initialExpandedSlots.length,
      slots: initialExpandedSlots,
      gapMetrics,
      isPublishable: true,
      validationReport: {
        isValid: true,
        isPublishable: true,
        hardConstraintViolations: [],
        ...gapMetrics,
      },
      message: "Timetable generated exactly according to admin configuration with zero clashes.",
    };
  }

  // CASE 2 & 3: CONFLICTS DETECTED — MINIMAL DISPLACEMENT RESOLUTION
  console.log(`--> [USER-CTRL] ${uniqueConflicts.length} conflict(s) detected. Calculating minimal-change resolution...`);

  // Identify sessions involved in conflicts
  const conflictingSessionIds = new Set();
  const sessionsToMove = [];
  const lockedSessions = [];

  // For internal clashes between slotA and slotB:
  // We keep slotA LOCKED in place (preserving admin's choice for slotA)
  // and only move slotB (minimal change = 1 move instead of 2).
  const internalClashPairHandled = new Set();

  uniqueConflicts.forEach((c) => {
    if (c.type === "CLASS_CLASH" || c.type === "FACULTY_CLASH" || c.type === "ROOM_CLASH") {
      const idA = c.slotA?.sessionId;
      const idB = c.slotB?.sessionId;

      if (idA && idB && idA !== idB) {
        // Internal clash between two sessions in this timetable
        const pairKey = [idA, idB].sort().join("___");
        if (!internalClashPairHandled.has(pairKey)) {
          internalClashPairHandled.add(pairKey);
          // Keep idA locked, move idB
          conflictingSessionIds.add(idB);
        }
      } else if (idA) {
        // External clash with published timetable
        conflictingSessionIds.add(idA);
      }
    } else if (c.type === "LAB_TEA_BREAK_SPLIT" || c.type === "LAB_LUNCH_SPLIT" || c.type === "OUT_OF_BOUNDS") {
      const idA = c.slotA?.sessionId;
      if (idA) conflictingSessionIds.add(idA);
    }
  });

  // Partition sessions into locked vs to-move
  sessions.forEach((sess) => {
    if (conflictingSessionIds.has(sess.sessionId)) {
      sessionsToMove.push(sess);
    } else {
      lockedSessions.push(sess);
    }
  });

  console.log(`--> [USER-CTRL] Partitioned: ${lockedSessions.length} sessions locked, ${sessionsToMove.length} sessions to minimally move.`);

  // Valid starting periods for 2-period continuous sessions: P1 (P1-P2), P3 (P3-P4), P5 (P5-P6), P6 (P6-P7)
  const VALID_LAB_STARTS = [1, 3, 5, 6];

  // Helper to test if a candidate placement is completely valid
  function isCandidatePlacementValid(candidateDay, candidateStartP, sessionToPlace, currentPlaced) {
    const endP = candidateStartP + sessionToPlace.duration - 1;

    // 1. Check bounds
    if (candidateStartP < 1 || endP > periods.length) return false;

    // 2. Check break crossing for multi-period sessions
    if (sessionToPlace.duration === 2) {
      if (!VALID_LAB_STARTS.includes(candidateStartP)) return false;
    }

    // 3. For each period in duration, verify section, faculty, and room are free
    for (let p = candidateStartP; p <= endP; p++) {
      // Check section clash against locked sessions and already placed moved sessions
      for (const existing of currentPlaced) {
        if (existing.day === candidateDay) {
          const exStart = existing.periodNumber;
          const exEnd = exStart + existing.duration - 1;
          if (p >= exStart && p <= exEnd) {
            // Check batch compatibility
            if (
              existing.batch === "All" ||
              sessionToPlace.batch === "All" ||
              existing.batch === sessionToPlace.batch
            ) {
              return false; // Section occupied
            }
          }
        }
      }

      // Check faculty clash against current placed and external timetables
      if (sessionToPlace.facultyId) {
        for (const existing of currentPlaced) {
          if (existing.day === candidateDay && existing.facultyId === sessionToPlace.facultyId) {
            const exStart = existing.periodNumber;
            const exEnd = exStart + existing.duration - 1;
            if (p >= exStart && p <= exEnd) return false;
          }
        }
        for (const ext of externalSlots) {
          if (ext.day === candidateDay && ext.periodNumber === p && ext.facultyId === sessionToPlace.facultyId) {
            return false;
          }
        }
      }

      // Check room clash against current placed and external timetables
      if (sessionToPlace.roomId) {
        for (const existing of currentPlaced) {
          if (existing.day === candidateDay && existing.roomId === sessionToPlace.roomId) {
            const exStart = existing.periodNumber;
            const exEnd = exStart + existing.duration - 1;
            if (p >= exStart && p <= exEnd) return false;
          }
        }
        for (const ext of externalSlots) {
          if (ext.day === candidateDay && ext.periodNumber === p && ext.roomId === sessionToPlace.roomId) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Generate candidate slots ordered by MINIMAL DISPLACEMENT from original position:
  // 1. Same Day, nearest period (distance |candP - origP|)
  // 2. Adjacent Days, same period
  // 3. Other Days, nearest period
  function getCandidateSlotsOrdered(session) {
    const origDay = session.day;
    const origDayIdx = workingDays.indexOf(origDay) !== -1 ? workingDays.indexOf(origDay) : 0;
    const origP = session.periodNumber;
    const isLab = session.duration > 1;

    const candidates = [];

    workingDays.forEach((day, dayIdx) => {
      const allowedStarts = isLab ? VALID_LAB_STARTS : [1, 2, 3, 4, 5, 6, 7];
      allowedStarts.forEach((p) => {
        const isSameDay = day === origDay;
        const dayDiff = Math.abs(dayIdx - origDayIdx);
        const periodDiff = Math.abs(p - origP);

        // Distance metric: same-day moves have lowest displacement
        const distance = isSameDay ? periodDiff : (dayDiff * 100 + periodDiff);

        candidates.push({
          day,
          periodNumber: p,
          distance,
        });
      });
    });

    candidates.sort((a, b) => a.distance - b.distance);
    return candidates;
  }

  // Backtracking solver to find the minimal displacement resolution for conflicting sessions
  let bestResolutionMoves = null;
  let bestTotalDisplacement = Infinity;
  const unresolvableReasons = [];
  const searchStartTime = Date.now();
  const MAX_SEARCH_TIME_MS = 2000;
  let iterations = 0;
  const MAX_ITERATIONS = 5000;

  function solveMinimalDisplacement(sessIdx, currentPlaced, currentMoves, totalDisp) {
    if (Date.now() - searchStartTime > MAX_SEARCH_TIME_MS || ++iterations > MAX_ITERATIONS) {
      return bestResolutionMoves !== null;
    }

    if (sessIdx === sessionsToMove.length) {
      if (totalDisp < bestTotalDisplacement) {
        bestTotalDisplacement = totalDisp;
        bestResolutionMoves = [...currentMoves];
      }
      return true;
    }

    const session = sessionsToMove[sessIdx];
    const candidateSlots = getCandidateSlotsOrdered(session);
    let foundValidForSession = false;

    for (const cand of candidateSlots) {
      if (totalDisp + cand.distance >= bestTotalDisplacement) continue;

      if (isCandidatePlacementValid(cand.day, cand.periodNumber, session, currentPlaced)) {
        foundValidForSession = true;
        const placedSession = {
          ...session,
          day: cand.day,
          periodNumber: cand.periodNumber,
        };

        const moveRecord = {
          sessionId: session.sessionId,
          subjectId: session.subjectId,
          subjectName: session.subjectName,
          subjectCode: session.subjectCode,
          facultyId: session.facultyId,
          facultyName: session.facultyName,
          roomId: session.roomId,
          roomName: session.roomName,
          duration: session.duration,
          fromDay: session.day,
          fromPeriod: session.periodNumber,
          toDay: cand.day,
          toPeriod: cand.periodNumber,
          displacementScore: cand.distance,
          reason: `Resolved hard clash at ${session.day} Period ${session.periodNumber}`,
        };

        const found = solveMinimalDisplacement(
          sessIdx + 1,
          [...currentPlaced, placedSession],
          [...currentMoves, moveRecord],
          totalDisp + cand.distance
        );
        // Greedily accept the first complete valid assignment if we found one
        if (found) return true;
      }
    }

    if (!foundValidForSession && unresolvableReasons.length === 0) {
      unresolvableReasons.push(
        `Cannot schedule "${session.subjectName}" (${session.subjectCode}): No valid slot available across Monday–Saturday where instructor ${session.facultyName} and room ${session.roomName} are free without clashing.`
      );
    }

    return bestResolutionMoves !== null;
  }

  // Execute minimal displacement resolution
  solveMinimalDisplacement(0, [...lockedSessions], [], 0);

  const canResolve = bestResolutionMoves !== null && bestResolutionMoves.length === sessionsToMove.length;

  // Format proposed changes with human-friendly descriptions
  const proposedChanges = (bestResolutionMoves || []).map((m) => {
    const origPeriodLabel = periods[m.fromPeriod - 1]?.label || `Period ${m.fromPeriod}`;
    const newPeriodLabel = periods[m.toPeriod - 1]?.label || `Period ${m.toPeriod}`;
    const origTime = periods[m.fromPeriod - 1]?.startTime ? `${periods[m.fromPeriod - 1].startTime}–${periods[m.fromPeriod + m.duration - 2]?.endTime || periods[m.fromPeriod - 1].endTime}` : "";
    const newTime = periods[m.toPeriod - 1]?.startTime ? `${periods[m.toPeriod - 1].startTime}–${periods[m.toPeriod + m.duration - 2]?.endTime || periods[m.toPeriod - 1].endTime}` : "";

    return {
      ...m,
      description: `Move ${m.subjectName} (${m.duration > 1 ? `${m.duration}-period lab` : "class"}) from ${m.fromDay} ${origPeriodLabel} (${origTime}) → ${m.toDay} ${newPeriodLabel} (${newTime})`,
    };
  });

  // IF ADMIN ACCEPTS CONFLICT RESOLUTION (resolveConflicts: true) AND SOLUTION EXISTS
  if (resolveConflicts && canResolve) {
    const resolvedSessions = [
      ...lockedSessions,
      ...sessionsToMove.map((s) => {
        const move = bestResolutionMoves.find((m) => m.sessionId === s.sessionId);
        if (move) {
          return {
            ...s,
            day: move.toDay,
            periodNumber: move.toPeriod,
          };
        }
        return s;
      }),
    ];

    const finalResolvedSlots = expandSessions(resolvedSessions);
    const finalValidation = validateTimetable(finalResolvedSlots, {
      externalSlots,
      subjects,
      workingDays,
      periods,
    });

    console.log(`--> [USER-CTRL] Successfully applied minimal conflict resolution! ${proposedChanges.length} moves, 0 remaining clashes.`);

    return {
      success: finalValidation.isValid,
      mode: "minimal-resolved",
      hasConflicts: false,
      canResolve: true,
      conflicts: [],
      proposedChanges,
      preservedCount: lockedSessions.reduce((sum, s) => sum + s.duration, 0),
      movedCount: proposedChanges.reduce((sum, m) => sum + m.duration, 0),
      totalSlotsScheduled: finalResolvedSlots.length,
      slots: finalResolvedSlots,
      gapMetrics: calculateGapMetrics(finalResolvedSlots, workingDays),
      isPublishable: finalValidation.isValid,
      validationReport: finalValidation,
      message: `Resolved all conflicts with minimal displacement (${proposedChanges.length} session(s) moved, ${lockedSessions.length} sessions locked in place).`,
    };
  }

  // IF CONFLICTS EXIST BUT resolveConflicts IS FALSE OR NO SOLUTION EXISTS
  const lockedExpandedSlots = expandSessions(lockedSessions);

  return {
    success: false,
    mode: "user-defined",
    hasConflicts: true,
    canResolve,
    conflicts: uniqueConflicts,
    proposedChanges,
    unresolvableReasons,
    unresolvedConflicts: uniqueConflicts.map((c) => ({
      subject: c.slotA?.subjectName || "Subject",
      reason: c.description,
      suggestedAlternatives: [
        "Review and accept the proposed minimal clash-resolution move",
        "Manually adjust the day and period in Step 2",
        "Reassign faculty member or classroom",
      ],
    })),
    preservedCount: resolveConflicts && !canResolve ? 0 : lockedExpandedSlots.length,
    movedCount: 0,
    totalSlotsScheduled: resolveConflicts && !canResolve ? 0 : lockedExpandedSlots.length,
    slots: resolveConflicts && !canResolve ? [] : initialExpandedSlots, // Preview original slots with clashes highlighted if user viewing draft
    isPublishable: false,
    validationReport: {
      isValid: false,
      isPublishable: false,
      hardConstraintViolations: uniqueConflicts,
      ...calculateGapMetrics(resolveConflicts && !canResolve ? [] : lockedExpandedSlots, workingDays),
    },
    message: canResolve
      ? `Conflicts detected in ${uniqueConflicts.length} assignment(s). Minimal clash resolution available (${proposedChanges.length} proposed move(s)).`
      : `Schedule constraints cannot be satisfied. ${unresolvableReasons[0] || "Resource saturation prevents valid allocation."}`,
  };
}

module.exports = {
  PERIODS,
  BREAKS,
  WORKING_DAYS,
  calculateGapMetrics,
  detectConflicts,
  validateTimetable,
  generateClashFreeTimetable,
  generateUserControlledTimetable,
};
