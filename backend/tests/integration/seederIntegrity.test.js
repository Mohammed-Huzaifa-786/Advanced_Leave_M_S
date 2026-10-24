const BASE_URL = "http://localhost:5000/api";

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
  console.log("STARTING BMSIT SEEDER & PDF/PRINT EXPORT VERIFICATION SUITE");
  console.log("==================================================================\n");

  try {
    // 1. Authenticate Admin
    console.log("--- Step 1: Admin & Student Authentication ---");
    const adminRes = await api("/auth/login", "POST", {
      username: "Admin",
      password: "Admin@123",
      role: "admin",
    });
    const adminToken = adminRes.data?.token;
    assert(adminToken && adminRes.data?.role === "admin", "Admin login successful");

    // Create a student in CSE Sem 7 Section B
    const bmsitStudentUsername = `bmsit_student_${Date.now()}`;
    const studentSignupRes = await api("/auth/signup", "POST", {
      name: "Rahul Sharma (BMSIT)",
      username: bmsitStudentUsername,
      password: "password123",
      role: "student",
      department: "CSE",
      className: "7B",
      semester: 7,
      section: "B",
    });
    assert(studentSignupRes.status === 201, "Created 7th Sem Section B student account");

    const studentLoginRes = await api("/auth/login", "POST", {
      username: bmsitStudentUsername,
      password: "password123",
      role: "student",
    });
    const studentToken = studentLoginRes.data?.token;
    const studentId = studentLoginRes.data?.studentId;
    assert(studentToken && studentId, "Student login & JWT token retrieval successful");

    // 2. Security & RBAC Checks
    console.log("\n--- Step 2: RBAC & Security Enforcement ---");
    const unauthSeed = await api("/timetable/admin/seed-bmsit", "POST", {});
    assert(unauthSeed.status === 401, "Unauthenticated request to seed-bmsit returns 401 Unauthorized");

    const studentSeed = await api("/timetable/admin/seed-bmsit", "POST", {}, studentToken);
    assert(studentSeed.status === 403, "Student request to seed-bmsit returns 403 Forbidden");

    // 3. Admin Seeding Execution & Idempotence
    console.log("\n--- Step 3: BMSIT Seeder Execution & Idempotence ---");
    const firstSeed = await api("/timetable/admin/seed-bmsit", "POST", { overwrite: true }, adminToken);
    assert(firstSeed.status === 200, "Admin seed-bmsit executed successfully");
    assert(firstSeed.data?.success === true, "Seeder reports success = true");
    assert(firstSeed.data?.slotCount === 27, `Seeder configured exactly 27 slots (got ${firstSeed.data?.slotCount})`);
    const seededTimetableId = firstSeed.data?.timetable?.id;
    assert(seededTimetableId, "Timetable ID returned from seeder");

    // Test Safe Non-Silent Overwrite: Call seeder AGAIN without overwrite: true
    const duplicateSeedWithoutOverwrite = await api("/timetable/admin/seed-bmsit", "POST", {}, adminToken);
    assert(duplicateSeedWithoutOverwrite.status === 200, "Second seed call without overwrite returns 200");
    assert(
      duplicateSeedWithoutOverwrite.data?.exists === true,
      "Second seed call detects existing timetable and alerts exists = true without silently overwriting"
    );
    assert(
      duplicateSeedWithoutOverwrite.data?.message?.includes("already exists"),
      "Helpful confirmation prompt returned for Admin review"
    );

    // Test Calling Seeder with overwrite: true again
    const thirdSeed = await api("/timetable/admin/seed-bmsit", "POST", { overwrite: true }, adminToken);
    assert(thirdSeed.status === 200, "Third seed call with overwrite: true returns 200");
    assert(thirdSeed.data?.slotCount === 27, "Slots re-populated without duplicating slots");

    // 4. Verify Academic Resources & Integrity
    console.log("\n--- Step 4: Verify Resource Deduplication & Integrity ---");
    const resRes = await api("/timetable/admin/resources", "GET", null, adminToken);
    const subjects = resRes.data?.subjects || [];
    const faculties = resRes.data?.faculties || [];
    const rooms = resRes.data?.rooms || [];

    // Check subjects
    const bcs701List = subjects.filter((s) => s.code === "BCS701");
    assert(bcs701List.length === 1, "Subject BCS701 exists exactly once (no duplicates created)");

    const mp708List = subjects.filter((s) => s.code === "MP708");
    assert(mp708List.length === 1, "Subject MP708 exists exactly once (no duplicates created)");

    const bcsl706List = subjects.filter((s) => s.code === "BCSL706");
    assert(bcsl706List.length === 1 && bcsl706List[0].isLab, "Subject BCSL706 is configured as a Lab");

    // Check faculty
    const rbmList = faculties.filter((f) => f.name === "Mrs. Renita Blossom Monteiro");
    assert(rbmList.length === 1, "Faculty Mrs. Renita Blossom Monteiro exists exactly once");

    const mkList = faculties.filter((f) => f.name === "Dr. Mohammed Khurram");
    assert(mkList.length === 1, "Faculty Dr. Mohammed Khurram exists exactly once");

    // Check rooms
    const bsnRoomList = rooms.filter((r) => r.name === "BSN-CR-104");
    assert(bsnRoomList.length === 1, "Classroom BSN-CR-104 exists exactly once");

    // 5. Verify Student View for 7th Sem Section B
    console.log("\n--- Step 5: Verify Student Timetable Retrieval ---");
    const studentTT = await api("/timetable/my-timetable", "GET", null, studentToken);
    assert(studentTT.status === 200, "Student /my-timetable returns 200");
    assert(studentTT.data?.hasTimetable === true, "Student sees published timetable");
    assert(
      studentTT.data?.timetable?.name?.includes("BMSIT"),
      `Student receives BMSIT timetable (name: "${studentTT.data?.timetable?.name}")`
    );
    assert(studentTT.data?.timetable?.section === "B", "Timetable section is 'B'");

    // Check Monday periods
    const mondaySlots = studentTT.data?.days?.Monday || [];
    assert(mondaySlots.length === 4, `Monday has 4 scheduled project slots (got ${mondaySlots.length})`);
    const allMondayProject = mondaySlots.every((s) => s.subject?.code === "MP708");
    assert(allMondayProject, "All Monday morning slots are Major Project Phase II (MP708)");

    // Check Thursday periods
    const thursdaySlots = studentTT.data?.days?.Thursday || [];
    assert(thursdaySlots.length === 6, `Thursday has 6 scheduled periods (got ${thursdaySlots.length})`);

    // Check Friday periods & Labs
    const fridaySlots = studentTT.data?.days?.Friday || [];
    assert(fridaySlots.length === 7, `Friday has 7 scheduled periods (got ${fridaySlots.length})`);
    const fridayLabs = fridaySlots.filter((s) => s.isLab);
    assert(fridayLabs.length === 4, `Friday has 4 lab period slots (2 for INS Lab, 2 for PC Lab) (got ${fridayLabs.length})`);

    // 6. Final Summary
    console.log("\n==================================================================");
    console.log(`SEEDER TEST RESULTS: ${passedTests} passed, ${failedTests} failed out of ${totalTests} tests.`);
    console.log("==================================================================\n");

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  }
}

run();
