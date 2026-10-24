const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { Op } = require('sequelize');

const API_URL = 'http://localhost:5000/api';

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

async function request(method, pathUrl, body = null, token = null) {
  const url = `${API_URL}${pathUrl}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runOptimizationTests() {
  console.log("==================================================================");
  console.log("VERIFYING CORE TIMETABLE GENERATION ALGORITHM & OPTIMIZATION ENGINE");
  console.log("Zero Clashes + Minimum Gaps Across Arbitrary Configurations");
  console.log("==================================================================\n");

  const {
    generateClashFreeTimetable,
    validateTimetable,
    calculateGapMetrics,
    PERIODS,
    WORKING_DAYS,
  } = require('../../services/timetableGeneratorService');

  // Authenticate as Admin to test APIs
  const authRes = await request('POST', '/auth/login', {
    username: 'Admin',
    password: 'Admin@123',
    role: 'admin',
  });
  assert(authRes.status === 200 && authRes.data.token, "Admin login successful for API testing");
  const adminToken = authRes.data.token;

  // -------------------------------------------------------------
  // TEST 1: Dynamic Configuration with 100% Consecutive Classes (0 Gaps, 0 Clashes)
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: Dynamic Configuration with 100% Consecutive Classes (0 Clashes, 0 Gaps) ---");
  const config1Subjects = [
    { id: 101, name: "Data Structures & Algorithms", code: "CS301", weeklyPeriods: 4, isLab: false, facultyId: 1, roomId: 1 },
    { id: 102, name: "Digital Logic Design", code: "CS302", weeklyPeriods: 4, isLab: false, facultyId: 2, roomId: 1 },
    { id: 103, name: "Operating Systems", code: "CS303", weeklyPeriods: 4, isLab: false, facultyId: 3, roomId: 1 },
    { id: 104, name: "Discrete Mathematics", code: "CS304", weeklyPeriods: 4, isLab: false, facultyId: 4, roomId: 1 },
    { id: 105, name: "Data Structures Lab", code: "CSL305", weeklyPeriods: 2, isLab: true, consecutivePeriods: 2, facultyId: 1, roomId: 2 },
  ];

  const res1 = await generateClashFreeTimetable({
    department: "ISE",
    semester: 3,
    section: "A",
    subjects: config1Subjects,
    academicYear: "2026-27",
  });

  assert(res1.success === true, "Config 1: Generator reported success = true");
  assert(res1.isValid === true, "Config 1: Independent validator confirms isValid = true");
  assert(res1.isPublishable === true, "Config 1: Independent validator confirms isPublishable = true");
  assert(res1.totalSlotsScheduled === 18, `Config 1: Scheduled exactly 18 required periods (got ${res1.totalSlotsScheduled})`);
  assert(res1.finalClashes.length === 0, `Config 1: Mandatory Zero Clashes satisfied (got ${res1.finalClashes.length} clashes)`);
  assert(res1.totalGaps === 0, `Config 1: Zero Gaps between classes achieved (got ${res1.totalGaps} gaps)`);
  assert(res1.compactnessPercentage === 100, `Config 1: 100% Contiguity achieved (${res1.compactnessPercentage}%)`);

  // Verify daily metrics in Config 1
  for (const [day, m] of Object.entries(res1.dailyMetrics)) {
    if (m.classCount > 0) {
      assert(m.isConsecutive === true, `Config 1: ${day} has consecutive periods with zero internal gaps (${m.classCount} classes, P${m.firstPeriod}-P${m.lastPeriod})`);
    }
  }

  // -------------------------------------------------------------
  // TEST 2: Configuration with Genuinely Unavoidable Gaps
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Configuration with Genuinely Unavoidable Gaps ---");
  const externalSlotsConstraint = [
    { day: "Monday", periodNumber: 2, facultyId: 99, facultyName: "Constrained Faculty", roomId: 10, roomName: "Room 10" },
    { day: "Monday", periodNumber: 3, facultyId: 99, facultyName: "Constrained Faculty", roomId: 10, roomName: "Room 10" },
    { day: "Monday", periodNumber: 4, facultyId: 99, facultyName: "Constrained Faculty", roomId: 10, roomName: "Room 10" },
  ];

  const config2Slots = [
    { day: "Monday", periodNumber: 1, subjectName: "Morning Theory", subjectCode: "TH1", facultyId: 99, facultyName: "Constrained Faculty", roomId: 1, duration: 1 },
    { day: "Monday", periodNumber: 5, subjectName: "Afternoon Theory", subjectCode: "TH2", facultyId: 99, facultyName: "Constrained Faculty", roomId: 1, duration: 1 },
  ];

  const val2 = validateTimetable(config2Slots, { externalSlots: externalSlotsConstraint, workingDays: ["Monday"] });
  assert(val2.isValid === true, "Config 2: No hard clashes occur despite constrained schedule");
  assert(val2.totalGaps === 3, `Config 2: Accurately calculated 3 free periods between P1 and P5 (P2, P3, P4) (got ${val2.totalGaps})`);
  assert(val2.dailyMetrics["Monday"].gapPeriods.join(",") === "2,3,4", "Config 2: Identified exact gap period numbers [2, 3, 4]");

  // -------------------------------------------------------------
  // TEST 3: Multi-Period Lab Boundary & Break Integrity
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Multi-Period Lab Boundary & Break Integrity ---");
  const config3Subjects = [
    { id: 201, name: "Network Lab", code: "CSL501", weeklyPeriods: 4, isLab: true, consecutivePeriods: 2, facultyId: 5, roomId: 2 },
    { id: 202, name: "Web Dev Lab", code: "CSL502", weeklyPeriods: 4, isLab: true, consecutivePeriods: 2, facultyId: 6, roomId: 2 },
    { id: 203, name: "Software Engineering", code: "CS503", weeklyPeriods: 4, isLab: false, facultyId: 7, roomId: 1 },
  ];

  const res3 = await generateClashFreeTimetable({
    department: "CSE",
    semester: 5,
    section: "B",
    subjects: config3Subjects,
    academicYear: "2026-27",
  });

  assert(res3.success === true, "Config 3: Multi-period lab generation succeeded");
  assert(res3.finalClashes.length === 0, "Config 3: Zero clashes in lab schedule");

  // Verify none of the lab slots cross Period 2-3 (Tea break) or Period 4-5 (Lunch break)
  let teaBreakCrossing = false;
  let lunchBreakCrossing = false;
  const labSlots = res3.slots.filter((s) => s.isLab);

  for (let i = 0; i < labSlots.length; i++) {
    for (let j = i + 1; j < labSlots.length; j++) {
      const a = labSlots[i];
      const b = labSlots[j];
      if (a.subjectId === b.subjectId && a.day === b.day) {
        if ((a.periodNumber === 2 && b.periodNumber === 3) || (a.periodNumber === 3 && b.periodNumber === 2)) {
          teaBreakCrossing = true;
        }
        if ((a.periodNumber === 4 && b.periodNumber === 5) || (a.periodNumber === 5 && b.periodNumber === 4)) {
          lunchBreakCrossing = true;
        }
      }
    }
  }
  assert(!teaBreakCrossing, "Config 3: Hard Constraint: Zero labs cross Tea Break (P2 to P3)");
  assert(!lunchBreakCrossing, "Config 3: Hard Constraint: Zero labs cross Lunch Break (P4 to P5)");

  // -------------------------------------------------------------
  // TEST 4: Multiple Shared Faculty and Shared Room Conflicts Across Timetables
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Cross-Section Shared Faculty & Room Isolation ---");
  const sectionASlots = [
    { day: "Tuesday", periodNumber: 1, facultyId: 2, facultyName: "Dr. Mohammed Khurram", roomId: 2, roomName: "PC Lab", department: "CSE", semester: 7, section: "A" },
    { day: "Tuesday", periodNumber: 2, facultyId: 2, facultyName: "Dr. Mohammed Khurram", roomId: 2, roomName: "PC Lab", department: "CSE", semester: 7, section: "A" },
  ];

  const sectionBSubjects = [
    { id: 301, name: "Parallel Computing Lab", code: "CSL701", weeklyPeriods: 2, isLab: true, consecutivePeriods: 2, facultyId: 2, roomId: 2 },
    { id: 302, name: "Information Security", code: "CS702", weeklyPeriods: 3, isLab: false, facultyId: 2, roomId: 1 },
  ];

  const res4 = await generateClashFreeTimetable({
    department: "CSE",
    semester: 7,
    section: "B",
    subjects: sectionBSubjects,
    academicYear: "2026-27",
    externalSlots: sectionASlots,
  });

  const secBTueClash = res4.slots.find(
    (s) => s.day === "Tuesday" && (s.periodNumber === 1 || s.periodNumber === 2) && s.facultyId === 2
  );
  assert(!secBTueClash, "Config 4: Shared faculty successfully scheduled without conflict against existing section");

  // -------------------------------------------------------------
  // TEST 5: Infeasible / Impossible Scheduling Configuration
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Impossible Scheduling Configuration (Honest Infeasibility) ---");
  const impossibleSubjects = [
    { id: 401, name: "Overloaded Subject 1", code: "OV1", weeklyPeriods: 25, isLab: false },
    { id: 402, name: "Overloaded Subject 2", code: "OV2", weeklyPeriods: 25, isLab: false },
  ];

  const res5 = await generateClashFreeTimetable({
    department: "ECE",
    semester: 4,
    section: "A",
    subjects: impossibleSubjects,
    academicYear: "2026-27",
  });

  assert(res5.success === false, "Config 5: Infeasible schedule correctly reported success = false");
  assert(res5.isValid === false, "Config 5: Infeasible schedule correctly reported isValid = false");
  assert(res5.isPublishable === false, "Config 5: Infeasible schedule correctly reported isPublishable = false");
  assert(res5.unresolvedConflicts.length > 0, "Config 5: Honest diagnostic message explaining capacity limits returned");
  assert(res5.unresolvedConflicts[0].reason.includes("exceed available weekly periods"), "Config 5: Accurately explains capacity exceeded");

  // -------------------------------------------------------------
  // TEST 6: Published Timetable Protection & Conflict Handling
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Published Timetable Protection & Conflict Handling ---");
  const listBefore = await request('GET', '/timetable/admin/list', null, adminToken);
  const activePublished = listBefore.data.find((t) => t.status === "published");
  assert(!!activePublished, "Protection: Baseline published timetable exists in system");

  const resResources = await request('GET', '/timetable/admin/resources', null, adminToken);
  const validSubject = resResources.data.subjects[0];
  const validFaculty = resResources.data.faculties[0];
  const validRoom = resResources.data.rooms.find(r => r.id !== 7) || resResources.data.rooms[1];

  const draftSlots = [
    {
      subjectId: validSubject.id,
      facultyId: validFaculty.id,
      roomId: validRoom.id,
      day: "Saturday",
      periodNumber: 5,
      startTime: "13:25",
      endTime: "14:20",
      isLab: false,
      duration: 1,
      batch: "All",
    },
    {
      subjectId: validSubject.id,
      facultyId: validFaculty.id,
      roomId: validRoom.id,
      day: "Saturday",
      periodNumber: 6,
      startTime: "14:20",
      endTime: "15:15",
      isLab: false,
      duration: 1,
      batch: "All",
    },
  ];

  const testDraftSave = await request('POST', '/timetable/admin/save', {
    name: `${activePublished.department} Sem ${activePublished.semester} Sec ${activePublished.section} Competing Draft`,
    department: activePublished.department,
    semester: activePublished.semester,
    section: activePublished.section,
    academicYear: activePublished.academicYear,
    status: "draft",
    slots: draftSlots,
  }, adminToken);

  assert(testDraftSave.status === 200, "Protection: Successfully saved experimental timetable as DRAFT");
  const draftId = testDraftSave.data.timetable.id;

  const conflictPublishAttempt = await request('PUT', `/timetable/admin/publish/${draftId}`, { confirmReplace: false }, adminToken);
  assert(conflictPublishAttempt.status === 409, "Protection: Publishing without confirmation returned 409 Conflict");
  assert(conflictPublishAttempt.data.requiresConfirmation === true, "Protection: Explicit confirmation requirement returned in payload");
  assert(conflictPublishAttempt.data.message.includes("already exists"), "Protection: Explanatory message identifies existing published schedule");

  const replacePublish = await request('PUT', `/timetable/admin/publish/${draftId}`, { confirmReplace: true }, adminToken);
  assert(replacePublish.status === 200, "Protection: Publishing with confirmReplace = true succeeded");
  assert(replacePublish.data.timetable.status === "published", "Protection: New timetable is now published");

  const listAfter = await request('GET', '/timetable/admin/list', null, adminToken);
  const oldTimetable = listAfter.data.find((t) => t.id === activePublished.id);
  assert(oldTimetable && oldTimetable.status === "draft", "Protection: Previous timetable safely demoted to draft mode without data loss");

  // Restore the original timetable back to published for baseline
  await request('PUT', `/timetable/admin/publish/${activePublished.id}`, { confirmReplace: true }, adminToken);

  // Clean up test draft timetable
  await request('DELETE', `/timetable/admin/${draftId}`, null, adminToken);

  // -------------------------------------------------------------
  // TEST 7: Independent Validator Catches All Injected Clashes
  // -------------------------------------------------------------
  console.log("\n--- TEST 7: Independent Validator Injected Clashes ---");

  // 7.1 Section Clash injection
  const sectionClashSlots = [
    { day: "Monday", periodNumber: 1, subjectName: "Sub A", department: "CSE", semester: 7, section: "A", batch: "All" },
    { day: "Monday", periodNumber: 1, subjectName: "Sub B", department: "CSE", semester: 7, section: "A", batch: "All" },
  ];
  const valSec = validateTimetable(sectionClashSlots);
  assert(!valSec.isValid, "Validator: Section clash detected (isValid = false)");
  assert(valSec.sectionClashes.length > 0, "Validator: SECTION_CLASH violation recorded");

  // 7.2 Faculty Clash injection
  const facultyClashSlots = [
    { day: "Wednesday", periodNumber: 2, subjectName: "Sub A", facultyId: 10, facultyName: "Dr. Smith", roomId: 1 },
    { day: "Wednesday", periodNumber: 2, subjectName: "Sub B", facultyId: 10, facultyName: "Dr. Smith", roomId: 2 },
  ];
  const valFac = validateTimetable(facultyClashSlots);
  assert(!valFac.isValid, "Validator: Faculty clash detected (isValid = false)");
  assert(valFac.facultyClashes.length > 0, "Validator: FACULTY_CLASH violation recorded");

  // 7.3 Room Clash injection
  const roomClashSlots = [
    { day: "Thursday", periodNumber: 3, subjectName: "Sub A", roomId: 5, roomName: "Room 101" },
    { day: "Thursday", periodNumber: 3, subjectName: "Sub B", roomId: 5, roomName: "Room 101" },
  ];
  const valRoom = validateTimetable(roomClashSlots);
  assert(!valRoom.isValid, "Validator: Room clash detected (isValid = false)");
  assert(valRoom.roomClashes.length > 0, "Validator: ROOM_CLASH violation recorded");

  // 7.4 Multi-period Break split injection
  const breakSplitSlots = [
    { day: "Friday", periodNumber: 2, duration: 2, isLab: true, subjectName: "Lab Split" },
  ];
  const valBreak = validateTimetable(breakSplitSlots);
  assert(!valBreak.isValid, "Validator: Tea break crossing detected (isValid = false)");
  assert(valBreak.breakSplitViolations.length > 0, "Validator: BREAK_CROSSING violation recorded");

  // -------------------------------------------------------------
  // TEST 8: Gap Metrics Calculation & Precision
  // -------------------------------------------------------------
  console.log("\n--- TEST 8: Gap Metrics Calculation & Precision ---");
  const gapSampleSlots = [
    { day: "Monday", periodNumber: 1 },
    { day: "Monday", periodNumber: 3 },
    { day: "Monday", periodNumber: 6 },
  ];
  const sampleMetrics = calculateGapMetrics(gapSampleSlots, ["Monday"]);
  assert(sampleMetrics.totalGaps === 3, `Gap Math: Accurately computed 3 gaps (got ${sampleMetrics.totalGaps})`);
  assert(sampleMetrics.totalSpan === 6, `Gap Math: Accurately computed total span 6 (P1 to P6) (got ${sampleMetrics.totalSpan})`);
  assert(sampleMetrics.dailyMetrics["Monday"].gapPeriods.join(",") === "2,4,5", "Gap Math: Identified exact free periods [2, 4, 5]");

  // -------------------------------------------------------------
  // TEST 9: 27-Period CSE Semester 7 Collegiate Schedule
  // -------------------------------------------------------------
  console.log("\n--- TEST 9: 27-Period CSE Sem 7 Curriculum (MP708 4-Period Blocks + Labs + Zero Gaps) ---");
  const cseSem7Subjects = [
    { id: 10, name: "Information and Network Security", code: "BCS701", weeklyPeriods: 2, isLab: false, consecutivePeriods: 1, facultyId: 7, roomId: 7 },
    { id: 11, name: "Parallel Computing", code: "BCS702", weeklyPeriods: 2, isLab: false, consecutivePeriods: 1, facultyId: 8, roomId: 7 },
    { id: 12, name: "Natural Language Processing", code: "BCS703A", weeklyPeriods: 3, isLab: false, consecutivePeriods: 1, facultyId: 9, roomId: 7 },
    { id: 13, name: "Information and Network Security Lab", code: "BCSL707", weeklyPeriods: 2, isLab: true, consecutivePeriods: 2, facultyId: 10, roomId: 8 },
    { id: 14, name: "Parallel Computing Laboratory", code: "BCSL706", weeklyPeriods: 2, isLab: true, consecutivePeriods: 2, facultyId: 11, roomId: 8 },
    { id: 15, name: "Major Project Phase II", code: "MP708", weeklyPeriods: 12, isLab: false, consecutivePeriods: 4, facultyId: 12, roomId: 7 },
    { id: 16, name: "Proctoring", code: "PROCT", weeklyPeriods: 1, isLab: false, consecutivePeriods: 1, facultyId: 13, roomId: 7 },
    { id: 17, name: "Departmental Activities", code: "DA", weeklyPeriods: 1, isLab: false, consecutivePeriods: 1, facultyId: 7, roomId: 7 },
    { id: 18, name: "IIC Activities", code: "IIC", weeklyPeriods: 2, isLab: false, consecutivePeriods: 2, facultyId: 8, roomId: 7 },
  ];

  const res9 = await generateClashFreeTimetable({
    department: "CSE",
    semester: 7,
    section: "B",
    academicYear: "2026-27",
    subjects: cseSem7Subjects,
  });

  assert(res9.success === true, "CSE Sem 7: Generation reported success = true");
  assert(res9.totalSlotsScheduled === 27, `CSE Sem 7: Scheduled all 27 required periods (got ${res9.totalSlotsScheduled})`);
  assert(res9.finalClashes.length === 0, `CSE Sem 7: Zero hard clashes (got ${res9.finalClashes.length})`);
  assert(res9.totalGaps === 0, `CSE Sem 7: Zero internal gaps achieved across all instructional days (got ${res9.totalGaps})`);
  assert(res9.unresolvedConflicts.length === 0, "CSE Sem 7: Zero unresolved conflicts");
  assert(res9.isValid === true, "CSE Sem 7: Independent validator marks isValid = true");
  assert(res9.isPublishable === true, "CSE Sem 7: Independent validator marks isPublishable = true");

  console.log("\n==================================================================");
  console.log(`OPTIMIZATION SUITE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
}

runOptimizationTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
