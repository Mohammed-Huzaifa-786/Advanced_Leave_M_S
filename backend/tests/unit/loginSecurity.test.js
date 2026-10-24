// Test Suite: Strict Login Role Validation Security (Cases A - F)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const BASE_URL = "http://localhost:5000/api";
const jwt = require("jsonwebtoken");

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

async function runSecuritySuite() {
  console.log("==================================================================");
  console.log("TEST SUITE: STRICT LOGIN ROLE VALIDATION & SECURITY ENFORCEMENT");
  console.log("==================================================================\n");

  try {
    // 0. Setup a test student account to ensure known credentials
    const testUsername = `sec_student_${Date.now()}`;
    const testPassword = "ValidStudentPass123!";
    const signupRes = await api("/auth/signup", "POST", {
      name: "Security Verification Student",
      username: testUsername,
      password: testPassword,
      role: "student",
      department: "CSE",
      className: "7A",
      semester: 7,
      section: "A",
    });
    assert(signupRes.status === 201, "Setup: Verified test student account created");

    // Case A: Admin credentials + Admin Portal
    console.log("\n--- Case A: Admin Credentials + Admin Portal ---");
    const caseARes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    assert(caseARes.status === 200, "Case A: Returns HTTP 200 SUCCESS");
    assert(caseARes.data?.token, "Case A: JWT token issued");
    assert(caseARes.data?.role === "admin", "Case A: Response role is 'admin'");
    const decodedA = jwt.decode(caseARes.data?.token);
    assert(decodedA?.role === "admin", "Case A: JWT payload role strictly equals 'admin'");

    // Case B: Student credentials + Student Portal
    console.log("\n--- Case B: Student Credentials + Student Portal ---");
    const caseBRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "student",
    });
    assert(caseBRes.status === 200, "Case B: Returns HTTP 200 SUCCESS");
    assert(caseBRes.data?.token, "Case B: JWT token issued");
    assert(caseBRes.data?.role === "student", "Case B: Response role is 'student'");
    assert(caseBRes.data?.studentId, `Case B: Contains correct studentId (${caseBRes.data?.studentId})`);
    const decodedB = jwt.decode(caseBRes.data?.token);
    assert(decodedB?.role === "student", "Case B: JWT payload role strictly equals 'student'");
    assert(decodedB?.studentId === caseBRes.data?.studentId, "Case B: JWT payload contains correct studentId");

    // Case C: Admin credentials + Student Portal (MISMATCH)
    console.log("\n--- Case C: Admin Credentials + Student Portal (Mismatch Attempt) ---");
    const caseCRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "student",
    });
    assert(caseCRes.status === 403, "Case C: Returns HTTP 403 FORBIDDEN");
    assert(!caseCRes.data?.token, "Case C: NO JWT issued");
    assert(
      caseCRes.data?.message === "These credentials belong to an Admin account. Please select Admin Portal.",
      `Case C: Correct security message returned ("${caseCRes.data?.message}")`
    );

    // Case D: Student credentials + Admin Portal (MISMATCH)
    console.log("\n--- Case D: Student Credentials + Admin Portal (Mismatch Attempt) ---");
    const caseDRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "admin",
    });
    assert(caseDRes.status === 403, "Case D: Returns HTTP 403 FORBIDDEN");
    assert(!caseDRes.data?.token, "Case D: NO JWT issued");
    assert(
      caseDRes.data?.message === "These credentials belong to a Student account. Please select Student Portal.",
      `Case D: Correct security message returned ("${caseDRes.data?.message}")`
    );

    // Case E: Invalid Password
    console.log("\n--- Case E: Invalid Password ---");
    const caseERes = await api("/auth/login", "POST", {
      username: testUsername,
      password: "WrongPassword999!",
      role: "student",
    });
    assert(caseERes.status === 401, "Case E: Returns HTTP 401 UNAUTHORIZED");
    assert(!caseERes.data?.token, "Case E: NO JWT issued");
    assert(caseERes.data?.message === "Invalid username or password", "Case E: Appropriate auth error message");

    // Case F: Missing/Invalid Role
    console.log("\n--- Case F: Missing/Invalid Role ---");
    const caseF1Res = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
    });
    assert(caseF1Res.status === 400, "Case F1: Missing role returns HTTP 400 BAD REQUEST");
    assert(!caseF1Res.data?.token, "Case F1: NO JWT issued");
    assert(caseF1Res.data?.message === "Account role is required", `Case F1: Message: "${caseF1Res.data?.message}"`);

    const caseF2Res = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "superadmin_hacker",
    });
    assert(caseF2Res.status === 400, "Case F2: Invalid role returns HTTP 400 BAD REQUEST");
    assert(!caseF2Res.data?.token, "Case F2: NO JWT issued");
    assert(caseF2Res.data?.message === "Invalid account role specified", `Case F2: Message: "${caseF2Res.data?.message}"`);

    // Clean up test student
    const adminToken = caseARes.data?.token;
    if (caseBRes.data?.studentId && adminToken) {
      await api(`/students/delete/${caseBRes.data.studentId}`, "DELETE", null, adminToken);
    }
  } catch (err) {
    console.error("Test execution exception:", err);
    assert(false, `Unexpected error: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`LOGIN ROLE SECURITY SUITE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) process.exit(1);
}

runSecuritySuite();
