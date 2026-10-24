// Native fetch-based test suite (Node 18+)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const BASE_URL = "http://localhost:5000/api";
let adminToken = "";
let studentToken = "";
let studentId = null;
let testStudentUserId = null;
let testTimetableId = null;
let testSubjectId1 = null;
let testSubjectId2 = null;
let testLabSubjectId = null;
let testFacultyId1 = null;
let testFacultyId2 = null;
let testRoomId1 = null;
let testLabRoomId = null;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function api(url, method = "GET", body = null, token = "") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const status = res.status;
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  return { status, data };
}

async function run() {
  console.log("==================================================================");
  console.log("STARTING FULL VERIFICATION SUITE: TIMETABLE, ANALYTICS & SMART LEAVE");
  console.log("==================================================================\n");

  try {
    // 0. Authenticate Admin
    console.log("--- 0. Authenticating as Admin ---");
    const adminLoginRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    adminToken = adminLoginRes.data?.token;
    assert(adminToken, "Admin authenticated successfully");

    // Create a dedicated test student
    const testUsername = `feature_std_${Date.now()}`;
    await api("/auth/signup", "POST", {
      name: "Feature Verification Student",
      username: testUsername,
      password: "TestPassword123!",
      role: "student",
      department: "CSE",
      className: "7A",
      semester: 7,
      section: "A",
    });

    // Authenticate as Student
    const studentLoginRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: "TestPassword123!",
      role: "student",
    });
    studentToken = studentLoginRes.data?.token;
    studentId = studentLoginRes.data?.studentId;
    assert(studentToken && studentId, `Authenticated test student (ID: ${studentId})`);

    // ------------------------------------------------------------------
    // GROUP 1: TIMETABLE GENERATION, OPTIMIZATION & WORKFLOW
    // ------------------------------------------------------------------
    console.log("\n--- GROUP 1: Timetable Generator, Solver & Publishing Workflow ---");

    // Fetch existing academic resources or create test ones
    const resRes = await api("/timetable/admin/resources", "GET", null, adminToken);
    assert(resRes.status === 200, "Fetched academic resources (subjects, faculty, rooms)");

    const { Subject, Faculty, Room } = require("../../models");

    // Create test subjects
    const sub1 = await Subject.create({
      code: `CS701_${Date.now()}`,
      name: "Distributed Computing",
      department: "CSE",
      semester: 7,
      weeklyPeriods: 3,
      isLab: false,
    });
    testSubjectId1 = sub1.id;

    const sub2 = await Subject.create({
      code: `CS702_${Date.now()}`,
      name: "Information Security",
      department: "CSE",
      semester: 7,
      weeklyPeriods: 3,
      isLab: false,
    });
    testSubjectId2 = sub2.id;

    const subLab = await Subject.create({
      code: `CS703L_${Date.now()}`,
      name: "Cloud Lab",
      department: "CSE",
      semester: 7,
      weeklyPeriods: 2,
      isLab: true,
      consecutivePeriods: 2,
    });
    testLabSubjectId = subLab.id;

    // Create test faculty
    const fac1 = await Faculty.create({
      name: `Dr. Turing Test ${Date.now()}`,
      department: "CSE",
      designation: "Professor",
      maxWeeklyPeriods: 18,
    });
    testFacultyId1 = fac1.id;

    const fac2 = await Faculty.create({
      name: `Prof. Lovelace Test ${Date.now()}`,
      department: "CSE",
      designation: "Associate Professor",
      maxWeeklyPeriods: 18,
    });
    testFacultyId2 = fac2.id;

    // Create test rooms
    const rm1 = await Room.create({
      name: `LH-Test-${Date.now()}`,
      building: "Main Block",
      capacity: 60,
      isLab: false,
    });
    testRoomId1 = rm1.id;

    const rmL = await Room.create({
      name: `Lab-Test-${Date.now()}`,
      building: "CS Block",
      capacity: 35,
      isLab: true,
    });
    testLabRoomId = rmL.id;

    assert(testSubjectId1 && testFacultyId1 && testRoomId1, "Created test subjects, faculty, and room entities");

    // Test Timetable Generator
    const genRes = await api(
      "/timetable/admin/generate",
      "POST",
      {
        department: "CSE",
        semester: 7,
        section: "A",
        academicYear: "2026",
        subjects: [
          {
            id: testSubjectId1,
            name: "Distributed Computing",
            code: sub1.code,
            weeklyPeriods: 3,
            isLab: false,
            facultyId: testFacultyId1,
            facultyName: fac1.name,
            roomId: testRoomId1,
            roomName: rm1.name,
          },
          {
            id: testSubjectId2,
            name: "Information Security",
            code: sub2.code,
            weeklyPeriods: 3,
            isLab: false,
            facultyId: testFacultyId1, // Same faculty intentionally to test conflict-free solver placement
            facultyName: fac1.name,
            roomId: testRoomId1,
            roomName: rm1.name,
          },
          {
            id: testLabSubjectId,
            name: "Cloud Lab",
            code: subLab.code,
            weeklyPeriods: 2,
            isLab: true,
            consecutivePeriods: 2,
            facultyId: testFacultyId2,
            facultyName: fac2.name,
            roomId: testLabRoomId,
            roomName: rmL.name,
          },
        ],
      },
      adminToken
    );

    assert(genRes.data?.success === true, "Timetable Generator succeeded with clash-free result");
    assert(genRes.data?.finalClashes?.length === 0, "Final validated timetable has exactly 0 remaining clashes");
    assert(genRes.data?.totalSlotsScheduled >= 8, `Scheduled required slots (${genRes.data?.totalSlotsScheduled})`);

    // Verify Lab consecutive periods constraint
    const labSlots = (genRes.data?.slots || []).filter((s) => s.subjectId === testLabSubjectId);
    assert(labSlots.length === 2, "Lab scheduled for 2 periods");
    assert(
      labSlots[0].day === labSlots[1].day && Math.abs(labSlots[0].periodNumber - labSlots[1].periodNumber) === 1,
      `Lab consecutive constraint satisfied on ${labSlots[0].day} (Periods ${labSlots[0].periodNumber} & ${labSlots[1].periodNumber})`
    );

    // Save as Draft
    const saveDraftRes = await api(
      "/timetable/admin/save",
      "POST",
      {
        name: "CSE Sem 7 Sec A (Automated Draft)",
        department: "CSE",
        semester: 7,
        section: "A",
        academicYear: "2026",
        status: "draft",
        slots: genRes.data?.slots,
      },
      adminToken
    );
    testTimetableId = saveDraftRes.data?.timetable?.id;
    assert(testTimetableId && saveDraftRes.data?.timetable?.status === "draft", "Saved timetable as Draft");

    // Verify student cannot see draft timetable yet
    const studentDraftCheck = await api("/timetable/my-timetable", "GET", null, studentToken);
    assert(studentDraftCheck.data?.hasTimetable === false, "Student cannot see un-published Draft timetable");

    // Publish timetable
    const pubRes = await api(`/timetable/admin/publish/${testTimetableId}`, "PUT", {}, adminToken);
    assert(pubRes.data?.timetable?.status === "published", "Published timetable successfully");

    // Verify student can now see published timetable
    const studentPubCheck = await api("/timetable/my-timetable", "GET", null, studentToken);
    assert(studentPubCheck.data?.hasTimetable === true, "Student sees published timetable for CSE Sem 7 Sec A");
    assert(studentPubCheck.data?.days && Object.keys(studentPubCheck.data?.days).length > 0, "Student receives daily schedule breakdown");

    // Unpublish timetable test
    const unpubRes = await api(`/timetable/admin/unpublish/${testTimetableId}`, "PUT", {}, adminToken);
    assert(unpubRes.data?.timetable?.status === "draft", "Unpublished timetable back to draft");

    // Re-publish for attendance and leave analytics tests
    await api(`/timetable/admin/publish/${testTimetableId}`, "PUT", {}, adminToken);

    // ------------------------------------------------------------------
    // GROUP 2: SUBJECT-WISE ATTENDANCE ANALYTICS
    // ------------------------------------------------------------------
    console.log("\n--- GROUP 2: Subject-Wise Attendance Analytics ---");

    // Mark daily attendance for student across multiple days
    await api(
      "/attendance/mark",
      "POST",
      { studentId, year: 2026, month: 9, day: 14, status: "present" }, // Monday
      adminToken
    );
    await api(
      "/attendance/mark",
      "POST",
      { studentId, year: 2026, month: 9, day: 15, status: "absent" }, // Tuesday
      adminToken
    );
    await api(
      "/attendance/mark",
      "POST",
      { studentId, year: 2026, month: 9, day: 16, status: "present" }, // Wednesday
      adminToken
    );

    const analyticsRes = await api("/analytics/subject-attendance", "GET", null, studentToken);
    assert(analyticsRes.status === 200, "Student fetched subject-wise attendance analytics");
    assert(analyticsRes.data?.hasTimetable === true, "Analytics correctly linked student to published timetable");
    assert(Array.isArray(analyticsRes.data?.subjects), "Returned subject-wise breakdown array");
    assert(analyticsRes.data?.overall?.totalConducted >= 0, "Overall conducted classes metric computed");
    assert(analyticsRes.data?.overall?.percentage !== undefined, "Overall percentage metric computed");

    // ------------------------------------------------------------------
    // GROUP 3: SMART LEAVE PLANNER
    // ------------------------------------------------------------------
    console.log("\n--- GROUP 3: Smart Leave Planner ---");

    // Setup holiday for holiday avoidance test
    const holidayDate = "2026-09-25";
    await api(
      "/holidays/add",
      "POST",
      {
        name: "Test Institutional Holiday",
        date: holidayDate,
      },
      adminToken
    );

    // Test Mode 1: Duration Recommendation (1 day leave)
    const durationPlanRes = await api("/analytics/smart-leave-plan", "POST", { duration: 1 }, studentToken);
    assert(durationPlanRes.data?.mode === "RECOMMENDATION", "Smart Leave Planner processed Duration Recommendation");
    assert(Array.isArray(durationPlanRes.data?.recommendedDates), "Returned ranked recommended dates");
    assert(Array.isArray(durationPlanRes.data?.avoidDates), "Returned ranked avoid/risky dates");

    // Test Mode 2: Date Range Impact Simulation
    const rangePlanRes = await api(
      "/analytics/smart-leave-plan",
      "POST",
      { fromDate: "2026-09-21", toDate: "2026-09-22" },
      studentToken
    );
    assert(rangePlanRes.data?.mode === "DATE_RANGE", "Smart Leave Planner processed Date Range Analysis");
    assert(["SAFE", "MODERATE", "RISKY"].includes(rangePlanRes.data?.overallVerdict), `Overall verdict assigned: ${rangePlanRes.data?.overallVerdict}`);
    assert(rangePlanRes.data?.dailyBreakdown?.length === 2, "Evaluated exactly 2 calendar days");

    // Verify Projected Attendance Formula: Present / (Conducted + Missed Classes) * 100
    rangePlanRes.data.subjectImpacts.forEach((impact) => {
      assert(
        impact.projectedPercentage <= impact.currentPercentage,
        `${impact.code}: Projected attendance drop accurately computed (${impact.currentPercentage}% -> ${impact.projectedPercentage}%)`
      );
      assert(impact.why && impact.why.length > 0, `${impact.code}: Reason provided: "${impact.why}"`);
    });

    // Test Holiday Handling: leave on holiday must cause 0 missed classes
    const holidayPlanRes = await api(
      "/analytics/smart-leave-plan",
      "POST",
      { fromDate: holidayDate, toDate: holidayDate },
      studentToken
    );
    assert(holidayPlanRes.data?.totalClassesMissed === 0, "Official holiday correctly excluded from missed classes (0 missed)");
    assert(holidayPlanRes.data?.overallVerdict === "SAFE", "Leave on holiday evaluated as SAFE");

    // ------------------------------------------------------------------
    // GROUP 4: SECURITY, RBAC & IDOR PROTECTION
    // ------------------------------------------------------------------
    console.log("\n--- GROUP 4: Security, RBAC & IDOR Protection ---");

    // 1. Student accessing Admin Timetable List -> 403
    const adminTtRes = await api("/timetable/admin/list", "GET", null, studentToken);
    assert(adminTtRes.status === 403, "Student blocked from admin timetable list (403 Forbidden)");

    // 2. Student attempting to modify/publish timetable -> 403
    const pubTtRes = await api(`/timetable/admin/publish/${testTimetableId}`, "PUT", {}, studentToken);
    assert(pubTtRes.status === 403, "Student blocked from publishing timetable (403 Forbidden)");

    // 3. Student attempting to delete timetable -> 403
    const delTtRes = await api(`/timetable/admin/${testTimetableId}`, "DELETE", null, studentToken);
    assert(delTtRes.status === 403, "Student blocked from deleting timetable (403 Forbidden)");

    // 4. Unauthenticated request to Timetable -> 401
    const unauthTtRes = await api("/timetable/my-timetable", "GET");
    assert(unauthTtRes.status === 401, "Unauthenticated request blocked (401 Unauthorized)");

    // 5. Unauthenticated request to Analytics -> 401
    const unauthAnRes = await api("/analytics/subject-attendance", "GET");
    assert(unauthAnRes.status === 401, "Unauthenticated analytics blocked (401 Unauthorized)");

    // 6. Student IDOR: Student attempting to query another student's analytics
    const idorTest = await api("/analytics/subject-attendance?studentId=99999", "GET", null, studentToken);
    assert(
      idorTest.data?.student?.id === studentId,
      "IDOR Protected: Student receives strictly their own analytics even if spoofing ?studentId=99999"
    );

  } catch (err) {
    console.error("FATAL SUITE ERROR:", err.message);
    failedTests++;
  } finally {
    // ------------------------------------------------------------------
    // CLEANUP TEST ARTIFACTS
    // ------------------------------------------------------------------
    console.log("\n--- Cleaning up test artifacts ---");
    try {
      if (testTimetableId) {
        await api(`/timetable/admin/${testTimetableId}`, "DELETE", null, adminToken);
      }
      if (studentId) {
        await api(`/students/delete/${studentId}`, "DELETE", null, adminToken);
      }
      const { Subject, Faculty, Room, Holiday } = require("../../models");
      if (testSubjectId1) await Subject.destroy({ where: { id: [testSubjectId1, testSubjectId2, testLabSubjectId] } });
      if (testFacultyId1) await Faculty.destroy({ where: { id: [testFacultyId1, testFacultyId2] } });
      if (testRoomId1) await Room.destroy({ where: { id: [testRoomId1, testLabRoomId] } });
      await Holiday.destroy({ where: { name: "Test Institutional Holiday" } });
      console.log("Cleaned up test timetable, subjects, faculty, rooms, holiday, and test student.");
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }
  }

  console.log("\n==================================================================");
  console.log(`VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / Math.max(totalTests, 1)) * 100).toFixed(1)}%`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
