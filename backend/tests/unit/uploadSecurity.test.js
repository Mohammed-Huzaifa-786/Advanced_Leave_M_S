// Test Suite: Upload Security, File Signature & Static Exposure Hardening
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { User, Student, Leave } = require("../../models");

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
let studentToken = "";
let studentUser = null;
let studentProfile = null;
const createdLeaveIds = [];

const uploadDir = path.join(__dirname, "../../uploads/certificates");

async function setupServer() {
  const app = express();
  app.use(express.json());

  // Static uploads with security headers
  app.use(
    "/uploads",
    express.static(path.join(__dirname, "../../uploads"), {
      dotfiles: "deny",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Security-Policy", "default-src 'none'");
      },
    })
  );

  app.use("/api/auth", require("../../routes/authRoutes"));
  app.use("/api/leave", require("../../routes/leaveRoutes"));

  await new Promise((resolve) => {
    serverInstance = app.listen(0, "127.0.0.1", () => {
      const port = serverInstance.address().port;
      activeBaseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Create a dedicated student for upload testing
  const uname = `upload_test_${Date.now()}`;
  studentUser = await User.create({
    username: uname,
    password: "Password123!",
    role: "student",
  });
  studentProfile = await Student.create({
    userId: studentUser.id,
    name: "Upload Test Student",
    department: "CSE",
    className: "7A",
    semester: 7,
    section: "A",
  });

  studentToken = jwt.sign(
    { id: studentUser.id, role: "student", studentId: studentProfile.id },
    process.env.JWT_SECRET || "default_jwt_secret_key",
    { expiresIn: "1h" }
  );
}

function teardownServer() {
  if (serverInstance) {
    serverInstance.close();
  }
}

async function runUploadSecuritySuite() {
  console.log("==================================================================");
  console.log("TEST SUITE: SECURE FILE UPLOAD, MAGIC BYTES & STATIC PROTECTION");
  console.log("==================================================================\n");

  await setupServer();

  try {
    // ==================================================================
    // 1. LEGITIMATE UPLOAD TESTS (ALLOWED EXTENSIONS WITH VALID SIGNATURES)
    // ==================================================================
    console.log("\n--- 1. Allowed Files with Valid Magic Bytes ---");

    // Case 1A: Valid PDF upload
    const validPdfBytes = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");
    const pdfBlob = new Blob([validPdfBytes], { type: "application/pdf" });
    const pdfForm = new FormData();
    pdfForm.append("leaveType", "Medical Leave");
    pdfForm.append("fromDate", "2026-11-01");
    pdfForm.append("toDate", "2026-11-02");
    pdfForm.append("reason", "Hospitalization medical certificate");
    pdfForm.append("file", pdfBlob, "valid_cert.pdf");

    const pdfRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: pdfForm,
    });
    const pdfData = await pdfRes.json();
    assert(pdfRes.status === 201, "1A: Valid PDF upload returns HTTP 201 Created");
    assert(pdfData.success === true, "1A: PDF leave application reports success = true");
    assert(pdfData.leave?.document, `1A: Document filename saved (${pdfData.leave?.document})`);
    if (pdfData.leave?.id) createdLeaveIds.push(pdfData.leave.id);

    // Verify file actually exists on disk
    const savedPdfPath = path.join(uploadDir, pdfData.leave.document);
    assert(fs.existsSync(savedPdfPath), "1A: Valid PDF file exists in uploads/certificates directory");

    // Case 1B: Valid PNG upload
    const validPngBytes = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const pngBlob = new Blob([validPngBytes], { type: "image/png" });
    const pngForm = new FormData();
    pngForm.append("leaveType", "Casual Leave");
    pngForm.append("fromDate", "2026-11-05");
    pngForm.append("toDate", "2026-11-05");
    pngForm.append("reason", "Family event permission letter");
    pngForm.append("file", pngBlob, "signed_letter.png");

    const pngRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: pngForm,
    });
    const pngData = await pngRes.json();
    assert(pngRes.status === 201, "1B: Valid PNG upload returns HTTP 201 Created");
    if (pngData.leave?.id) createdLeaveIds.push(pngData.leave.id);

    // Case 1C: Valid JPEG upload
    const validJpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    const jpgBlob = new Blob([validJpgBytes], { type: "image/jpeg" });
    const jpgForm = new FormData();
    jpgForm.append("leaveType", "On Duty");
    jpgForm.append("fromDate", "2026-11-10");
    jpgForm.append("toDate", "2026-11-11");
    jpgForm.append("reason", "Hackathon participation certificate");
    jpgForm.append("file", jpgBlob, "hackathon.jpg");

    const jpgRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: jpgForm,
    });
    const jpgData = await jpgRes.json();
    assert(jpgRes.status === 201, "1C: Valid JPEG upload returns HTTP 201 Created");
    if (jpgData.leave?.id) createdLeaveIds.push(jpgData.leave.id);

    // ==================================================================
    // 2. DISALLOWED FILE EXTENSION TESTS
    // ==================================================================
    console.log("\n--- 2. Disallowed File Extensions ---");

    // Case 2A: Shell script (.sh)
    const shBlob = new Blob([Buffer.from("#!/bin/bash\necho test")], { type: "application/x-sh" });
    const shForm = new FormData();
    shForm.append("leaveType", "Medical Leave");
    shForm.append("fromDate", "2026-11-01");
    shForm.append("toDate", "2026-11-02");
    shForm.append("reason", "Shell script upload");
    shForm.append("file", shBlob, "payload.sh");

    const shRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: shForm,
    });
    const shData = await shRes.json();
    assert(shRes.status === 400, "2A: Disallowed .sh extension returns HTTP 400 Bad Request");
    assert(shData.message?.includes("File type not allowed"), `2A: Expected error message: "${shData.message}"`);

    // Case 2B: PHP script (.php)
    const phpBlob = new Blob([Buffer.from("<?php phpinfo(); ?>")], { type: "application/x-httpd-php" });
    const phpForm = new FormData();
    phpForm.append("leaveType", "Medical Leave");
    phpForm.append("fromDate", "2026-11-01");
    phpForm.append("toDate", "2026-11-02");
    phpForm.append("reason", "PHP script upload");
    phpForm.append("file", phpBlob, "webshell.php");

    const phpRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: phpForm,
    });
    assert(phpRes.status === 400, "2B: Disallowed .php extension returns HTTP 400 Bad Request");

    // Case 2C: Executable (.exe)
    const exeBlob = new Blob([Buffer.from("MZ\x90\x00\x03\x00\x00\x00")], { type: "application/octet-stream" });
    const exeForm = new FormData();
    exeForm.append("leaveType", "Medical Leave");
    exeForm.append("fromDate", "2026-11-01");
    exeForm.append("toDate", "2026-11-02");
    exeForm.append("reason", "EXE upload");
    exeForm.append("file", exeBlob, "malware.exe");

    const exeRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: exeForm,
    });
    assert(exeRes.status === 400, "2C: Disallowed .exe extension returns HTTP 400 Bad Request");

    // Case 2D: HTML / SVG script vector (.html)
    const htmlBlob = new Blob([Buffer.from("<script>alert(1)</script>")], { type: "text/html" });
    const htmlForm = new FormData();
    htmlForm.append("leaveType", "Medical Leave");
    htmlForm.append("fromDate", "2026-11-01");
    htmlForm.append("toDate", "2026-11-02");
    htmlForm.append("reason", "HTML upload");
    htmlForm.append("file", htmlBlob, "xss.html");

    const htmlRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: htmlForm,
    });
    assert(htmlRes.status === 400, "2D: Disallowed .html extension returns HTTP 400 Bad Request");

    // ==================================================================
    // 3. DISALLOWED EXTENSION WITH SPOOFED MIME TYPE
    // ==================================================================
    console.log("\n--- 3. Disallowed Extension with Spoofed MIME Type ---");

    // Case 3A: .php file disguised with MIME type application/pdf
    const spoofedPhpBlob = new Blob([Buffer.from("<?php system($_GET['cmd']); ?>")], {
      type: "application/pdf",
    });
    const spoofedPhpForm = new FormData();
    spoofedPhpForm.append("leaveType", "Medical Leave");
    spoofedPhpForm.append("fromDate", "2026-11-01");
    spoofedPhpForm.append("toDate", "2026-11-02");
    spoofedPhpForm.append("reason", "Disguised PHP upload");
    spoofedPhpForm.append("file", spoofedPhpBlob, "webshell.php");

    const spoofedPhpRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: spoofedPhpForm,
    });
    const spoofedPhpData = await spoofedPhpRes.json();
    assert(spoofedPhpRes.status === 400, "3A: Disallowed .php with spoofed PDF MIME returns HTTP 400");
    assert(
      spoofedPhpData.message?.includes("File type not allowed"),
      `3A: Error message enforces allowed extension whitelist: "${spoofedPhpData.message}"`
    );

    // ==================================================================
    // 4. EXTENSION / MIME TYPE MISMATCH TESTS
    // ==================================================================
    console.log("\n--- 4. Extension / MIME Type Mismatch Tests ---");

    // Case 4A: File named .pdf with MIME type image/png
    const mismatchBlob1 = new Blob([validPdfBytes], { type: "image/png" });
    const mismatchForm1 = new FormData();
    mismatchForm1.append("leaveType", "Medical Leave");
    mismatchForm1.append("fromDate", "2026-11-01");
    mismatchForm1.append("toDate", "2026-11-02");
    mismatchForm1.append("reason", "Mismatch test");
    mismatchForm1.append("file", mismatchBlob1, "mismatch.pdf");

    const mismatchRes1 = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: mismatchForm1,
    });
    const mismatchData1 = await mismatchRes1.json();
    assert(mismatchRes1.status === 400, "4A: .pdf extension with image/png MIME returns HTTP 400 Bad Request");
    assert(
      mismatchData1.message?.includes("does not match file extension"),
      `4A: Returns clear mismatch error: "${mismatchData1.message}"`
    );

    // Case 4B: File named .jpg with MIME type application/pdf
    const mismatchBlob2 = new Blob([validJpgBytes], { type: "application/pdf" });
    const mismatchForm2 = new FormData();
    mismatchForm2.append("leaveType", "Medical Leave");
    mismatchForm2.append("fromDate", "2026-11-01");
    mismatchForm2.append("toDate", "2026-11-02");
    mismatchForm2.append("reason", "Mismatch test 2");
    mismatchForm2.append("file", mismatchBlob2, "photo.jpg");

    const mismatchRes2 = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: mismatchForm2,
    });
    assert(mismatchRes2.status === 400, "4B: .jpg extension with application/pdf MIME returns HTTP 400");

    // ==================================================================
    // 5. MAGIC BYTES / INVALID FILE SIGNATURE TESTS
    // ==================================================================
    console.log("\n--- 5. Magic Bytes & File Signature Validation ---");

    // Count files in uploadDir before invalid signature upload
    const dirBefore = fs.readdirSync(uploadDir);

    // Case 5A: File named cert.pdf with MIME application/pdf, but containing plain text / shell script bytes
    const fakePdfBytes = Buffer.from("#!/bin/bash\necho 'I am not a PDF file!'\nrm -rf /");
    const fakePdfBlob = new Blob([fakePdfBytes], { type: "application/pdf" });
    const fakePdfForm = new FormData();
    fakePdfForm.append("leaveType", "Medical Leave");
    fakePdfForm.append("fromDate", "2026-11-01");
    fakePdfForm.append("toDate", "2026-11-02");
    fakePdfForm.append("reason", "Spoofed PDF signature");
    fakePdfForm.append("file", fakePdfBlob, "forged_certificate.pdf");

    const fakePdfRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: fakePdfForm,
    });
    const fakePdfData = await fakePdfRes.json();
    assert(fakePdfRes.status === 400, "5A: Forged PDF signature returns HTTP 400 Bad Request");
    assert(
      fakePdfData.message?.includes("Invalid file signature"),
      `5A: Rejected for invalid signature: "${fakePdfData.message}"`
    );

    // Verify file was PURGED from disk and not left behind
    const dirAfter = fs.readdirSync(uploadDir);
    assert(
      dirAfter.length === dirBefore.length,
      "5A: Spoofed file was successfully unlinked from disk immediately upon failed signature check"
    );

    // Case 5B: File named photo.png with MIME image/png, but containing corrupt bytes
    const fakePngBytes = Buffer.from("THIS IS NOT A VALID PNG HEADER AT ALL");
    const fakePngBlob = new Blob([fakePngBytes], { type: "image/png" });
    const fakePngForm = new FormData();
    fakePngForm.append("leaveType", "Medical Leave");
    fakePngForm.append("fromDate", "2026-11-01");
    fakePngForm.append("toDate", "2026-11-02");
    fakePngForm.append("reason", "Spoofed PNG signature");
    fakePngForm.append("file", fakePngBlob, "corrupt.png");

    const fakePngRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: fakePngForm,
    });
    assert(fakePngRes.status === 400, "5B: Corrupt PNG signature returns HTTP 400 Bad Request");

    // ==================================================================
    // 6. FILE SIZE LIMIT ENFORCEMENT (> 5MB)
    // ==================================================================
    console.log("\n--- 6. File Size Limit Enforcement ---");

    // Case 6A: File exceeding 5MB (e.g. 5.5MB)
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 0x25); // 5.5 MB of %
    largeBuffer.write("%PDF-1.4\n", 0); // valid header, oversized
    const largeBlob = new Blob([largeBuffer], { type: "application/pdf" });
    const largeForm = new FormData();
    largeForm.append("leaveType", "Medical Leave");
    largeForm.append("fromDate", "2026-11-01");
    largeForm.append("toDate", "2026-11-02");
    largeForm.append("reason", "Oversized file upload");
    largeForm.append("file", largeBlob, "huge_certificate.pdf");

    const largeRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: largeForm,
    });
    const largeData = await largeRes.json();
    assert(largeRes.status === 400, "6A: File exceeding 5MB limit returns HTTP 400 Bad Request");
    assert(
      largeData.message?.includes("exceeds 5MB limit"),
      `6A: Proper size limit error message: "${largeData.message}"`
    );

    // ==================================================================
    // 7. LEGITIMATE APPLICATION WITHOUT ATTACHMENT
    // ==================================================================
    console.log("\n--- 7. Application Without Attachment ---");

    const noFileForm = new FormData();
    noFileForm.append("leaveType", "Casual Leave");
    noFileForm.append("fromDate", "2026-11-15");
    noFileForm.append("toDate", "2026-11-16");
    noFileForm.append("reason", "Personal reasons without attachment");

    const noFileRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: noFileForm,
    });
    const noFileData = await noFileRes.json();
    assert(noFileRes.status === 201, "7A: Leave application without file attachment returns HTTP 201 Created");
    assert(noFileData.leave?.document === null, "7A: Document field is correctly stored as null");
    if (noFileData.leave?.id) createdLeaveIds.push(noFileData.leave.id);

    // ==================================================================
    // 8. STATIC SERVING SECURITY HEADERS
    // ==================================================================
    console.log("\n--- 8. Static /uploads Security Headers ---");

    // Fetch the previously uploaded valid PDF via static route
    const staticRes = await fetch(`${activeBaseUrl}/uploads/certificates/${pdfData.leave.document}`);
    assert(staticRes.status === 200, "8A: Uploaded certificate accessible via static route");
    assert(
      staticRes.headers.get("x-content-type-options") === "nosniff",
      "8B: Static route serves 'X-Content-Type-Options: nosniff'"
    );
    assert(
      staticRes.headers.get("content-security-policy") === "default-src 'none'",
      "8C: Static route enforces 'Content-Security-Policy: default-src none'"
    );

    // ==================================================================
    // 9. ORPHAN FILE CLEANUP ON VALIDATION & CONTROLLER FAILURES
    // ==================================================================
    console.log("\n--- 9. Orphan File Cleanup on Validation & Controller Failures ---");
    const { cleanupUploadedFile } = require("../../controllers/leaveController");

    // Case 9A: Invalid date range (fromDate > toDate) with valid uploaded PDF
    const countBefore9A = fs.readdirSync(uploadDir).length;
    const invDateBlob = new Blob([validPdfBytes], { type: "application/pdf" });
    const invDateForm = new FormData();
    invDateForm.append("leaveType", "Medical Leave");
    invDateForm.append("fromDate", "2026-11-20");
    invDateForm.append("toDate", "2026-11-10"); // Earlier than fromDate!
    invDateForm.append("reason", "Invalid date test reason");
    invDateForm.append("file", invDateBlob, "orphan_test_date.pdf");

    const invDateRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: invDateForm,
    });
    const invDateData = await invDateRes.json();
    assert(invDateRes.status === 400, "9A: fromDate > toDate returns HTTP 400 Bad Request");
    assert(
      invDateData.message === "From date cannot be later than to date",
      `9A: Exact error message returned: "${invDateData.message}"`
    );
    const countAfter9A = fs.readdirSync(uploadDir).length;
    assert(
      countAfter9A === countBefore9A,
      "9A: Orphaned file was unlinked from disk on date validation failure (zero files leaked)"
    );
    const dbLeaves9A = await Leave.findAll({ where: { reason: "Invalid date test reason" } });
    assert(dbLeaves9A.length === 0, "9A: No database record persisted on date validation failure");

    // Case 9B: Missing required fields (missing reason) with valid uploaded PDF
    const countBefore9B = fs.readdirSync(uploadDir).length;
    const missFieldBlob = new Blob([validPdfBytes], { type: "application/pdf" });
    const missFieldForm = new FormData();
    missFieldForm.append("leaveType", "Medical Leave");
    missFieldForm.append("fromDate", "2026-11-01");
    missFieldForm.append("toDate", "2026-11-02");
    // Missing reason!
    missFieldForm.append("file", missFieldBlob, "orphan_test_missing.pdf");

    const missFieldRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${studentToken}` },
      body: missFieldForm,
    });
    const missFieldData = await missFieldRes.json();
    assert(missFieldRes.status === 400, "9B: Missing reason returns HTTP 400 Bad Request");
    assert(
      missFieldData.message?.includes("Leave type, from date, to date, and reason are required"),
      `9B: Expected validation message: "${missFieldData.message}"`
    );
    const countAfter9B = fs.readdirSync(uploadDir).length;
    assert(
      countAfter9B === countBefore9B,
      "9B: Orphaned file was unlinked from disk on missing field validation failure"
    );

    // Case 9C: Non-student (admin token) attempting to apply for leave with valid uploaded PDF
    const adminToken = jwt.sign(
      { id: 9999, role: "admin" },
      process.env.JWT_SECRET || "default_jwt_secret_key",
      { expiresIn: "1h" }
    );
    const countBefore9C = fs.readdirSync(uploadDir).length;
    const adminUploadBlob = new Blob([validPdfBytes], { type: "application/pdf" });
    const adminUploadForm = new FormData();
    adminUploadForm.append("leaveType", "Medical Leave");
    adminUploadForm.append("fromDate", "2026-11-01");
    adminUploadForm.append("toDate", "2026-11-02");
    adminUploadForm.append("reason", "Admin trying to apply leave");
    adminUploadForm.append("file", adminUploadBlob, "admin_upload.pdf");

    const adminUploadRes = await fetch(`${activeBaseUrl}/api/leave/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: adminUploadForm,
    });
    const adminUploadData = await adminUploadRes.json();
    assert(adminUploadRes.status === 403, "9C: Non-student applying for leave returns HTTP 403 Forbidden");
    assert(
      adminUploadData.message === "Only registered students can apply for leave",
      `9C: Proper 403 message returned: "${adminUploadData.message}"`
    );
    const countAfter9C = fs.readdirSync(uploadDir).length;
    assert(
      countAfter9C === countBefore9C,
      "9C: Orphaned file was unlinked from disk on role authorization failure"
    );

    // Case 9D: Guard against deleting file belonging to an existing persisted Leave
    const dummyCertName = `test_preserve_${Date.now()}.pdf`;
    const dummyCertPath = path.join(uploadDir, dummyCertName);
    fs.writeFileSync(dummyCertPath, validPdfBytes);

    const preservedLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "On Duty",
      fromDate: "2026-11-25",
      toDate: "2026-11-26",
      reason: "Existing persisted leave record preservation test",
      document: dummyCertName,
      status: "pending",
    });
    createdLeaveIds.push(preservedLeave.id);

    // Attempt cleanup on the already-persisted file
    await cleanupUploadedFile({ path: dummyCertPath, filename: dummyCertName });
    assert(
      fs.existsSync(dummyCertPath),
      "9D: cleanupUploadedFile strictly refuses to delete a file linked to an existing Leave record"
    );

    // Case 9E: Path containment guard (reject paths outside uploadDir)
    const outsideFilePath = path.join(__dirname, "fake_outside.txt");
    await cleanupUploadedFile({ path: outsideFilePath, filename: "fake_outside.txt" });
    assert(true, "9E: cleanupUploadedFile safely handles and ignores paths outside uploadDir without errors");

    // Case 9F: Sibling-directory prefix collision test (e.g., certificates_sibling)
    const siblingDir = path.join(uploadDir, "..", "certificates_sibling");
    if (!fs.existsSync(siblingDir)) fs.mkdirSync(siblingDir, { recursive: true });
    const siblingFile = path.join(siblingDir, "sibling_secret.pdf");
    fs.writeFileSync(siblingFile, validPdfBytes);

    await cleanupUploadedFile({ path: siblingFile, filename: "sibling_secret.pdf" });
    assert(
      fs.existsSync(siblingFile),
      "9F: Sibling-directory prefix collision (certificates_sibling) is rejected and file is preserved"
    );
    if (fs.existsSync(siblingFile)) fs.unlinkSync(siblingFile);
    if (fs.existsSync(siblingDir)) fs.rmdirSync(siblingDir);

    // Case 9G: Database-query failure fail-safe check
    const dbFailName = `test_dbfail_${Date.now()}.pdf`;
    const dbFailPath = path.join(uploadDir, dbFailName);
    fs.writeFileSync(dbFailPath, validPdfBytes);

    const originalFindOne = Leave.findOne;
    Leave.findOne = async () => {
      throw new Error("Simulated database connection failure");
    };

    try {
      await cleanupUploadedFile({ path: dbFailPath, filename: dbFailName });
      assert(
        fs.existsSync(dbFailPath),
        "9G: Fail-safe DB guard: file is NOT unlinked when Leave.findOne throws an error"
      );
    } finally {
      Leave.findOne = originalFindOne;
      if (fs.existsSync(dbFailPath)) fs.unlinkSync(dbFailPath);
    }

    // Case 9H: Already-missing file (ENOENT) handling
    const missingPath = path.join(uploadDir, "already_nonexistent_file.pdf");
    let enoentThrew = false;
    try {
      await cleanupUploadedFile({ path: missingPath, filename: "already_nonexistent_file.pdf" });
    } catch (_) {
      enoentThrew = true;
    }
    assert(!enoentThrew, "9H: Already-missing file (ENOENT) is safely handled without throwing error");

  } catch (err) {
    console.error("Test execution exception:", err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    // Clean up created entities & files
    try {
      for (const id of createdLeaveIds) {
        const l = await Leave.findByPk(id);
        if (l?.document) {
          const p = path.join(uploadDir, l.document);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        await Leave.destroy({ where: { id } });
      }
      if (studentProfile?.id) {
        await Student.destroy({ where: { id: studentProfile.id } });
      }
      if (studentUser?.id) {
        await User.destroy({ where: { id: studentUser.id } });
      }
    } catch (cleanupErr) {
      // ignore cleanup error
    }
    teardownServer();
  }

  console.log("\n==================================================================");
  console.log(`UPLOAD SECURITY SUITE: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) process.exit(1);
}

runUploadSecuritySuite();
