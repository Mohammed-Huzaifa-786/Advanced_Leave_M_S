const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const {
  validateTimetable,
  countScheduledPeriods,
  generateClashFreeTimetable,
  generateUserControlledTimetable,
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

async function runWeeklyPeriodsValidationTests() {
  console.log("==================================================================");
  console.log("TEST SUITE: GLOBAL WEEKLY-PERIOD VALIDATION ACROSS ALL SUBJECTS");
  console.log("Verifying admin-defined source of truth, exact counts, zero false MISSING_PERIODS");
  console.log("==================================================================\n");

  // -------------------------------------------------------------
  // TEST 1: Parameterized Theory Subject Weekly Periods (1 to 6)
  // -------------------------------------------------------------
  console.log("--- 1. Parameterized Theory Subject Weekly Periods (1 to 6) ---");
  const testCounts = [1, 2, 3, 4, 5, 6];
  for (const count of testCounts) {
    const sub = {
      id: 100 + count,
      name: `Theory Course ${count}P`,
      code: `TC${count}00`,
      weeklyPeriods: count,
      isLab: false,
      consecutivePeriods: 1,
    };

    // Case A: Exact scheduled count -> MUST PASS with zero MISSING_PERIODS
    const exactSlots = [];
    for (let p = 1; p <= count; p++) {
      exactSlots.push({
        id: `slot_${count}_${p}`,
        subjectId: sub.id,
        subjectCode: sub.code,
        subjectName: sub.name,
        day: p <= 3 ? "Monday" : "Tuesday",
        periodNumber: p <= 3 ? p : (p - 3),
        duration: 1,
      });
    }

    const valExact = validateTimetable(exactSlots, { subjects: [sub] });
    assert(valExact.isValid === true, `Theory ${count}P: exact ${count} periods scheduled -> isValid = true`);
    assert(
      !valExact.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"),
      `Theory ${count}P: exact ${count} periods scheduled -> zero MISSING_PERIODS violations`
    );

    // Case B: Under-scheduled by 1 period -> MUST detect genuine shortfall
    if (count > 1) {
      const underSlots = exactSlots.slice(0, count - 1);
      const valUnder = validateTimetable(underSlots, { subjects: [sub] });
      assert(valUnder.isValid === false, `Theory ${count}P: under-scheduled by 1 period -> isValid = false`);
      const missingViolation = valUnder.hardConstraintViolations.find((v) => v.type === "MISSING_PERIODS");
      assert(Boolean(missingViolation), `Theory ${count}P: under-scheduled -> reports MISSING_PERIODS violation`);
      assert(missingViolation?.required === count, `Theory ${count}P: required count is ${count} (got ${missingViolation?.required})`);
      assert(missingViolation?.scheduled === count - 1, `Theory ${count}P: scheduled count is ${count - 1} (got ${missingViolation?.scheduled})`);
      assert(missingViolation?.shortfall === 1, `Theory ${count}P: shortfall is exactly 1 (got ${missingViolation?.shortfall})`);
    }
  }

  // -------------------------------------------------------------
  // TEST 2: Lab Subjects (BCSL707 & BCSL706, 2-Period and 4-Period Blocks)
  // -------------------------------------------------------------
  console.log("\n--- 2. Lab Subjects: BCSL707 & BCSL706 (2-Period and 4-Period Blocks) ---");

  const bcsl707 = {
    id: 13,
    name: "Information and Network Security Lab",
    code: "BCSL707",
    weeklyPeriods: 2,
    isLab: true,
    consecutivePeriods: 2,
  };

  const bcsl706 = {
    id: 14,
    name: "Parallel Computing Laboratory",
    code: "BCSL706",
    weeklyPeriods: 2,
    isLab: true,
    consecutivePeriods: 2,
  };

  // 2A: Unexpanded single slot representation (duration: 2)
  const unexpandedLabSlots = [
    {
      id: "slot_707_unexp",
      subjectId: 13,
      subjectCode: "BCSL707",
      subjectName: "Information and Network Security Lab",
      day: "Friday",
      periodNumber: 1,
      duration: 2,
      isLab: true,
    },
    {
      id: "slot_706_unexp",
      subjectId: 14,
      subjectCode: "BCSL706",
      subjectName: "Parallel Computing Laboratory",
      day: "Friday",
      periodNumber: 6,
      duration: 2,
      isLab: true,
    },
  ];

  const valUnexp = validateTimetable(unexpandedLabSlots, { subjects: [bcsl707, bcsl706] });
  assert(valUnexp.isValid === true, "2A: Unexpanded 2-period lab slots -> isValid = true");
  assert(
    !valUnexp.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"),
    "2A: Unexpanded 2-period lab slots -> ZERO MISSING_PERIODS reported"
  );
  assert(countScheduledPeriods([unexpandedLabSlots[0]]) === 2, "2A: BCSL707 unexpanded slot counts as 2 periods");
  assert(countScheduledPeriods([unexpandedLabSlots[1]]) === 2, "2A: BCSL706 unexpanded slot counts as 2 periods");

  // 2B: Expanded individual period slots (e.g. BMSIT seed / database slots where each period has duration: 2)
  const expandedLabSlots = [
    // BCSL707 on Friday P1 and P2
    {
      id: "slot_707_p1",
      subjectId: 13,
      subjectCode: "BCSL707",
      subjectName: "Information and Network Security Lab",
      day: "Friday",
      periodNumber: 1,
      duration: 2,
      isLab: true,
    },
    {
      id: "slot_707_p2",
      subjectId: 13,
      subjectCode: "BCSL707",
      subjectName: "Information and Network Security Lab",
      day: "Friday",
      periodNumber: 2,
      duration: 2,
      isLab: true,
    },
    // BCSL706 on Friday P6 and P7
    {
      id: "slot_706_p6",
      subjectId: 14,
      subjectCode: "BCSL706",
      subjectName: "Parallel Computing Laboratory",
      day: "Friday",
      periodNumber: 6,
      duration: 2,
      isLab: true,
    },
    {
      id: "slot_706_p7",
      subjectId: 14,
      subjectCode: "BCSL706",
      subjectName: "Parallel Computing Laboratory",
      day: "Friday",
      periodNumber: 7,
      duration: 2,
      isLab: true,
    },
  ];

  const valExp = validateTimetable(expandedLabSlots, { subjects: [bcsl707, bcsl706] });
  assert(valExp.isValid === true, "2B: Expanded 2-period lab slots -> isValid = true");
  assert(
    !valExp.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"),
    "2B: Expanded 2-period lab slots -> ZERO MISSING_PERIODS reported"
  );
  assert(countScheduledPeriods(expandedLabSlots.filter((s) => s.subjectCode === "BCSL707")) === 2, "2B: BCSL707 expanded slots count as exactly 2 periods");
  assert(countScheduledPeriods(expandedLabSlots.filter((s) => s.subjectCode === "BCSL706")) === 2, "2B: BCSL706 expanded slots count as exactly 2 periods");

  // 2C: Admin increases configured count to 4 periods -> MUST report missing periods until 4 periods are scheduled
  const bcsl707_4p = { ...bcsl707, weeklyPeriods: 4 };
  const valLabShortfall = validateTimetable(unexpandedLabSlots, { subjects: [bcsl707_4p] });
  assert(valLabShortfall.isValid === false, "2C: Lab configured with 4 periods but only 2 scheduled -> isValid = false");
  const labMissing = valLabShortfall.hardConstraintViolations.find((v) => v.type === "MISSING_PERIODS");
  assert(Boolean(labMissing), "2C: Reports MISSING_PERIODS when configured 4 but scheduled 2");
  assert(labMissing?.required === 4, `2C: Required is 4 (got ${labMissing?.required})`);
  assert(labMissing?.scheduled === 2, `2C: Scheduled is 2 (got ${labMissing?.scheduled})`);
  assert(labMissing?.shortfall === 2, `2C: Shortfall is 2 (got ${labMissing?.shortfall})`);

  // Now schedule 4 periods for BCSL707 (two 2-period sessions: Friday P1-2 and Tuesday P5-6)
  const lab4pSlots = [
    { subjectId: 13, subjectCode: "BCSL707", subjectName: "Information and Network Security Lab", day: "Friday", periodNumber: 1, duration: 2 },
    { subjectId: 13, subjectCode: "BCSL707", subjectName: "Information and Network Security Lab", day: "Tuesday", periodNumber: 5, duration: 2 },
  ];
  const valLab4pSuccess = validateTimetable(lab4pSlots, { subjects: [bcsl707_4p] });
  assert(valLab4pSuccess.isValid === true, "2C: Lab with 4 periods scheduled across two 2-period blocks -> isValid = true");
  assert(
    !valLab4pSuccess.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"),
    "2C: Lab with 4 periods scheduled -> ZERO MISSING_PERIODS"
  );

  // -------------------------------------------------------------
  // TEST 3: Multi-Period Project Course (MP708, 12 Periods in 4-Period Blocks)
  // -------------------------------------------------------------
  console.log("\n--- 3. Multi-Period Project Course (MP708, 12 Periods in 4-Period Blocks) ---");

  const mp708 = {
    id: 15,
    name: "Major Project Phase II",
    code: "MP708",
    weeklyPeriods: 12,
    isLab: false,
    consecutivePeriods: 4,
  };

  // 3A: 3 unexpanded 4-period sessions (Monday P1-4, Tuesday P1-4, Wednesday P1-4)
  const mp708Unexpanded = [
    { subjectId: 15, subjectCode: "MP708", subjectName: "Major Project Phase II", day: "Monday", periodNumber: 1, duration: 4 },
    { subjectId: 15, subjectCode: "MP708", subjectName: "Major Project Phase II", day: "Tuesday", periodNumber: 1, duration: 4 },
    { subjectId: 15, subjectCode: "MP708", subjectName: "Major Project Phase II", day: "Wednesday", periodNumber: 1, duration: 4 },
  ];

  const valMpUnexp = validateTimetable(mp708Unexpanded, { subjects: [mp708] });
  assert(valMpUnexp.isValid === true, "3A: MP708 3x4 unexpanded sessions -> isValid = true");
  assert(countScheduledPeriods(mp708Unexpanded) === 12, "3A: MP708 counts as exactly 12 periods");
  assert(!valMpUnexp.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"), "3A: Zero MISSING_PERIODS for MP708");

  // 3B: MP708 under-scheduled (only 2 sessions = 8 periods)
  const valMpUnder = validateTimetable(mp708Unexpanded.slice(0, 2), { subjects: [mp708] });
  assert(valMpUnder.isValid === false, "3B: MP708 under-scheduled (8/12) -> isValid = false");
  const mpMissing = valMpUnder.hardConstraintViolations.find((v) => v.type === "MISSING_PERIODS");
  assert(mpMissing?.required === 12, "3B: MP708 required is 12");
  assert(mpMissing?.scheduled === 8, "3B: MP708 scheduled is 8");
  assert(mpMissing?.shortfall === 4, "3B: MP708 shortfall is 4");

  // -------------------------------------------------------------
  // TEST 4: Case-Insensitive and Robust Identifier Matching
  // -------------------------------------------------------------
  console.log("\n--- 4. Case-Insensitive and Robust Identifier Matching ---");

  const subCaseTest = {
    id: 99,
    name: "Information and Network Security Lab",
    code: "BCSL707",
    weeklyPeriods: 2,
    isLab: true,
    consecutivePeriods: 2,
  };

  // Slot has lowercase code 'bcsl707' and string id
  const lowerCaseSlot = [
    {
      subjectId: "99",
      subjectCode: "bcsl707",
      subjectName: "information and network security lab",
      day: "Friday",
      periodNumber: 1,
      duration: 2,
    },
  ];

  const valCase = validateTimetable(lowerCaseSlot, { subjects: [subCaseTest] });
  assert(valCase.isValid === true, "4A: Lowercase code 'bcsl707' matches uppercase 'BCSL707'");
  assert(!valCase.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"), "4A: Zero MISSING_PERIODS on case-insensitive match");

  // Slot has null id, but matching code and name
  const noIdSlot = [
    {
      subjectId: null,
      subjectCode: "BCSL707",
      subjectName: "Information and Network Security Lab",
      day: "Friday",
      periodNumber: 1,
      duration: 2,
    },
  ];
  const valNoId = validateTimetable(noIdSlot, { subjects: [subCaseTest] });
  assert(valNoId.isValid === true, "4B: Null slot.subjectId correctly matches via subjectCode");

  // -------------------------------------------------------------
  // TEST 5: Admin Slot-Derived Requirements When weeklyPeriods is Unspecified
  // -------------------------------------------------------------
  console.log("\n--- 5. Admin Slot-Derived Requirements When weeklyPeriods is Unspecified ---");

  const customSubNoWeekly = {
    id: 501,
    name: "Custom Workshop",
    code: "CW501",
    weeklyPeriods: undefined, // Admin did not set a numeric count
    slots: [
      { day: "Monday", periodNumber: 3, duration: 1 },
      { day: "Wednesday", periodNumber: 3, duration: 1 },
      { day: "Friday", periodNumber: 3, duration: 1 },
    ],
  };

  // Timetable has the 3 slots matching admin's configured slots
  const customSlots = [
    { subjectId: 501, subjectCode: "CW501", day: "Monday", periodNumber: 3, duration: 1 },
    { subjectId: 501, subjectCode: "CW501", day: "Wednesday", periodNumber: 3, duration: 1 },
    { subjectId: 501, subjectCode: "CW501", day: "Friday", periodNumber: 3, duration: 1 },
  ];

  const valCustom = validateTimetable(customSlots, { subjects: [customSubNoWeekly] });
  assert(valCustom.isValid === true, "5A: Derived requirement from 3 slots -> isValid = true");
  assert(!valCustom.hardConstraintViolations.some((v) => v.type === "MISSING_PERIODS"), "5A: No false MISSING_PERIODS for slot-derived requirements");

  // -------------------------------------------------------------
  // TEST 6: Generator Exact Scheduling (generateClashFreeTimetable)
  // -------------------------------------------------------------
  console.log("\n--- 6. Generator Exact Scheduling (generateClashFreeTimetable) ---");

  const arbitraryConfig = [
    { id: 201, name: "Elective A", code: "ELA", weeklyPeriods: 2, isLab: false, consecutivePeriods: 1 },
    { id: 202, name: "Core B", code: "CRB", weeklyPeriods: 4, isLab: false, consecutivePeriods: 1 },
    { id: 203, name: "Practice Lab C", code: "PLC", weeklyPeriods: 2, isLab: true, consecutivePeriods: 2 },
    { id: 204, name: "Project D", code: "PJD", weeklyPeriods: 4, isLab: false, consecutivePeriods: 4 },
  ];
  // Total expected periods: 2 + 4 + 2 + 4 = 12

  const genResult = await generateClashFreeTimetable({
    department: "TEST",
    semester: 5,
    section: "A",
    academicYear: "2026-27",
    subjects: arbitraryConfig,
  });

  assert(genResult.success === true, "6A: Generator succeeds with arbitrary admin-configured weekly periods");
  assert(genResult.totalSlotsScheduled === 12, `6A: Exactly 12 periods scheduled (got ${genResult.totalSlotsScheduled})`);
  assert(genResult.finalClashes.length === 0, "6A: Zero hard clashes in generated output");
  assert(genResult.isValid === true, "6A: Independent validator marks generated schedule valid");

  // Verify scheduled count per individual subject matches admin configuration exactly
  const elaCount = genResult.slots.filter((s) => s.subjectCode === "ELA").length;
  const crbCount = genResult.slots.filter((s) => s.subjectCode === "CRB").length;
  const plcCount = countScheduledPeriods(genResult.slots.filter((s) => s.subjectCode === "PLC"));
  const pjdCount = countScheduledPeriods(genResult.slots.filter((s) => s.subjectCode === "PJD"));

  assert(elaCount === 2, `6B: Elective A scheduled exactly 2 periods (got ${elaCount})`);
  assert(crbCount === 4, `6B: Core B scheduled exactly 4 periods (got ${crbCount})`);
  assert(plcCount === 2, `6B: Practice Lab C scheduled exactly 2 periods (got ${plcCount})`);
  assert(pjdCount === 4, `6B: Project D scheduled exactly 4 periods (got ${pjdCount})`);

  // -------------------------------------------------------------
  // TEST 7: User-Controlled Timetable with 2-Period Labs (BCSL707 & BCSL706)
  // -------------------------------------------------------------
  console.log("\n--- 7. User-Controlled Timetable with 2-Period Labs (BCSL707 & BCSL706) ---");

  const userControlledSubjects = [
    {
      id: 1,
      code: "BCS701",
      name: "Information and Network Security",
      weeklyPeriods: 2,
      isLab: false,
      consecutivePeriods: 1,
      slots: [
        { day: "Thursday", periodNumber: 3, duration: 1 },
        { day: "Thursday", periodNumber: 6, duration: 1 },
      ],
    },
    {
      id: 2,
      code: "BCS702",
      name: "Parallel Computing",
      weeklyPeriods: 2,
      isLab: false,
      consecutivePeriods: 1,
      slots: [
        { day: "Thursday", periodNumber: 5, duration: 1 },
        { day: "Friday", periodNumber: 4, duration: 1 },
      ],
    },
    {
      id: 3,
      code: "BCSL707",
      name: "Information and Network Security Lab",
      weeklyPeriods: 2,
      isLab: true,
      consecutivePeriods: 2,
      slots: [
        { day: "Friday", periodNumber: 1, duration: 2 },
      ],
    },
    {
      id: 4,
      code: "BCSL706",
      name: "Parallel Computing Laboratory",
      weeklyPeriods: 2,
      isLab: true,
      consecutivePeriods: 2,
      slots: [
        { day: "Friday", periodNumber: 6, duration: 2 },
      ],
    },
  ];

  const userCtrlResult = await generateUserControlledTimetable({
    department: "CSE",
    semester: 7,
    section: "B",
    academicYear: "2026-27",
    subjects: userControlledSubjects,
    resolveConflicts: false,
  });

  assert(userCtrlResult.success === true, "7A: User-controlled generation succeeds with zero conflicts");
  assert(userCtrlResult.hasConflicts === false, "7A: Zero conflicts reported");
  assert(
    !userCtrlResult.conflicts.some((c) => c.type === "MISSING_PERIODS"),
    "7A: ZERO false MISSING_PERIODS for BCSL707 or BCSL706"
  );
  assert(userCtrlResult.totalSlotsScheduled === 8, `7A: Exactly 8 periods scheduled (got ${userCtrlResult.totalSlotsScheduled})`);

  console.log("\n==================================================================");
  console.log(`WEEKLY PERIOD VALIDATION SUITE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
}

runWeeklyPeriodsValidationTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
