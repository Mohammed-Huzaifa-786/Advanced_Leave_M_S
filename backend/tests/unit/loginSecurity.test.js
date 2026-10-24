// Test Suite: Strict Login Security & Privilege Escalation Removal Verification
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { User, Student } = require("../../models");

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

let serverInstance = null;
let activeBaseUrl = "";

async function setupServer() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", require("../../routes/authRoutes"));
  app.use("/api/students", require("../../routes/studentRoutes"));

  await new Promise((resolve) => {
    serverInstance = app.listen(0, "127.0.0.1", () => {
      const port = serverInstance.address().port;
      activeBaseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });
}

function teardownServer() {
  if (serverInstance) {
    serverInstance.close();
  }
}

async function api(url, method = "GET", body = null, token = "") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${activeBaseUrl}${url}`, {
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
  console.log("TEST SUITE: STRICT LOGIN SECURITY & PRIVILEGE AUDIT VERIFICATION");
  console.log("==================================================================\n");

  await setupServer();

  let testStudentId = null;
  let customKingUserId = null;
  let customAdminUserId = null;
  const createdUsernames = [];

  try {
    // 0. Setup verified test accounts
    const testUsername = `sec_std_${Date.now()}`;
    const testPassword = "ValidStudentPass123!";
    createdUsernames.push(testUsername);
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

    // ==================================================================
    // 1. VALID LOGIN TESTS
    // ==================================================================
    console.log("\n--- 1. Valid Login Tests ---");

    // Case 1A: Valid Student Login
    const validStudentRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "student",
    });
    assert(validStudentRes.status === 200, "1A: Valid student login returns HTTP 200");
    assert(!!validStudentRes.data?.token, "1A: Valid student login issues JWT token");
    assert(validStudentRes.data?.role === "student", "1A: Response role is 'student'");
    assert(validStudentRes.data?.studentId, `1A: Contains valid studentId (${validStudentRes.data?.studentId})`);
    testStudentId = validStudentRes.data?.studentId;
    const decodedStudent = jwt.decode(validStudentRes.data?.token);
    assert(decodedStudent?.role === "student", "1A: JWT payload role strictly equals 'student'");
    assert(decodedStudent?.studentId === testStudentId, "1A: JWT payload contains correct studentId");

    // Case 1B: Valid Admin Login
    const validAdminRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    assert(validAdminRes.status === 200, "1B: Valid admin login returns HTTP 200");
    assert(!!validAdminRes.data?.token, "1B: Valid admin login issues JWT token");
    assert(validAdminRes.data?.role === "admin", "1B: Response role is 'admin'");
    const decodedAdmin = jwt.decode(validAdminRes.data?.token);
    assert(decodedAdmin?.role === "admin", "1B: JWT payload role strictly equals 'admin'");

    // ==================================================================
    // 2. INCORRECT PASSWORD TESTS
    // ==================================================================
    console.log("\n--- 2. Incorrect Password Tests ---");

    // Case 2A: Student with wrong password
    const studentWrongPassRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: "WrongPassword999!",
      role: "student",
    });
    assert(studentWrongPassRes.status === 401, "2A: Student with wrong password returns HTTP 401 UNAUTHORIZED");
    assert(!studentWrongPassRes.data?.token, "2A: No JWT issued on wrong password");
    assert(studentWrongPassRes.data?.message === "Invalid username or password", "2A: Generic error message returned");

    // Case 2B: Admin with wrong password
    const adminWrongPassRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "IncorrectAdminPassword@999",
      role: "admin",
    });
    assert(adminWrongPassRes.status === 401, "2B: Admin with wrong password returns HTTP 401 UNAUTHORIZED");
    assert(!adminWrongPassRes.data?.token, "2B: No JWT issued on wrong admin password");
    assert(adminWrongPassRes.data?.message === "Invalid username or password", "2B: Generic error message returned");

    // ==================================================================
    // 3. NONEXISTENT USER TESTS
    // ==================================================================
    console.log("\n--- 3. Nonexistent User Tests ---");

    // Case 3A: Nonexistent student
    const nonexistentStudentRes = await api("/auth/login", "POST", {
      username: `ghost_user_${Date.now()}`,
      password: "AnyPassword123!",
      role: "student",
    });
    assert(nonexistentStudentRes.status === 401, "3A: Nonexistent student returns HTTP 401 UNAUTHORIZED");
    assert(!nonexistentStudentRes.data?.token, "3A: No JWT issued for nonexistent student");
    assert(nonexistentStudentRes.data?.message === "Invalid username or password", "3A: Consistent generic error message");

    // Case 3B: Nonexistent admin
    const nonexistentAdminRes = await api("/auth/login", "POST", {
      username: `ghost_admin_${Date.now()}`,
      password: "AnyPassword123!",
      role: "admin",
    });
    assert(nonexistentAdminRes.status === 401, "3B: Nonexistent admin returns HTTP 401 UNAUTHORIZED");
    assert(!nonexistentAdminRes.data?.token, "3B: No JWT issued for nonexistent admin");
    assert(nonexistentAdminRes.data?.message === "Invalid username or password", "3B: Consistent generic error message");

    // ==================================================================
    // 4. HARDCODED CREDENTIAL BACKDOOR ELIMINATION (REGRESSION VERIFICATION)
    // ==================================================================
    console.log("\n--- 4. Hardcoded Backdoor Elimination Tests ---");

    // Case 4A: User 'king' with backdoor passwords when 'king' is nonexistent
    const kingGhostRes = await api("/auth/login", "POST", {
      username: "king",
      password: "King@123",
      role: "student",
    });
    assert(kingGhostRes.status === 401, "4A: Nonexistent 'king' with 'King@123' returns HTTP 401 (backdoor removed)");
    assert(!kingGhostRes.data?.token, "4A: No JWT issued via hardcoded King@123");

    // Case 4B: Create user 'king' with a specific secure password; test backdoor rejection
    const kingRealPass = "RealKingSecretPass#2026";
    const kingHashed = await bcrypt.hash(kingRealPass, 10);
    const existingKing = await User.findOne({ where: { username: "king" } });
    if (existingKing) {
      await existingKing.destroy();
    }
    const kingUser = await User.create({
      username: "king",
      password: kingHashed,
      role: "student",
    });
    customKingUserId = kingUser.id;
    createdUsernames.push("king");

    // Backdoor attempt 1: 123456
    const kingAttempt1 = await api("/auth/login", "POST", {
      username: "king",
      password: "123456",
      role: "student",
    });
    assert(kingAttempt1.status === 401, "4B-1: User 'king' with old backdoor '123456' is strictly REJECTED (HTTP 401)");

    // Backdoor attempt 2: King@123
    const kingAttempt2 = await api("/auth/login", "POST", {
      username: "king",
      password: "King@123",
      role: "student",
    });
    assert(kingAttempt2.status === 401, "4B-2: User 'king' with old backdoor 'King@123' is strictly REJECTED (HTTP 401)");

    // Backdoor attempt 3: king@123
    const kingAttempt3 = await api("/auth/login", "POST", {
      username: "king",
      password: "king@123",
      role: "student",
    });
    assert(kingAttempt3.status === 401, "4B-3: User 'king' with old backdoor 'king@123' is strictly REJECTED (HTTP 401)");

    // Legitimate password for 'king' must succeed
    const kingLegit = await api("/auth/login", "POST", {
      username: "king",
      password: kingRealPass,
      role: "student",
    });
    assert(kingLegit.status === 200, "4B-4: User 'king' with real database bcrypt password succeeds (HTTP 200)");
    assert(!!kingLegit.data?.token, "4B-4: Legitimate login issues JWT");

    // Case 4C: Custom admin with distinct password; verify old backdoor 'Admin@123' fails
    const adminCustomUser = `custom_adm_${Date.now()}`;
    const adminCustomRealPass = "SuperSecretAdminPass#777";
    createdUsernames.push(adminCustomUser);
    const admHashed = await bcrypt.hash(adminCustomRealPass, 10);
    const customAdmin = await User.create({
      username: adminCustomUser,
      password: admHashed,
      role: "admin",
    });
    customAdminUserId = customAdmin.id;

    // Backdoor attempt against custom admin with Admin@123
    const admBackdoorAttempt = await api("/auth/login", "POST", {
      username: adminCustomUser,
      password: "Admin@123",
      role: "admin",
    });
    assert(admBackdoorAttempt.status === 401, "4C-1: Custom admin with 'Admin@123' is REJECTED (HTTP 401)");

    // Legitimate password for custom admin
    const admLegit = await api("/auth/login", "POST", {
      username: adminCustomUser,
      password: adminCustomRealPass,
      role: "admin",
    });
    assert(admLegit.status === 200, "4C-2: Custom admin with real bcrypt password succeeds (HTTP 200)");

    // ==================================================================
    // 5. ROLE MISMATCH & VALIDATION ENFORCEMENT
    // ==================================================================
    console.log("\n--- 5. Role Mismatch & Validation Tests ---");

    // Admin credentials on student portal
    const adminOnStudentPortal = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "student",
    });
    assert(adminOnStudentPortal.status === 403, "5A: Admin on Student Portal returns HTTP 403 FORBIDDEN");
    assert(!adminOnStudentPortal.data?.token, "5A: No JWT issued on role mismatch");

    // Student credentials on admin portal
    const studentOnAdminPortal = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "admin",
    });
    assert(studentOnAdminPortal.status === 403, "5B: Student on Admin Portal returns HTTP 403 FORBIDDEN");
    assert(!studentOnAdminPortal.data?.token, "5B: No JWT issued on role mismatch");

    // Missing role
    const missingRoleRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
    });
    assert(missingRoleRes.status === 400, "5C: Missing role returns HTTP 400 BAD REQUEST");

    // Invalid role
    const invalidRoleRes = await api("/auth/login", "POST", {
      username: testUsername,
      password: testPassword,
      role: "super_hacker",
    });
    assert(invalidRoleRes.status === 400, "5D: Invalid role returns HTTP 400 BAD REQUEST");

    // Missing credentials
    const missingUserRes = await api("/auth/login", "POST", {
      password: testPassword,
      role: "student",
    });
    assert(missingUserRes.status === 400, "5E: Missing username returns HTTP 400 BAD REQUEST");

    const missingPassRes = await api("/auth/login", "POST", {
      username: testUsername,
      role: "student",
    });
    assert(missingPassRes.status === 400, "5F: Missing password returns HTTP 400 BAD REQUEST");

    // ==================================================================
    // 6. PUBLIC REGISTRATION PRIVILEGE ESCALATION REGRESSION TESTS
    // ==================================================================
    console.log("\n--- 6. Public Registration Privilege Escalation Regression Tests ---");

    // Case 6A: Registration WITHOUT a role creates a student
    const noRoleUsername = `no_role_${Date.now()}`;
    const noRolePassword = "NoRolePass123!";
    createdUsernames.push(noRoleUsername);
    const noRoleSignupRes = await api("/auth/signup", "POST", {
      name: "No Role Registered User",
      username: noRoleUsername,
      password: noRolePassword,
      department: "CSE",
      className: "7A",
    });
    assert(noRoleSignupRes.status === 201, "6A-1: Registration without role returns HTTP 201 Created");
    assert(
      noRoleSignupRes.data?.message === "Student account created successfully!",
      "6A-2: Returns standard student account created message"
    );

    // Verify in database: user must have role === 'student'
    const dbNoRoleUser = await User.findOne({ where: { username: noRoleUsername } });
    assert(dbNoRoleUser !== null, "6A-3: User record created in database");
    assert(dbNoRoleUser?.role === "student", "6A-4: Database user.role is strictly 'student'");

    // Verify student profile creation
    const dbNoRoleStudent = await Student.findOne({ where: { userId: dbNoRoleUser?.id } });
    assert(dbNoRoleStudent !== null, "6A-5: Student profile record automatically initialized");

    // Verify login behavior: succeeds on Student portal, blocked on Admin portal
    const noRoleLoginStudent = await api("/auth/login", "POST", {
      username: noRoleUsername,
      password: noRolePassword,
      role: "student",
    });
    assert(noRoleLoginStudent.status === 200, "6A-6: Can login to Student Portal");
    assert(noRoleLoginStudent.data?.role === "student", "6A-7: Student portal session has role 'student'");

    const noRoleLoginAdmin = await api("/auth/login", "POST", {
      username: noRoleUsername,
      password: noRolePassword,
      role: "admin",
    });
    assert(noRoleLoginAdmin.status === 403, "6A-8: Login to Admin Portal strictly FORBIDDEN (HTTP 403)");
    assert(!noRoleLoginAdmin.data?.token, "6A-9: No admin token issued");

    // Case 6B: Registration WITH role: "admin" CANNOT create an admin
    const adminAttemptUsername = `malicious_admin_${Date.now()}`;
    const adminAttemptPassword = "AttackerPassword123!";
    createdUsernames.push(adminAttemptUsername);
    const adminAttemptSignup = await api("/auth/signup", "POST", {
      name: "Attacker Wanting Admin",
      username: adminAttemptUsername,
      password: adminAttemptPassword,
      role: "admin", // Malicious privilege escalation payload
      department: "CSE",
      className: "7A",
    });
    assert(adminAttemptSignup.status === 201, "6B-1: Registration request succeeds with HTTP 201");
    assert(
      adminAttemptSignup.data?.message === "Student account created successfully!",
      "6B-2: Returns student account message (not admin)"
    );

    // Verify in database: server-side override to 'student'
    const dbAdminAttemptUser = await User.findOne({ where: { username: adminAttemptUsername } });
    assert(dbAdminAttemptUser !== null, "6B-3: User record exists in database");
    assert(
      dbAdminAttemptUser?.role === "student",
      `6B-4: Privilege escalation blocked! Role forced to 'student' (got '${dbAdminAttemptUser?.role}')`
    );

    // Attempting to log in as admin MUST be forbidden
    const adminAttemptLoginAdmin = await api("/auth/login", "POST", {
      username: adminAttemptUsername,
      password: adminAttemptPassword,
      role: "admin",
    });
    assert(adminAttemptLoginAdmin.status === 403, "6B-5: Attempting Admin portal login returns HTTP 403 FORBIDDEN");
    assert(!adminAttemptLoginAdmin.data?.token, "6B-6: No admin token issued to attacker");

    // Logging in as student succeeds
    const adminAttemptLoginStudent = await api("/auth/login", "POST", {
      username: adminAttemptUsername,
      password: adminAttemptPassword,
      role: "student",
    });
    assert(adminAttemptLoginStudent.status === 200, "6B-7: Normal student login succeeds");
    assert(adminAttemptLoginStudent.data?.role === "student", "6B-8: Role is 'student'");

    // Case 6C: Registration with arbitrary unauthorized roles (e.g. 'superadmin', 'root')
    const hackerRoleUsername = `hacker_role_${Date.now()}`;
    const hackerRolePassword = "HackerPassword123!";
    createdUsernames.push(hackerRoleUsername);
    const hackerRoleSignup = await api("/auth/signup", "POST", {
      name: "Arbitrary Role Attacker",
      username: hackerRoleUsername,
      password: hackerRolePassword,
      role: "superadmin_exploit",
    });
    assert(hackerRoleSignup.status === 201, "6C-1: Registration request handled successfully");

    const dbHackerUser = await User.findOne({ where: { username: hackerRoleUsername } });
    assert(
      dbHackerUser?.role === "student",
      `6C-2: Arbitrary role overridden to 'student' (got '${dbHackerUser?.role}')`
    );

    const hackerLoginAdmin = await api("/auth/login", "POST", {
      username: hackerRoleUsername,
      password: hackerRolePassword,
      role: "admin",
    });
    assert(hackerLoginAdmin.status === 403, "6C-3: Admin access denied with HTTP 403");

    // Case 6D: Existing legitimate registration and login continues to work
    const legitUsername = `legit_std_${Date.now()}`;
    const legitPassword = "LegitPassword123!";
    createdUsernames.push(legitUsername);
    const legitSignup = await api("/auth/signup", "POST", {
      name: "Legitimate Enrolled Student",
      username: legitUsername,
      password: legitPassword,
      role: "student",
      department: "CSE",
      className: "7A",
      semester: 7,
      section: "A",
    });
    assert(legitSignup.status === 201, "6D-1: Legitimate student registration returns HTTP 201");
    assert(
      legitSignup.data?.message === "Student account created successfully!",
      "6D-2: Response message matches expected format"
    );

    const legitLogin = await api("/auth/login", "POST", {
      username: legitUsername,
      password: legitPassword,
      role: "student",
    });
    assert(legitLogin.status === 200, "6D-3: Legitimate student login succeeds with HTTP 200");
    assert(!!legitLogin.data?.token, "6D-4: Legitimate student issued valid JWT");
    assert(legitLogin.data?.role === "student", "6D-5: Session role is 'student'");
    assert(!!legitLogin.data?.studentId, "6D-6: Valid studentId returned");

  } catch (err) {
    console.error("Test execution exception:", err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    // Clean up created test entities
    try {
      if (customKingUserId) {
        await User.destroy({ where: { id: customKingUserId } });
      }
      if (customAdminUserId) {
        await User.destroy({ where: { id: customAdminUserId } });
      }
      if (testStudentId) {
        await Student.destroy({ where: { id: testStudentId } });
      }
      for (const uname of createdUsernames) {
        const u = await User.findOne({ where: { username: uname } });
        if (u) {
          await Student.destroy({ where: { userId: u.id } });
          await User.destroy({ where: { id: u.id } });
        }
      }
    } catch (cleanupErr) {
      // Ignore cleanup error
    }
    teardownServer();
  }

  console.log("\n==================================================================");
  console.log(`LOGIN & PRIVILEGE SECURITY SUITE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) process.exit(1);
}

runSecuritySuite();
