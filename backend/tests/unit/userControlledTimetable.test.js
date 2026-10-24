const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const {
  generateUserControlledTimetable,
  validateTimetable,
  calculateGapMetrics,
  PERIODS,
  WORKING_DAYS,
} = require('../../services/timetableGeneratorService');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runAllScenarios() {
  console.log("==================================================================");
  console.log("VERIFYING USER-CONTROLLED TIMETABLE GENERATION & CONFLICT RESOLVER");
  console.log("Core Requirement: User-defined scheduling first, automatic minimal resolution only when necessary");
  console.log("==================================================================\n");

  // Base 9 Subjects for Semester 7 Section A (27 Total Periods)
  // 6 Theory (3 periods each = 18 periods)
  // 2 Labs (2 periods each = 4 periods)
  // 1 Mini Project (4 periods = 4 periods) + 1 elective (1 period) = 27 periods
  function createBaseSubjects() {
    return [
      {
        id: 1,
        code: "21CS71",
        name: "Cloud Computing",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 101,
        facultyName: "Dr. Alice Sharma",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s1_1", day: "Monday", periodNumber: 1, duration: 1 },
          { id: "s1_2", day: "Tuesday", periodNumber: 2, duration: 1 },
          { id: "s1_3", day: "Thursday", periodNumber: 3, duration: 1 },
        ],
      },
      {
        id: 2,
        code: "21CS72",
        name: "Information Security",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 102,
        facultyName: "Prof. Rajesh Kumar",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s2_1", day: "Monday", periodNumber: 2, duration: 1 },
          { id: "s2_2", day: "Wednesday", periodNumber: 1, duration: 1 },
          { id: "s2_3", day: "Friday", periodNumber: 2, duration: 1 },
        ],
      },
      {
        id: 3,
        code: "21CS73",
        name: "Machine Learning & AI",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 103,
        facultyName: "Dr. Priya Patel",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s3_1", day: "Monday", periodNumber: 3, duration: 1 },
          { id: "s3_2", day: "Wednesday", periodNumber: 2, duration: 1 },
          { id: "s3_3", day: "Friday", periodNumber: 3, duration: 1 },
        ],
      },
      {
        id: 4,
        code: "21CS74",
        name: "Internet of Things",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 104,
        facultyName: "Prof. Suresh Nair",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s4_1", day: "Monday", periodNumber: 4, duration: 1 },
          { id: "s4_2", day: "Wednesday", periodNumber: 3, duration: 1 },
          { id: "s4_3", day: "Friday", periodNumber: 4, duration: 1 },
        ],
      },
      {
        id: 5,
        code: "21CS75",
        name: "Blockchain Technology",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 105,
        facultyName: "Dr. Ananya Roy",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s5_1", day: "Tuesday", periodNumber: 1, duration: 1 },
          { id: "s5_2", day: "Thursday", periodNumber: 1, duration: 1 },
          { id: "s5_3", day: "Saturday", periodNumber: 1, duration: 1 },
        ],
      },
      {
        id: 6,
        code: "21CS76",
        name: "Big Data Analytics",
        weeklyPeriods: 3,
        isLab: false,
        facultyId: 106,
        facultyName: "Prof. Manoj Verma",
        roomId: 201,
        roomName: "BSN-CR-105",
        slots: [
          { id: "s6_1", day: "Tuesday", periodNumber: 3, duration: 1 },
          { id: "s6_2", day: "Thursday", periodNumber: 2, duration: 1 },
          { id: "s6_3", day: "Saturday", periodNumber: 2, duration: 1 },
        ],
      },
      {
        id: 7,
        code: "21CSL77",
        name: "Cloud & Security Lab",
        weeklyPeriods: 2,
        isLab: true,
        consecutivePeriods: 2,
        facultyId: 101,
        facultyName: "Dr. Alice Sharma",
        roomId: 301,
        roomName: "BSN-LAB-INS",
        slots: [
          // 2-period lab starting at P5 (covers P5 and P6: 13:25 - 15:15)
          { id: "s7_1", day: "Tuesday", periodNumber: 5, duration: 2 },
        ],
      },
      {
        id: 8,
        code: "21CSL78",
        name: "Machine Learning Lab",
        weeklyPeriods: 2,
        isLab: true,
        consecutivePeriods: 2,
        facultyId: 103,
        facultyName: "Dr. Priya Patel",
        roomId: 302,
        roomName: "BSN-LAB-PC",
        slots: [
          // 2-period lab starting at P5 (covers P5 and P6: 13:25 - 15:15)
          { id: "s8_1", day: "Thursday", periodNumber: 5, duration: 2 },
        ],
      },
      {
        id: 9,
        code: "21CSP79",
        name: "Project Work Phase-1",
        weeklyPeriods: 5,
        isLab: true,
        consecutivePeriods: 2,
        facultyId: 107,
        facultyName: "Dr. HOD Computer Science",
        roomId: 301,
        roomName: "BSN-LAB-INS",
        slots: [
          // 2 periods on Friday P5-P6
          { id: "s9_1", day: "Friday", periodNumber: 5, duration: 2 },
          // 2 periods on Saturday P3-P4
          { id: "s9_2", day: "Saturday", periodNumber: 3, duration: 2 },
          // 1 period on Wednesday P4
          { id: "s9_3", day: "Wednesday", periodNumber: 4, duration: 1 },
        ],
      },
    ];
  }

  // -------------------------------------------------------------
  // SCENARIO 1: NO CONFLICTS (EXACT MATCH TO ADMIN'S CONFIGURATION)
  // -------------------------------------------------------------
  console.log("--- SCENARIO 1: No Conflicts (Exact Match to Admin's Configuration) ---");
  const subjects1 = createBaseSubjects();
  const res1 = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects1,
    resolveConflicts: false,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res1.success === true, "Scenario 1: Generator reports success = true");
  assert(res1.mode === "user-defined", "Scenario 1: Mode is user-defined");
  assert(res1.hasConflicts === false, "Scenario 1: Zero conflicts detected");
  assert(res1.conflicts.length === 0, "Scenario 1: Conflicts array is empty");
  assert(res1.proposedChanges.length === 0, "Scenario 1: Zero proposed changes needed");
  assert(res1.preservedCount === 27, `Scenario 1: Exactly 27/27 classes preserved (got ${res1.preservedCount})`);
  assert(res1.movedCount === 0, `Scenario 1: Exactly 0 classes moved (got ${res1.movedCount})`);
  assert(res1.totalSlotsScheduled === 27, `Scenario 1: Total slots scheduled is 27 (got ${res1.totalSlotsScheduled})`);
  assert(res1.isPublishable === true, "Scenario 1: Schedule is marked publishable");

  // Verify that every single slot in res1 matches the admin's exact configured day and period
  let exactMatchCount = 0;
  subjects1.forEach((sub) => {
    sub.slots.forEach((s) => {
      for (let offset = 0; offset < s.duration; offset++) {
        const expectedP = s.periodNumber + offset;
        const match = res1.slots.find(
          (slot) =>
            slot.subjectId === sub.id &&
            slot.day === s.day &&
            slot.periodNumber === expectedP
        );
        if (match) exactMatchCount++;
      }
    });
  });
  assert(exactMatchCount === 27, `Scenario 1: 100% of generated slots exactly match admin's day and period (${exactMatchCount}/27)`);

  // Verify 2-period lab continuous placement and break adherence
  const labSlots = res1.slots.filter((s) => s.isLab && s.duration === 2);
  const labPeriods = [...new Set(labSlots.map((s) => `${s.subjectCode}_${s.day}_${s.periodNumber}`))];
  assert(labPeriods.length >= 6, `Scenario 1: Multi-period lab sessions scheduled correctly (${labPeriods.length} lab period slots)`);
  // Ensure no lab bridges P2-P3 or P4-P5
  const hasTeaSplit = res1.slots.some((s) => s.duration === 2 && s.periodNumber === 2 && res1.slots.some(other => other.day === s.day && other.subjectId === s.subjectId && other.periodNumber === 3));
  const hasLunchSplit = res1.slots.some((s) => s.duration === 2 && s.periodNumber === 4 && res1.slots.some(other => other.day === s.day && other.subjectId === s.subjectId && other.periodNumber === 5));
  assert(!hasTeaSplit && !hasLunchSplit, "Scenario 1: No multi-period session bridges tea or lunch breaks");

  // -------------------------------------------------------------
  // SCENARIO 2: FACULTY CONFLICT (DETECTED, MINIMAL CHANGE SUGGESTED)
  // -------------------------------------------------------------
  console.log("\n--- SCENARIO 2: Faculty Conflict (Detected, Minimal Change Suggested) ---");
  const subjects2 = createBaseSubjects();
  // Intentionally assign Dr. Alice Sharma (facultyId: 101) to Subject 2 on Monday Period 1 as well!
  subjects2[1].facultyId = 101;
  subjects2[1].facultyName = "Dr. Alice Sharma";
  subjects2[1].slots[0] = { id: "s2_1_conflict", day: "Monday", periodNumber: 1, duration: 1 };

  // Step 2A: Detect conflict without auto-applying
  const res2A = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects2,
    resolveConflicts: false,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res2A.success === false, "Scenario 2A: Generator reports success = false when conflict exists");
  assert(res2A.hasConflicts === true, "Scenario 2A: hasConflicts = true");
  assert(res2A.canResolve === true, "Scenario 2A: canResolve = true (minimal resolution is available)");
  assert(res2A.conflicts.length >= 1, `Scenario 2A: Conflict list contains clashes (${res2A.conflicts.length})`);
  const facultyClash = res2A.conflicts.find((c) => c.type === "FACULTY_CLASH" || c.description.includes("Faculty clash"));
  assert(Boolean(facultyClash), "Scenario 2A: Exact FACULTY_CLASH detected on Monday Period 1 for Dr. Alice Sharma");
  assert(res2A.proposedChanges.length === 1, `Scenario 2A: Exactly 1 minimal change proposed (got ${res2A.proposedChanges.length})`);
  assert(res2A.proposedChanges[0].fromDay === "Monday" && res2A.proposedChanges[0].fromPeriod === 1, "Scenario 2A: Proposed move originates from Monday Period 1");
  assert(res2A.proposedChanges[0].toDay === "Monday" && res2A.proposedChanges[0].toPeriod === 2, `Scenario 2A: Proposed move stays on same day to nearest free period (Monday Period ${res2A.proposedChanges[0].toPeriod})`);

  // Step 2B: Apply minimal resolution (resolveConflicts: true)
  const res2B = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects2,
    resolveConflicts: true,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res2B.success === true, "Scenario 2B: Minimal resolution succeeds (success = true)");
  assert(res2B.mode === "minimal-resolved", "Scenario 2B: Mode is minimal-resolved");
  assert(res2B.movedCount === 1, `Scenario 2B: Exactly 1 class moved (got ${res2B.movedCount})`);
  assert(res2B.preservedCount === 26, `Scenario 2B: Exactly 26 classes locked and preserved (got ${res2B.preservedCount})`);
  assert(res2B.totalSlotsScheduled === 27, `Scenario 2B: Total slots scheduled is 27 (got ${res2B.totalSlotsScheduled})`);
  const val2B = validateTimetable(res2B.slots);
  assert(val2B.isValid === true, "Scenario 2B: Validated output has zero clashes");

  // -------------------------------------------------------------
  // SCENARIO 3: ROOM CONFLICT (DETECTED, MINIMAL CHANGE SUGGESTED)
  // -------------------------------------------------------------
  console.log("\n--- SCENARIO 3: Room Conflict (Detected, Minimal Change Suggested) ---");
  const subjects3 = createBaseSubjects();
  // Subject 6 (Room 201) is on Tuesday Period 3.
  // We change Subject 5 (Dr. Ananya Roy, Room 201) to also be on Tuesday Period 3!
  subjects3[4].slots[0] = { id: "s5_1_conflict", day: "Tuesday", periodNumber: 3, duration: 1 };

  // Step 3A: Detect Room Conflict
  const res3A = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects3,
    resolveConflicts: false,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res3A.success === false, "Scenario 3A: Generator reports conflict for room clash");
  assert(res3A.hasConflicts === true, "Scenario 3A: hasConflicts = true");
  const roomClash = res3A.conflicts.find((c) => c.type === "ROOM_CLASH" || c.description.includes("Room clash") || c.description.includes("Class clash"));
  assert(Boolean(roomClash), "Scenario 3A: Exact room clash detected on Tuesday Period 3");
  assert(res3A.proposedChanges.length === 1, `Scenario 3A: Exactly 1 minimal move proposed (got ${res3A.proposedChanges.length})`);

  // Step 3B: Apply Resolution
  const res3B = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects3,
    resolveConflicts: true,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res3B.success === true, "Scenario 3B: Room conflict resolved successfully");
  assert(res3B.movedCount === 1, `Scenario 3B: Only 1 conflicting class moved (got ${res3B.movedCount})`);
  assert(res3B.preservedCount === 26, `Scenario 3B: All other 26 classes locked in place (got ${res3B.preservedCount})`);
  assert(validateTimetable(res3B.slots).isValid === true, "Scenario 3B: Validated output has zero clashes");

  // -------------------------------------------------------------
  // SCENARIO 4: SECTION CONFLICT (DETECTED, MINIMAL CHANGE SUGGESTED)
  // -------------------------------------------------------------
  console.log("\n--- SCENARIO 4: Section Conflict (Detected, Minimal Change Suggested) ---");
  const subjects4 = createBaseSubjects();
  // Assign two classes for the section on Wednesday Period 2:
  // Change Subject 4 to Wednesday Period 2
  subjects4[3].slots[1] = { id: "s4_2_conflict", day: "Wednesday", periodNumber: 2, duration: 1 };

  // Step 4A: Detect Section Conflict
  const res4A = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects4,
    resolveConflicts: false,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res4A.success === false, "Scenario 4A: Generator reports section conflict");
  assert(res4A.hasConflicts === true, "Scenario 4A: hasConflicts = true");
  const sectionClash = res4A.conflicts.find((c) => c.type === "CLASS_CLASH" || c.description.includes("Class clash"));
  assert(Boolean(sectionClash), "Scenario 4A: Section class clash detected on Wednesday Period 2");
  assert(res4A.proposedChanges.length === 1, `Scenario 4A: Minimal resolution proposed (got ${res4A.proposedChanges.length})`);

  // Step 4B: Apply Resolution
  const res4B = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects4,
    resolveConflicts: true,
    existingSlots: [],
    externalSlots: [],
  });

  assert(res4B.success === true, "Scenario 4B: Section clash resolved successfully");
  assert(res4B.movedCount === 1, `Scenario 4B: Exactly 1 class moved (got ${res4B.movedCount})`);
  assert(res4B.preservedCount === 26, `Scenario 4B: 26 classes locked (got ${res4B.preservedCount})`);
  assert(validateTimetable(res4B.slots).isValid === true, "Scenario 4B: Validated output has zero clashes");

  // -------------------------------------------------------------
  // SCENARIO 5: IMPOSSIBLE SCHEDULE (REPORTED HONESTLY WITHOUT DROPPING CLASSES)
  // -------------------------------------------------------------
  console.log("\n--- SCENARIO 5: Impossible Schedule (Reported Honestly Without Dropping Classes) ---");
  const subjects5 = createBaseSubjects();
  // Saturated external slots for Faculty 101
  const saturatedExternalSlots = [];
  WORKING_DAYS.forEach((day) => {
    PERIODS.forEach((p) => {
      saturatedExternalSlots.push({
        day,
        periodNumber: p.periodNumber,
        facultyId: 101, // Saturated
        facultyName: "Dr. Alice Sharma",
        roomId: 999,
        roomName: "Other Room",
        department: "ECE",
        semester: 5,
        section: "B",
      });
    });
  });

  const res5 = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "A",
    subjects: subjects5,
    resolveConflicts: true,
    externalSlots: saturatedExternalSlots,
  });

  assert(res5.success === false, "Scenario 5: Generator reports success = false for impossible schedule");
  assert(res5.canResolve === false, "Scenario 5: canResolve = false (cannot be resolved under constraints)");
  assert(res5.hasConflicts === true, "Scenario 5: hasConflicts = true");
  assert(res5.isPublishable === false, "Scenario 5: Impossible schedule is NOT publishable");
  assert(res5.unresolvableReasons.length > 0, `Scenario 5: Explains exact constraint bottleneck: "${res5.unresolvableReasons[0]}"`);
  assert(res5.slots.length === 0, "Scenario 5: Never silently returns a partial or fake clash-free timetable");

  console.log("\n==================================================================");
  console.log(`TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log("==================================================================");

  if (failedTests > 0) {
    console.error("FAILURES:\n" + failures.join("\n"));
    process.exit(1);
  } else {
    console.log("ALL 5 SCENARIOS VERIFIED SUCCESSFULLY!");
  }
}

runAllScenarios().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
