const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const jwt = require("jsonwebtoken");

function api(pathUrl, method = "GET", body = null, token = null) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path: `/api${pathUrl}`,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let resBody = "";
      res.on("data", (chunk) => (resBody += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(resBody) });
        } catch {
          resolve({ status: res.statusCode, data: resBody });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log("==================================================================");
  console.log("VERIFYING ATTENDANCE SYSTEM ENHANCEMENTS & SECURITY CONTROLS");
  console.log("==================================================================");

  // 1. Authenticate Admin and Student 1
  console.log("\n--- Step 1: Authentication ---");
  const adminLogin = await api("/auth/login", "POST", { username: "Admin", password: "Admin@123", role: "admin" });
  assert(adminLogin.status === 200 && adminLogin.data?.token, "Admin login successful");
  const adminToken = adminLogin.data.token;

  const studentToken = jwt.sign(
    { id: 2, role: "student", studentId: 1, username: "King" },
    process.env.JWT_SECRET || "Allah@Mohammed$Sadiq%Huzaifa!1215LeaveManagementSystem",
    { expiresIn: "1d" }
  );
  assert(studentToken, "Student 1 (Mohammed Huzaifa) authentication token ready");
  const studentId = 1;

  // 2. Test Student #1 Department & Section Resolution Bug Fix
  console.log("\n--- Step 2: Student #1 Department & Subject Resolution ---");
  const studentTimetable = await api("/timetable/my-timetable", "GET", null, studentToken);
  assert(studentTimetable.status === 200, "Student /my-timetable returns 200 OK");
  assert(studentTimetable.data?.hasTimetable === true, "Student #1 timetable found (Department normalization resolved 'BE (CSE)' <-> 'CSE')");
  assert(studentTimetable.data?.timetable?.department === "CSE", "Timetable department matches CSE");
  assert(Object.keys(studentTimetable.data?.days || {}).length > 0, "Student receives daily schedule breakdown");

  const analytics = await api("/analytics/subject-attendance", "GET", null, studentToken);
  assert(analytics.status === 200, "Student /analytics/subject-attendance returns 200 OK");
  assert(analytics.data?.hasTimetable === true, "Analytics confirms student has timetable");
  assert(analytics.data?.subjects?.length > 0, `Mapped ${analytics.data?.subjects?.length} subjects to student's timetable`);
  assert(analytics.data?.overall?.totalConducted > 0, `Total conducted classes calculated: ${analytics.data?.overall?.totalConducted}`);
  assert(analytics.data?.overall?.present > 0, `Total present classes calculated: ${analytics.data?.overall?.present}`);
  assert(analytics.data?.overall?.percentage > 0, `Overall attendance calculated: ${analytics.data?.overall?.percentage}%`);

  // 3. Security & Role Checks: Student Self-Marking Disallowed
  console.log("\n--- Step 3: Role Separation & Student Self-Marking Lockout ---");
  const todayStr = new Date().toISOString().split("T")[0];
  const studentSelfMark = await api(
    "/attendance/mark",
    "POST",
    { studentId, date: todayStr, status: "present" },
    studentToken
  );
  assert(studentSelfMark.status === 403, "Student self-marking blocked with 403 Forbidden");

  const studentBatchMark = await api(
    "/attendance/batch-mark",
    "POST",
    { date: todayStr, records: [{ studentId, status: "present" }] },
    studentToken
  );
  assert(studentBatchMark.status === 403, "Student batch marking blocked with 403 Forbidden");

  const studentClassSheet = await api(
    `/attendance/class-sheet?date=${todayStr}&department=CSE&semester=7&section=A`,
    "GET",
    null,
    studentToken
  );
  assert(studentClassSheet.status === 403, "Student access to class attendance sheet blocked with 403 Forbidden");

  // 4. Future Date Attendance Blocking
  console.log("\n--- Step 4: Future Date Validation ---");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const adminFutureSingleMark = await api(
    "/attendance/mark",
    "POST",
    { studentId, date: tomorrowStr, status: "present" },
    adminToken
  );
  assert(adminFutureSingleMark.status === 400, "Single-day future date attendance rejected with 400 Bad Request");

  const adminFutureBatchMark = await api(
    "/attendance/batch-mark",
    "POST",
    { date: tomorrowStr, records: [{ studentId, status: "present" }] },
    adminToken
  );
  assert(adminFutureBatchMark.status === 400, "Batch future date attendance rejected with 400 Bad Request");

  // 5. 1-Click Class Attendance Register API
  console.log("\n--- Step 5: 1-Click Class Attendance Register ---");
  const classSheetRes = await api(
    `/attendance/class-sheet?date=${todayStr}&department=CSE&semester=7&section=B`,
    "GET",
    null,
    adminToken
  );
  assert(classSheetRes.status === 200, "Admin class-sheet query returns 200 OK");
  assert(Array.isArray(classSheetRes.data?.roster), "Class sheet returns student roster array");
  assert(classSheetRes.data?.roster?.length >= 1, `Found ${classSheetRes.data?.roster?.length} students enrolled in CSE 7th Sem Section B`);

  const batchMarkRes = await api(
    "/attendance/batch-mark",
    "POST",
    {
      date: todayStr,
      records: [{ studentId, status: "present" }],
    },
    adminToken
  );
  assert(batchMarkRes.status === 200, "Batch attendance mark saved successfully");
  assert(batchMarkRes.data?.savedCount === 1, "Batch mark saved exactly 1 student record");

  // Verify class sheet reflects updated status
  const updatedSheetRes = await api(
    `/attendance/class-sheet?date=${todayStr}&department=CSE&semester=7&section=B`,
    "GET",
    null,
    adminToken
  );
  const studentEntry = (updatedSheetRes.data?.roster || []).find((s) => s.id === studentId);
  assert(studentEntry && studentEntry.status === "present", "Class attendance sheet accurately reflects marked status for student");

  // 6. Leave Approval Attendance Synchronization
  console.log("\n--- Step 6: Leave Approval Synchronization ---");
  const testLeaveDate = "2026-09-02";
  const applyLeaveRes = await api(
    "/leave/apply",
    "POST",
    {
      leaveType: "Sick Leave",
      fromDate: testLeaveDate,
      toDate: testLeaveDate,
      reason: "Medical consultation and recuperation",
    },
    studentToken
  );
  assert(applyLeaveRes.status === 201, "Test leave submitted successfully");
  const leaveId = applyLeaveRes.data?.leave?.id || applyLeaveRes.data?.id;

  if (leaveId) {
    // Approve leave as Admin
    const approveRes = await api(`/leave/approve/${leaveId}`, "POST", { status: "approved" }, adminToken);
    assert(approveRes.status === 200, "Admin approved leave request");

    // Check calendar for that date: must be on_leave
    const monthAtt = await api(`/attendance/${studentId}/2026/9`, "GET", null, studentToken);
    assert(monthAtt.status === 200, "Attendance calendar fetched for leave month");
    assert(monthAtt.data["2"] === "on_leave", "Approved leave date automatically recorded with status: 'on_leave'");

    // Check class sheet for that date: hasApprovedLeave must be true
    const leaveDateSheet = await api(
      `/attendance/class-sheet?date=${testLeaveDate}&department=CSE&semester=7&section=B`,
      "GET",
      null,
      adminToken
    );
    const leaveStudent = (leaveDateSheet.data?.roster || []).find((s) => s.id === studentId);
    assert(leaveStudent && leaveStudent.hasApprovedLeave === true, "Class roster detects approved leave flag");
    assert(leaveStudent && leaveStudent.status === "on_leave", "Class roster presents 'on_leave' status for student with approved leave");

    // Reject/revert leave and verify sync
    const rejectRes = await api(`/leave/reject/${leaveId}`, "POST", {}, adminToken);
    assert(rejectRes.status === 200, "Admin reverted/rejected leave");
    const monthAttReverted = await api(`/attendance/${studentId}/2026/9`, "GET", null, studentToken);
    assert(monthAttReverted.data["2"] === undefined, "'on_leave' attendance record cleared upon leave rejection");
  }

  console.log("\n==================================================================");
  console.log(`ATTENDANCE IMPROVEMENTS SUMMARY: ${passed} PASSED, ${failed} FAILED out of ${passed + failed} ASSERTIONS`);
  console.log(`PASS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
