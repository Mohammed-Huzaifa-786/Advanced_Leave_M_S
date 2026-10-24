// Regression test suite for all pre-existing system features
const BASE_URL = "http://localhost:5000/api";

let adminToken = "";
let studentToken = "";
let studentId = null;
let leaveId = null;

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

async function runRegression() {
  console.log("==================================================================");
  console.log("RUNNING EXISTING SYSTEM REGRESSION SUITE");
  console.log("==================================================================\n");

  try {
    // 1. Admin Login
    const adminRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    adminToken = adminRes.data?.token;
    assert(adminToken && adminRes.data?.role === "admin", "Legacy Admin login works");

    // 2. Student Signup & Login
    const testUsername = `reg_student_${Date.now()}`;
    const signupRes = await api("/auth/signup", "POST", {
      name: "Regression Student",
      username: testUsername,
      password: "password123",
      role: "student",
      department: "ISE",
      className: "6B",
    });
    assert(signupRes.status === 201, "Legacy Student registration works");

    const studentRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: "password123",
      role: "student",
    });
    studentToken = studentRes.data?.token;
    studentId = studentRes.data?.studentId;
    assert(studentToken && studentId, "Legacy Student login works");

    // 3. Student Apply Leave
    const leaveRes = await api(
      "/leave/apply",
      "POST",
      {
        leaveType: "Medical Leave",
        fromDate: "2026-10-01",
        toDate: "2026-10-02",
        reason: "Viral flu doctor advice",
      },
      studentToken
    );
    assert(leaveRes.status === 201, "Legacy Leave application submission works");
    leaveId = leaveRes.data?.id;

    // 4. Student Leave History
    const historyRes = await api("/leave/my-leaves", "GET", null, studentToken);
    assert(historyRes.status === 200 && Array.isArray(historyRes.data), "Legacy Student leave history retrieval works");

    // 5. Admin View All Leaves & Approve Leave
    const allLeavesRes = await api("/leave/all", "GET", null, adminToken);
    assert(allLeavesRes.status === 200 && Array.isArray(allLeavesRes.data), "Legacy Admin view all leaves works");

    if (leaveId) {
      const approveRes = await api(`/leave/approve/${leaveId}`, "POST", { status: "approved" }, adminToken);
      assert(approveRes.status === 200, "Legacy Admin leave approval works");
    }

    // 6. Admin Attendance Mark & Student View (Future date blocked by policy)
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const curDay = today.getDate();

    const markAttRes = await api(
      "/attendance/mark",
      "POST",
      { studentId, year: curYear, month: curMonth, day: curDay, status: "present" },
      adminToken
    );
    assert(markAttRes.status === 200, "Legacy Attendance mark works");

    const getAttRes = await api(`/attendance/${studentId}/${curYear}/${curMonth}`, "GET", null, studentToken);
    assert(getAttRes.status === 200 && getAttRes.data[String(curDay)] === "present", "Legacy Attendance calendar get works");

    // 7. Student Profile View & Update
    const profRes = await api(`/students/${studentId}`, "GET", null, studentToken);
    assert(profRes.status === 200 && profRes.data.name === "Regression Student", "Legacy Student profile retrieval works");

    const updateProfRes = await api(
      `/students/update/${studentId}`,
      "PUT",
      { name: "Regression Student Updated" },
      studentToken
    );
    assert(updateProfRes.status === 200, "Legacy Student profile update works");

    // 8. Admin Reports
    const repRes = await api("/reports/leaves", "GET", null, adminToken);
    assert(repRes.status === 200, "Legacy Admin reports export works");

    // 9. Admin Manage Holidays
    const holRes = await api("/holidays/all", "GET", null, studentToken);
    assert(holRes.status === 200, "Legacy Holidays list works");

    // 10. Student change password
    const chgPassRes = await api(
      "/auth/change-password",
      "POST",
      { currentPassword: "password123", newPassword: "newpassword123" },
      studentToken
    );
    assert(chgPassRes.status === 200, "Legacy Student change password works");

  } catch (err) {
    console.error("REGRESSION ERROR:", err.message);
    failedTests++;
  } finally {
    if (studentId) {
      await api(`/students/delete/${studentId}`, "DELETE", null, adminToken);
    }
  }

  console.log("\n==================================================================");
  console.log(`REGRESSION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / Math.max(totalTests, 1)) * 100).toFixed(1)}%`);
  console.log("==================================================================");

  if (failedTests > 0) process.exit(1);
  else process.exit(0);
}

runRegression();
