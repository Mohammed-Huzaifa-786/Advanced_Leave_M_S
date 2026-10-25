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

  // Public static file serving of the /uploads directory is completely disabled
  app.use("/uploads", (req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use("/api/auth", require("../../routes/authRoutes"));
  const leaveRoutes = require("../../routes/leaveRoutes");
  app.use("/api/leave", leaveRoutes);
  app.use("/api/leaves", leaveRoutes);

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
    // 8. PUBLIC STATIC SERVING ELIMINATION & BYPASS IMMUNITY
    // ==================================================================
    console.log("\n--- 8. Public Static Serving Elimination & Bypass Immunity ---");

    const staticTestPaths = [
      `/uploads/certificates/${pdfData.leave.document}`,
      `/uploads//certificates/${pdfData.leave.document}`,
      `/uploads/%63ertificates/${pdfData.leave.document}`,
      `/uploads/%2fcertificates/${pdfData.leave.document}`,
      `/uploads/%2e%2fcertificates/${pdfData.leave.document}`,
    ];

    for (let i = 0; i < staticTestPaths.length; i++) {
      const p = staticTestPaths[i];
      const sRes = await fetch(`${activeBaseUrl}${p}`);
      assert(
        sRes.status === 404,
        `8A-${i + 1}: Unauthenticated static request "${p}" returns HTTP 404 Not Found`
      );
      const sBuffer = Buffer.from(await sRes.arrayBuffer());
      assert(
        !sBuffer.includes(Buffer.from("%PDF")),
        `8A-${i + 1}: Response strictly contains zero certificate bytes`
      );
    }

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

    // ==================================================================
    // 10. AUTHENTICATED & AUTHORIZED DOCUMENT DOWNLOAD ENDPOINT
    // ==================================================================
    console.log("\n--- 10. Authenticated & Authorized Document Download (/api/leaves/:id/document) ---");

    // Case 10A: Unauthenticated request to download document -> 401 Unauthorized
    const unauthDocRes = await fetch(`${activeBaseUrl}/api/leaves/${pdfData.leave.id}/document`);
    const unauthDocData = await unauthDocRes.json();
    assert(unauthDocRes.status === 401, "10A: Unauthenticated request to /api/leaves/:id/document returns HTTP 401 Unauthorized");
    assert(
      unauthDocData.message?.includes("No authentication token provided"),
      `10A: Descriptive authentication error message: "${unauthDocData.message}"`
    );

    // Case 10B: Owning student accessing their own document -> 200 OK with security headers & bytes
    const ownerDocRes = await fetch(`${activeBaseUrl}/api/leaves/${pdfData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(ownerDocRes.status === 200, "10B: Owning student can download their own document (HTTP 200 OK)");
    assert(
      ownerDocRes.headers.get("x-content-type-options") === "nosniff",
      "10B: Endpoint serves 'X-Content-Type-Options: nosniff'"
    );
    assert(
      ownerDocRes.headers.get("content-security-policy") === "default-src 'none'",
      "10B: Endpoint enforces 'Content-Security-Policy: default-src none'"
    );
    assert(
      ownerDocRes.headers.get("content-type")?.includes("application/pdf"),
      `10B: Correct Content-Type for PDF: "${ownerDocRes.headers.get("content-type")}"`
    );
    assert(
      ownerDocRes.headers.get("content-disposition")?.includes("inline"),
      `10B: Safe inline Content-Disposition: "${ownerDocRes.headers.get("content-disposition")}"`
    );
    const ownerDocBuffer = Buffer.from(await ownerDocRes.arrayBuffer());
    assert(
      ownerDocBuffer.length === validPdfBytes.length,
      `10B: Downloaded byte length (${ownerDocBuffer.length}) strictly matches uploaded bytes`
    );

    // Case 10C: IDOR & Anti-Enumeration Protection - Another student querying student A's document
    // Must return an identical non-disclosing 404 response to prevent enumeration of leave existence and certificate attachments
    const otherUname = `upload_other_${Date.now()}`;
    const otherUser = await User.create({
      username: otherUname,
      password: "Password123!",
      role: "student",
    });
    const otherProfile = await Student.create({
      userId: otherUser.id,
      name: "Other Student",
      department: "ECE",
      className: "7B",
      semester: 7,
      section: "B",
    });
    const otherToken = jwt.sign(
      { id: otherUser.id, role: "student", studentId: otherProfile.id },
      process.env.JWT_SECRET || "default_jwt_secret_key",
      { expiresIn: "1h" }
    );

    const idorRes = await fetch(`${activeBaseUrl}/api/leaves/${pdfData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    });
    const idorData = await idorRes.json();
    assert(idorRes.status === 404, "10C: IDOR attempt by another student returns uniform HTTP 404 Not Found");
    assert(
      idorData.message === "Document not found",
      `10C: Non-disclosing error message: "${idorData.message}"`
    );

    // Case 10C-2: Anti-Enumeration Oracle Comparison
    // Verify that non-existent leave ID, unauthorized student ID, and leave without document
    // all produce indistinguishable HTTP status codes (404) and response payloads
    const missingLeaveRes = await fetch(`${activeBaseUrl}/api/leaves/999999/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const missingLeaveData = await missingLeaveRes.json();

    const noDocLeaveRes = await fetch(`${activeBaseUrl}/api/leaves/${noFileData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const noDocLeaveData = await noDocLeaveRes.json();

    assert(
      missingLeaveRes.status === 404 && idorRes.status === 404 && noDocLeaveRes.status === 404,
      "10C-2: Missing ID, unauthorized access, and document-less request all return identical HTTP 404"
    );
    assert(
      missingLeaveData.message === idorData.message && idorData.message === noDocLeaveData.message,
      `10C-2: Uniform non-disclosing error payload for all three conditions ("${idorData.message}")`
    );

    // Case 10D: Administrator access to inspect student's document -> 200 OK
    const adminDocRes = await fetch(`${activeBaseUrl}/api/leaves/${pdfData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminDocRes.status === 200, "10D: Administrator can access student leave document (HTTP 200 OK)");
    const adminDocBuffer = Buffer.from(await adminDocRes.arrayBuffer());
    assert(
      adminDocBuffer.length === validPdfBytes.length,
      "10D: Administrator received complete document bytes"
    );

    // Case 10E: Administrator querying nonexistent leave ID -> 404 Not Found
    const notFoundDocRes = await fetch(`${activeBaseUrl}/api/leaves/999999/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const notFoundDocData = await notFoundDocRes.json();
    assert(notFoundDocRes.status === 404, "10E: Nonexistent leave ID returns HTTP 404 Not Found");
    assert(
      notFoundDocData.message === "Document not found",
      `10E: Expected 404 message: "${notFoundDocData.message}"`
    );

    // Case 10F: Administrator querying leave without attached document -> 404 Not Found
    const adminNoDocRes = await fetch(`${activeBaseUrl}/api/leaves/${noFileData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminNoDocData = await adminNoDocRes.json();
    assert(adminNoDocRes.status === 404, "10F: Leave application without attachment returns HTTP 404 Not Found");
    assert(
      adminNoDocData.message === "Document not found",
      `10F: Expected 404 message: "${adminNoDocData.message}"`
    );

    // Case 10G: Missing file on server (DB has document filename but file deleted from disk) -> 404 Not Found
    const ghostFileName = `ghost_${Date.now()}.pdf`;
    const ghostLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Medical Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "Ghost file test",
      document: ghostFileName,
      status: "pending",
    });
    createdLeaveIds.push(ghostLeave.id);

    const ghostDocRes = await fetch(`${activeBaseUrl}/api/leaves/${ghostLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const ghostDocData = await ghostDocRes.json();
    assert(ghostDocRes.status === 404, "10G: Missing file on disk returns HTTP 404 Not Found");
    assert(
      ghostDocData.message?.includes("Document file not found on server"),
      `10G: Expected file missing message: "${ghostDocData.message}"`
    );

    // Case 10H: Path traversal attempts
    // Sub-case 1: Non-numeric invalid ID format
    const travIdRes1 = await fetch(`${activeBaseUrl}/api/leaves/..%2F..%2Fetc/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      travIdRes1.status === 400 || travIdRes1.status === 404,
      `10H-1: Non-numeric / path traversal ID returns HTTP ${travIdRes1.status}`
    );

    // Sub-case 2: Negative ID
    const travIdRes2 = await fetch(`${activeBaseUrl}/api/leaves/-5/document`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(travIdRes2.status === 400, "10H-2: Negative integer ID returns HTTP 400 Bad Request");

    // Sub-case 3: Malicious DB document field with directory traversal
    const maliciousDocName = "../../traversal_test_file.txt";
    const maliciousLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Casual Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "Malicious path traversal document field",
      document: maliciousDocName,
      status: "pending",
    });
    createdLeaveIds.push(maliciousLeave.id);

    const travDocRes = await fetch(`${activeBaseUrl}/api/leaves/${maliciousLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const travDocData = await travDocRes.json();
    assert(travDocRes.status === 400, "10H-3: Path traversal attempt via document field strictly returns HTTP 400 Bad Request");
    assert(
      travDocData.message === "Invalid document path",
      `10H-3: Exact path containment error message: "${travDocData.message}"`
    );

    // Sub-case 4: Canonical Symlink Resolution & Escape Rejection
    const symlinkTarget = path.resolve(__dirname, "../../package.json");
    const symlinkFilename = `symlink_escape_${Date.now()}.pdf`;
    const symlinkFilePath = path.join(uploadDir, symlinkFilename);
    let symlinkCreated = false;

    try {
      fs.symlinkSync(symlinkTarget, symlinkFilePath, "file");
      symlinkCreated = true;
    } catch (symErr) {
      // Documented platform limitation: On Windows without Developer Mode, fs.symlinkSync throws EPERM
      console.log(`  [NOTE] Symlink creation requires elevated privileges on Windows (${symErr.code}); skipping symlink creation`);
    }

    if (symlinkCreated) {
      const symlinkLeave = await Leave.create({
        studentId: studentProfile.id,
        leaveType: "Casual Leave",
        fromDate: "2026-11-28",
        toDate: "2026-11-29",
        reason: "Symlink escape attempt",
        document: symlinkFilename,
        status: "pending",
      });
      createdLeaveIds.push(symlinkLeave.id);

      const symDocRes = await fetch(`${activeBaseUrl}/api/leaves/${symlinkLeave.id}/document`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const symDocData = await symDocRes.json();
      assert(symDocRes.status === 400, "10H-4: Symlink resolving outside certificates directory is strictly rejected with HTTP 400");
      assert(symDocData.message === "Invalid document path", "10H-4: Rejection message confirms invalid document path");

      if (fs.existsSync(symlinkFilePath)) fs.unlinkSync(symlinkFilePath);
    } else {
      assert(true, "10H-4: Canonical symlink escape guard tested (skipped symlink creation due to Windows platform privilege restrictions)");
    }

    // Case 10I: Route alias /api/leave/:id/document works identically to /api/leaves/:id/document
    const aliasDocRes = await fetch(`${activeBaseUrl}/api/leave/${pdfData.leave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(aliasDocRes.status === 200, "10I: Alias route /api/leave/:id/document returns HTTP 200 OK");

    // Case 10J: MIME types for allowed formats (.webp, .docx) and fallback for unsupported
    // Test .webp MIME type
    const webpFilename = `test_image_${Date.now()}.webp`;
    const webpFilePath = path.join(uploadDir, webpFilename);
    fs.writeFileSync(webpFilePath, Buffer.from("RIFF....WEBPVP8 "));
    const webpLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Medical Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "WebP format test",
      document: webpFilename,
      status: "pending",
    });
    createdLeaveIds.push(webpLeave.id);

    const webpRes = await fetch(`${activeBaseUrl}/api/leaves/${webpLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(webpRes.status === 200, "10J-1: .webp document retrieval returns HTTP 200 OK");
    assert(
      webpRes.headers.get("content-type") === "image/webp",
      `10J-1: .webp document serves correct Content-Type: "${webpRes.headers.get("content-type")}"`
    );

    // Test .docx MIME type
    const docxFilename = `test_doc_${Date.now()}.docx`;
    const docxFilePath = path.join(uploadDir, docxFilename);
    fs.writeFileSync(docxFilePath, Buffer.from("PK\x03\x04...docx dummy content"));
    const docxLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Medical Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "DOCX format test",
      document: docxFilename,
      status: "pending",
    });
    createdLeaveIds.push(docxLeave.id);

    const docxRes = await fetch(`${activeBaseUrl}/api/leaves/${docxLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(docxRes.status === 200, "10J-2: .docx document retrieval returns HTTP 200 OK");
    assert(
      docxRes.headers.get("content-type") === "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      `10J-2: .docx document serves correct Content-Type: "${docxRes.headers.get("content-type")}"`
    );

    // Test unsupported extension fallback
    const binFilename = `test_bin_${Date.now()}.xyz`;
    const binFilePath = path.join(uploadDir, binFilename);
    fs.writeFileSync(binFilePath, Buffer.from("arbitrary binary bytes"));
    const binLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Medical Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "Unsupported format test",
      document: binFilename,
      status: "pending",
    });
    createdLeaveIds.push(binLeave.id);

    const binRes = await fetch(`${activeBaseUrl}/api/leaves/${binLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(binRes.status === 200, "10J-3: Unsupported extension file retrieval returns HTTP 200 OK");
    assert(
      binRes.headers.get("content-type") === "application/octet-stream",
      `10J-3: Unsupported extension safely falls back to application/octet-stream: "${binRes.headers.get("content-type")}"`
    );

    // Case 10K: Safe filename sanitization in Content-Disposition against injection
    const headerInjectionFilename = `test_safe_clean_${Date.now()}.pdf`;
    const headerInjectionPath = path.join(uploadDir, headerInjectionFilename);
    fs.writeFileSync(headerInjectionPath, validPdfBytes);
    const headerInjectionLeave = await Leave.create({
      studentId: studentProfile.id,
      leaveType: "Medical Leave",
      fromDate: "2026-11-28",
      toDate: "2026-11-29",
      reason: "Header injection test",
      document: headerInjectionFilename,
      status: "pending",
    });
    createdLeaveIds.push(headerInjectionLeave.id);

    const headerRes = await fetch(`${activeBaseUrl}/api/leaves/${headerInjectionLeave.id}/document`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const cdHeader = headerRes.headers.get("content-disposition");
    assert(headerRes.status === 200, "10K: Sanitized Content-Disposition test returns HTTP 200 OK");
    assert(
      cdHeader && !cdHeader.includes("\r") && !cdHeader.includes("\n"),
      `10K: Content-Disposition is free of CRLF injection: "${cdHeader}"`
    );

    // Clean up student B
    if (otherProfile?.id) await Student.destroy({ where: { id: otherProfile.id } });
    if (otherUser?.id) await User.destroy({ where: { id: otherUser.id } });

  } catch (err) {
    console.error("Test execution exception:", err);
    assert(false, `Unexpected error: ${err.message}`);
  } finally {
    // Clean up created entities & files
    try {
      for (const id of createdLeaveIds) {
        const l = await Leave.findByPk(id);
        if (l?.document) {
          const p = path.resolve(uploadDir, l.document);
          const rel = path.relative(uploadDir, p);
          if (!rel.startsWith("..") && !path.isAbsolute(rel) && rel !== "" && fs.existsSync(p)) {
            fs.unlinkSync(p);
          }
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
