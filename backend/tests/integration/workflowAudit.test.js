const API = 'http://localhost:5000/api';

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

async function request(method, path, body = null, token = null) {
  const url = `${API}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runDeepAudit() {
  console.log("==================================================================");
  console.log("DEEP BACKEND, WORKFLOWS & SECURITY INTEGRITY AUDIT");
  console.log("API Target:", API);
  console.log("==================================================================\n");

  let studentToken = '';
  let studentData = null;
  let adminToken = '';
  let adminData = null;
  let testLeaveId = null;

  try {
    // ----------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & TOKEN GENERATION
    // ----------------------------------------------------------------
    console.log("--- 1. Authentication & Role Validation ---");

    const testUsername = `audit_std_${Date.now()}`;
    const testPassword = "AuditPass123!";
    await request('POST', '/auth/signup', {
      name: "Workflow Audit Student",
      username: testUsername,
      password: testPassword,
      role: "student",
      department: "CSE",
      className: "7B",
      semester: 7,
      section: "B",
    });
    
    // Student Login
    const stdLoginRes = await request('POST', '/auth/login', {
      username: testUsername,
      password: testPassword,
      role: 'student',
    });
    assert(stdLoginRes.status === 200 && stdLoginRes.data.token, "Auth: Student login successful and returned JWT");
    studentToken = stdLoginRes.data.token;
    studentData = stdLoginRes.data.user;
    assert(studentData.role === 'student', "Auth: Authenticated user role is 'student'");
    assert(studentData.studentId !== undefined, "Auth: Student ID attached to user payload");

    // Admin Login
    const admLoginRes = await request('POST', '/auth/login', {
      username: 'Admin',
      password: 'Admin@123',
      role: 'admin',
    });
    assert(admLoginRes.status === 200 && admLoginRes.data.token, "Auth: Admin login successful and returned JWT");
    adminToken = admLoginRes.data.token;
    adminData = admLoginRes.data.user;
    assert(adminData.role === 'admin', "Auth: Authenticated user role is 'admin'");

    // Role mismatch check: Admin credentials with student role
    const misAdminRes = await request('POST', '/auth/login', {
      username: 'Admin',
      password: 'Admin@123',
      role: 'student',
    });
    assert(misAdminRes.status === 403, "Security: Role mismatch (Admin in Student portal) rejected with HTTP 403 Forbidden");

    // Role mismatch check: Student credentials with admin role
    const misStdRes = await request('POST', '/auth/login', {
      username: testUsername,
      password: testPassword,
      role: 'admin',
    });
    assert(misStdRes.status === 403, "Security: Role mismatch (Student in Admin portal) rejected with HTTP 403 Forbidden");

    // Wrong password check
    const wrongPassRes = await request('POST', '/auth/login', {
      username: testUsername,
      password: 'WrongPassword999!',
      role: 'student',
    });
    assert(wrongPassRes.status === 401, "Security: Wrong password rejected with HTTP 401 Unauthorized");

    // ----------------------------------------------------------------
    // SECTION 2: STUDENT PROFILE & TIMETABLE INTEGRITY
    // ----------------------------------------------------------------
    console.log("\n--- 2. Student Profile & Timetable View ---");

    // Get Student Profile
    const profileRes = await request('GET', `/students/${studentData.studentId}`, null, studentToken);
    assert(profileRes.status === 200, "Student: Fetched own profile");
    assert(profileRes.data.name && profileRes.data.department, "Student: Profile contains name and department");

    // Get Student Timetable
    const ttRes = await request('GET', '/timetable/my-timetable', null, studentToken);
    assert(ttRes.status === 200, "Student Timetable: Endpoint returned HTTP 200");
    assert(ttRes.data.hasTimetable === true, "Student Timetable: Has active published timetable");
    assert(Array.isArray(ttRes.data.timetable?.slots) && ttRes.data.timetable.slots.length > 0, `Student Timetable: Returned ${ttRes.data.timetable?.slots?.length} slots`);
    assert(typeof ttRes.data.days === 'object' && Object.keys(ttRes.data.days).length > 0, "Student Timetable: Days schedule map returned");

    // Verify slots structure
    const sampleSlot = ttRes.data.timetable.slots[0];
    assert(sampleSlot.day && sampleSlot.startTime && sampleSlot.endTime, "Student Timetable: Slot contains day, startTime, endTime");
    assert(sampleSlot.subject && sampleSlot.subject.name, "Student Timetable: Slot populated with Subject details");

    // ----------------------------------------------------------------
    // SECTION 3: SMART LEAVE PLANNER & ATTENDANCE ANALYTICS
    // ----------------------------------------------------------------
    console.log("\n--- 3. Smart Leave Planner & Analytics Engine ---");

    // Subject-wise analytics
    const analyticsRes = await request('GET', '/analytics/subject-attendance', null, studentToken);
    assert(analyticsRes.status === 200, "Analytics: Fetched subject-wise attendance analytics");
    assert(typeof analyticsRes.data.overall?.percentage === 'number', `Analytics: Overall attendance pct: ${analyticsRes.data.overall?.percentage}%`);
    assert(Array.isArray(analyticsRes.data.subjects), "Analytics: Subjects breakdown array returned");

    // Smart Leave Planner Simulation
    // Pick upcoming dates: 2026-09-28 (Monday) to 2026-09-30 (Wednesday)
    const planRes = await request('POST', '/analytics/smart-leave-plan', {
      fromDate: '2026-09-28',
      toDate: '2026-09-30',
      reason: 'Academic Research Symposium',
    }, studentToken);
    assert(planRes.status === 200, "Smart Leave: Simulation returned HTTP 200");
    assert(typeof planRes.data.totalClassesMissed === 'number', `Smart Leave: Classes impacted calculated: ${planRes.data.totalClassesMissed}`);
    assert(planRes.data.overallVerdict && ['SAFE', 'MODERATE', 'RISKY'].includes(planRes.data.overallVerdict), `Smart Leave: Risk classification: ${planRes.data.overallVerdict}`);
    assert(planRes.data.summaryExplanation !== undefined, `Smart Leave: Recommendation explanation: ${planRes.data.summaryExplanation}`);

    // ----------------------------------------------------------------
    // SECTION 4: LEAVE APPLICATION & ADMIN APPROVAL CYCLE
    // ----------------------------------------------------------------
    console.log("\n--- 4. Leave Application & Attendance Synchronization ---");

    // Student applies for leave
    const applyRes = await request('POST', '/leave/apply', {
      leaveType: 'Medical',
      fromDate: '2026-09-28',
      toDate: '2026-09-29',
      reason: 'E2E Automated Verification Medical Leave',
    }, studentToken);
    assert(applyRes.status === 201 && applyRes.data.success, "Leave: Application submitted successfully");
    testLeaveId = applyRes.data.leave.id;
    assert(applyRes.data.leave.status === 'pending', "Leave: Status initialized to 'pending'");

    // Student checks own leave history
    const myLeavesRes = await request('GET', '/leave/my-leaves', null, studentToken);
    assert(myLeavesRes.status === 200, "Leave: Student retrieved own leave history");
    const foundMyLeave = myLeavesRes.data.find(l => l.id === testLeaveId);
    assert(!!foundMyLeave, "Leave: Newly applied leave found in student's history");

    // Admin checks all leaves
    const allLeavesRes = await request('GET', '/leave/all', null, adminToken);
    assert(allLeavesRes.status === 200, "Admin: Retrieved all leave applications");
    const foundAdminLeave = allLeavesRes.data.find(l => l.id === testLeaveId);
    assert(!!foundAdminLeave, "Admin: Found student's pending leave in admin approval queue");

    // Admin approves the leave
    const approveRes = await request('PUT', `/leave/approve/${testLeaveId}`, {}, adminToken);
    assert(approveRes.status === 200, "Admin: Approved the leave application");
    assert(approveRes.data.leave.status === 'approved', "Admin: Leave status changed to 'approved'");

    // Verify Attendance Synchronization for the student
    const checkAttRes = await request('GET', `/attendance/${studentData.studentId}/2026/9`, null, studentToken);
    assert(checkAttRes.status === 200, "Attendance: Fetched attendance for September 2026");
    // Day 28 and 29 should now be recorded as 'on_leave'
    assert(checkAttRes.data['28'] === 'on_leave', "Attendance Sync: Day 28 marked as 'on_leave'");
    assert(checkAttRes.data['29'] === 'on_leave', "Attendance Sync: Day 29 marked as 'on_leave'");

    // Admin rejects/reverts the leave
    const rejectRes = await request('PUT', `/leave/reject/${testLeaveId}`, {}, adminToken);
    assert(rejectRes.status === 200, "Admin: Rejected the test leave");
    assert(rejectRes.data.leave.status === 'rejected', "Admin: Leave status updated to 'rejected'");

    // Verify Attendance Reversion
    const checkRevertRes = await request('GET', `/attendance/${studentData.studentId}/2026/9`, null, studentToken);
    assert(checkRevertRes.data['28'] !== 'on_leave', "Attendance Revert: Day 28 on_leave record cleared");
    assert(checkRevertRes.data['29'] !== 'on_leave', "Attendance Revert: Day 29 on_leave record cleared");

    // ----------------------------------------------------------------
    // SECTION 5: CLASS ATTENDANCE REGISTER & BATCH MARKING
    // ----------------------------------------------------------------
    console.log("\n--- 5. Class Attendance Register & Batch Marking ---");

    // Admin loads class sheet
    const sheetRes = await request('GET', '/attendance/class-sheet?date=2026-09-18&department=CSE&semester=7&section=B', null, adminToken);
    assert(sheetRes.status === 200, "Class Register: Loaded class sheet for CSE 7 B");
    assert(Array.isArray(sheetRes.data.roster) && sheetRes.data.roster.length > 0, `Class Register: Roster returned ${sheetRes.data.roster.length} students`);
    assert(sheetRes.data.totalStudents === sheetRes.data.roster.length, "Class Register: totalStudents matches roster length");

    // Batch mark attendance for 3 students
    const sampleStudents = sheetRes.data.roster.slice(0, 3);
    const batchRecords = [
      { studentId: sampleStudents[0].id, status: 'present' },
      { studentId: sampleStudents[1].id, status: 'absent' },
      { studentId: sampleStudents[2].id, status: 'present' },
    ];
    const batchRes = await request('POST', '/attendance/batch-mark', {
      date: '2026-09-18',
      records: batchRecords,
    }, adminToken);
    assert(batchRes.status === 200 && batchRes.data.savedCount >= 3, `Class Register: Successfully batch marked attendance for ${batchRes.data.savedCount} students`);

    // ----------------------------------------------------------------
    // SECTION 6: CLASH-FREE TIMETABLE GENERATION & MANAGEMENT
    // ----------------------------------------------------------------
    console.log("\n--- 6. Timetable Clash-Free Engine ---");

    // Get resources
    const resRes = await request('GET', '/timetable/admin/resources', null, adminToken);
    assert(resRes.status === 200, "Timetable Resources: Fetched subjects, faculties, rooms");
    assert(resRes.data.subjects.length > 0, `Timetable Resources: Found ${resRes.data.subjects.length} subjects`);
    assert(resRes.data.faculties.length > 0, `Timetable Resources: Found ${resRes.data.faculties.length} faculties`);
    assert(resRes.data.rooms.length > 0, `Timetable Resources: Found ${resRes.data.rooms.length} rooms`);

    // Test clash-free generator
    const genSubjects = resRes.data.subjects.slice(0, 4).map((s, idx) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      facultyId: resRes.data.faculties[idx % resRes.data.faculties.length].id,
      roomId: resRes.data.rooms[idx % resRes.data.rooms.length].id,
      weeklyPeriods: 3,
      isLab: false,
    }));

    const genRes = await request('POST', '/timetable/admin/generate', {
      department: 'CSE',
      semester: 5,
      section: 'C',
      academicYear: '2026-27',
      subjects: genSubjects,
    }, adminToken);
    assert(genRes.status === 200, "Timetable Generator: Generation API returned HTTP 200");
    assert(Array.isArray(genRes.data.slots) && genRes.data.slots.length > 0, `Timetable Generator: Generated ${genRes.data.slots?.length} clash-free slots`);
    assert(genRes.data.unresolvedConflicts?.length === 0, `Timetable Generator: Zero unresolved conflicts (${genRes.data.unresolvedConflicts?.length} unresolved)`);
    assert(genRes.data.finalClashes?.length === 0, `Timetable Generator: Zero final slot clashes detected (${genRes.data.finalClashes?.length} clashes)`);

    // ----------------------------------------------------------------
    // SECTION 7: DEEP SECURITY, IDOR & RBAC AUDIT
    // ----------------------------------------------------------------
    console.log("\n--- 7. Deep Security, IDOR & RBAC Tests ---");

    // 7.1 Student attempting to mark attendance
    const markRes = await request('POST', '/attendance/mark', {
      studentId: studentData.studentId,
      date: '2026-09-18',
      status: 'present',
    }, studentToken);
    assert(markRes.status === 403, "Security: Student marking attendance strictly blocked with HTTP 403");

    // 7.2 Student attempting to batch mark attendance
    const batchSecRes = await request('POST', '/attendance/batch-mark', {
      date: '2026-09-18',
      records: [{ studentId: studentData.studentId, status: 'present' }],
    }, studentToken);
    assert(batchSecRes.status === 403, "Security: Student batch mark strictly blocked with HTTP 403");

    // 7.3 Student attempting to view another student's attendance (IDOR)
    const otherStudentId = studentData.studentId === 1 ? 2 : 1;
    const idorRes = await request('GET', `/attendance/${otherStudentId}/2026/9`, null, studentToken);
    assert(idorRes.status === 403, "Security IDOR: Querying other student's attendance strictly blocked with HTTP 403");

    // 7.3b Student attempting to view another student's profile (IDOR)
    const profileIdorRes = await request('GET', `/students/${otherStudentId}`, null, studentToken);
    assert(profileIdorRes.status === 403, "Security IDOR: Querying other student's profile strictly blocked with HTTP 403");

    // 7.4 Student attempting to approve leave
    const approveSecRes = await request('PUT', '/leave/approve/1', {}, studentToken);
    assert(approveSecRes.status === 403, "Security RBAC: Student approving leave blocked with HTTP 403");

    // 7.5 Student attempting to access admin class sheet
    const sheetSecRes = await request('GET', '/attendance/class-sheet?date=2026-09-18', null, studentToken);
    assert(sheetSecRes.status === 403, "Security RBAC: Student accessing class sheet blocked with HTTP 403");

    // 7.6 Student attempting to generate timetable
    const genSecRes = await request('POST', '/timetable/admin/generate', {
      department: 'CSE',
      semester: 7,
      section: 'B',
      subjects: [],
    }, studentToken);
    assert(genSecRes.status === 403, "Security RBAC: Student generating timetable blocked with HTTP 403");

    // 7.7 Student attempting to seed BMSIT timetable
    const seedSecRes = await request('POST', '/timetable/admin/seed-bmsit', {}, studentToken);
    assert(seedSecRes.status === 403, "Security RBAC: Student seeding timetable blocked with HTTP 403");

    // 7.8 Unauthenticated request (no token)
    const unauthRes = await request('GET', '/leave/my-leaves');
    assert(unauthRes.status === 401, "Security: Unauthenticated request rejected with HTTP 401 Unauthorized");

    // 7.9 Invalid token
    const invalidRes = await request('GET', '/leave/my-leaves', null, 'invalid.token.value.here');
    assert(invalidRes.status === 401, "Security: Malformed token rejected with HTTP 401 Unauthorized");

    // ----------------------------------------------------------------
    // SECTION 8: VALIDATION & EDGE CASES
    // ----------------------------------------------------------------
    console.log("\n--- 8. Validation & Edge Cases ---");

    // 8.1 Future date attendance marking rejected
    const futureAttRes = await request('POST', '/attendance/mark', {
      studentId: studentData.studentId,
      year: 2030,
      month: 12,
      day: 25,
      status: 'present',
    }, adminToken);
    assert(futureAttRes.status === 400, "Edge Case: Future date attendance rejected with HTTP 400 Bad Request");

    // 8.2 Apply leave with fromDate > toDate
    const invertedLeaveRes = await request('POST', '/leave/apply', {
      leaveType: 'Casual',
      fromDate: '2026-10-10',
      toDate: '2026-10-05',
      reason: 'Invalid inverted date range',
    }, studentToken);
    assert(invertedLeaveRes.status === 400, "Edge Case: Inverted date range rejected with HTTP 400");

    // 8.3 Apply leave with missing required fields
    const missingLeaveRes = await request('POST', '/leave/apply', {
      reason: 'Incomplete leave',
    }, studentToken);
    assert(missingLeaveRes.status === 400, "Edge Case: Missing required fields rejected with HTTP 400");

  } catch (unexpectedErr) {
    console.error("Deep audit fatal error:", unexpectedErr);
    assert(false, `Unexpected error: ${unexpectedErr.message}`);
  } finally {
    try {
      if (studentData && studentData.studentId && adminToken) {
        await request('DELETE', `/students/delete/${studentData.studentId}`, null, adminToken);
      }
    } catch (e) {}
  }

  console.log("\n==================================================================");
  console.log(`DEEP AUDIT SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    console.error("Failed assertions:", failures);
    process.exit(1);
  }
}

runDeepAudit();
