const http = require("http");
const jwt = require("jsonwebtoken");
const path = require("path");
const bcrypt = require("bcrypt");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const { User, Student, sequelize } = require("../../models");
const authMiddleware = require("../../middleware/authMiddleware");

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

function postRequest(pathUrl, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: "127.0.0.1",
      port: process.env.PORT || 5000,
      path: pathUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function runComprehensiveLoginTests() {
  console.log("==================================================================");
  console.log("TEST SUITE: COMPREHENSIVE LOGIN, SESSION & RBAC SECURITY VERIFICATION");
  console.log("==================================================================");

  let studentUser = null;
  let studentProfile = null;

  try {
    // 0. Setup a dedicated student user
    const testUsername = `StudentAuth_${Date.now()}`;
    const testPassword = "StudentPass@123";
    const hash = await bcrypt.hash(testPassword, 10);
    studentUser = await User.create({
      username: testUsername,
      password: hash,
      role: "student",
    });
    studentProfile = await Student.create({
      userId: studentUser.id,
      name: "Comprehensive Auth Student",
      department: "CSE",
      semester: 7,
      section: "A",
      className: "7A",
    });

    // 1. Student Login: testUsername / testPassword / student
    console.log("\n--- 1. Standard Student Login ---");
    const stdRes = await postRequest("/api/auth/login", {
      username: testUsername,
      password: testPassword,
      role: "student",
    });
    assert(stdRes.status === 200, "Student login returns HTTP 200");
    assert(!!stdRes.data.token, "JWT token is returned for student");
    assert(stdRes.data.role === "student", "Role in payload is 'student'");
    assert(stdRes.data.studentId !== null && stdRes.data.studentId !== undefined, "Valid studentId is returned");
    assert(stdRes.data.username === testUsername, "Correct username returned");

    // 2. Admin Login: Admin / Admin@123 / admin
    console.log("\n--- 2. Standard Admin Login ---");
    const adminRes = await postRequest("/api/auth/login", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    assert(adminRes.status === 200, "Admin login returns HTTP 200");
    assert(!!adminRes.data.token, "JWT token is returned for admin");
    assert(adminRes.data.role === "admin", "Role in payload is 'admin'");
    assert(adminRes.data.studentId === null, "studentId is null for admin");

    // 3. Case-Insensitive Username Login
    console.log("\n--- 3. Case-Insensitive Username Support ---");
    const lowerStudentRes = await postRequest("/api/auth/login", {
      username: testUsername.toLowerCase(),
      password: testPassword,
      role: "student",
    });
    assert(lowerStudentRes.status === 200, "Lowercase student username returns HTTP 200");

    const upperStudentRes = await postRequest("/api/auth/login", {
      username: testUsername.toUpperCase(),
      password: testPassword,
      role: "student",
    });
    assert(upperStudentRes.status === 200, "Uppercase student username returns HTTP 200");

    const lowerAdminRes = await postRequest("/api/auth/login", {
      username: "admin",
      password: "Admin@123",
      role: "admin",
    });
    assert(lowerAdminRes.status === 200, "Lowercase 'admin' returns HTTP 200");

    // 4. Whitespace Trimming
    console.log("\n--- 4. Whitespace Trimming on Username ---");
    const paddedStudentRes = await postRequest("/api/auth/login", {
      username: `  ${testUsername}  `,
      password: testPassword,
      role: "student",
    });
    assert(paddedStudentRes.status === 200, "Whitespace-padded username returns HTTP 200");

    // 5. Role Mismatch Rejection
    console.log("\n--- 5. Strict Role Mismatch Rejection (Security) ---");
    const studentAsAdminRes = await postRequest("/api/auth/login", {
      username: testUsername,
      password: testPassword,
      role: "admin",
    });
    assert(studentAsAdminRes.status === 403, "Student account selecting Admin Portal returns 403 Forbidden");
    assert(!studentAsAdminRes.data.token, "No token issued on student role mismatch");

    const adminAsStudentRes = await postRequest("/api/auth/login", {
      username: "Admin",
      password: "Admin@123",
      role: "student",
    });
    assert(adminAsStudentRes.status === 403, "Admin account selecting Student Portal returns 403 Forbidden");
    assert(!adminAsStudentRes.data.token, "No token issued on admin role mismatch");

    // 6. Invalid Credentials & Validation
    console.log("\n--- 6. Invalid Credentials & Bad Request Validation ---");
    const wrongPassRes = await postRequest("/api/auth/login", {
      username: testUsername,
      password: "DefinitiveWrongPassword!#123",
      role: "student",
    });
    assert(wrongPassRes.status === 401, "Invalid password returns HTTP 401 Unauthorized");
    assert(!wrongPassRes.data.token, "No token issued on invalid password");

    const nonExistentRes = await postRequest("/api/auth/login", {
      username: "completely_fake_user_999999",
      password: "AnyPassword123",
      role: "student",
    });
    assert(nonExistentRes.status === 401, "Non-existent user returns HTTP 401 Unauthorized");

    const missingRoleRes = await postRequest("/api/auth/login", {
      username: testUsername,
      password: testPassword,
    });
    assert(missingRoleRes.status === 400, "Missing role parameter returns HTTP 400 Bad Request");

    const missingPassRes = await postRequest("/api/auth/login", {
      username: testUsername,
      role: "student",
    });
    assert(missingPassRes.status === 400, "Missing password returns HTTP 400 Bad Request");

    // 7. Self-Healing Student Profile Initializer
    console.log("\n--- 7. Self-Healing Student Profile on Login ---");
    const orphanUsername = `orphan_std_${Date.now()}`;
    const orphanHash = await bcrypt.hash("Orphan@123", 10);
    const orphanUser = await User.create({
      username: orphanUsername,
      password: orphanHash,
      role: "student",
    });

    // Verify orphan user has NO student record initially
    let orphanStudent = await Student.findOne({ where: { userId: orphanUser.id } });
    assert(!orphanStudent, "Setup: Verified orphan user has no initial student profile");

    // Attempt login as student
    const orphanLoginRes = await postRequest("/api/auth/login", {
      username: orphanUsername,
      password: "Orphan@123",
      role: "student",
    });
    assert(orphanLoginRes.status === 200, "Orphan student login self-heals and returns HTTP 200");
    assert(!!orphanLoginRes.data.token, "Token issued for self-healed student");
    assert(!!orphanLoginRes.data.studentId, "Valid studentId auto-generated and returned");

    // Verify Student record was actually created in database
    orphanStudent = await Student.findOne({ where: { userId: orphanUser.id } });
    assert(!!orphanStudent, "Self-healed Student record exists in database");

    // Clean up orphan user and profile
    if (orphanStudent) await orphanStudent.destroy();
    await orphanUser.destroy();
    console.log("  Cleaned up orphan test user.");

    // 8. Auth Middleware Token Verification & RBAC
    console.log("\n--- 8. Auth Middleware Verification & RBAC ---");
    
    // Valid token
    let testReq = { headers: { authorization: `Bearer ${stdRes.data.token}` } };
    let testRes = {
      status: (code) => ({ json: (data) => ({ statusCode: code, data }) }),
    };
    let nextCalled = false;
    authMiddleware.authenticate(testReq, testRes, () => {
      nextCalled = true;
    });
    assert(nextCalled, "Valid student JWT passes authenticate middleware");
    assert(testReq.user.role === "student", "authenticate attaches decoded user role");

    // Missing token
    let missingReq = { headers: {} };
    let capturedStatus = null;
    let captureRes = {
      status: (c) => {
        capturedStatus = c;
        return { json: () => {} };
      },
    };
    authMiddleware.authenticate(missingReq, captureRes, () => {});
    assert(capturedStatus === 401, "Missing authorization header blocked with 401");

    // Tampered token
    let tamperedReq = { headers: { authorization: "Bearer invalid.fake.token" } };
    capturedStatus = null;
    authMiddleware.authenticate(tamperedReq, captureRes, () => {});
    assert(capturedStatus === 401, "Tampered/invalid token blocked with 401");

    // RBAC: authorize middleware
    let rbacNextCalled = false;
    const adminAuthorize = authMiddleware.authorize("admin");
    let adminAuthorizeRes = {
      status: (c) => {
        capturedStatus = c;
        return { json: () => {} };
      },
    };
    // Student token attempting admin-restricted action
    capturedStatus = null;
    adminAuthorize(testReq, adminAuthorizeRes, () => {
      rbacNextCalled = true;
    });
    assert(capturedStatus === 403, "Student blocked from admin-only route by authorize middleware (403)");

    // Admin token attempting admin-restricted action
    let adminReq = { headers: { authorization: `Bearer ${adminRes.data.token}` } };
    authMiddleware.authenticate(adminReq, testRes, () => {});
    rbacNextCalled = false;
    adminAuthorize(adminReq, adminAuthorizeRes, () => {
      rbacNextCalled = true;
    });
    assert(rbacNextCalled, "Admin permitted through admin-only route by authorize middleware");

    console.log("\n==================================================================");
    console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
    console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log("==================================================================");

  } catch (error) {
    console.error("Test execution error:", error);
    failedTests++;
  } finally {
    try {
      if (studentProfile) await studentProfile.destroy();
      if (studentUser) await studentUser.destroy();
    } catch (e) {}
    process.exit(failedTests === 0 ? 0 : 1);
  }
}

runComprehensiveLoginTests();
