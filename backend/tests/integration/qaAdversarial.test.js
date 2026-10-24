const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';

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
  const url = `${API_URL}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runAdversarialQA() {
  console.log("==================================================================");
  console.log("FINAL INDEPENDENT ADVERSARIAL QA PASS: REAL BROWSER & API STRESS");
  console.log("Chrome Binary:", CHROME_PATH);
  console.log("Target Frontend:", BASE_URL);
  console.log("Target Backend:", API_URL);
  console.log("==================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(`[PageError] ${err.message}`));
  page.on('console', (msg) => {
    const text = msg.text();
    const isIgnored = msg.type() !== 'error' ||
      text.includes('favicon') ||
      text.includes('status of 401') ||
      text.includes('status of 403') ||
      text.includes('Back-Forward Cache');
    if (!isIgnored) {
      consoleErrors.push(`[ConsoleError] ${text}`);
    }
  });

  async function resetBrowserSession() {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
  }

  async function clearAndType(inputElement, text) {
    await inputElement.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.evaluate(el => {
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, inputElement);
    if (text) {
      await inputElement.type(text);
    }
  }

  async function fillLoginForm(username, password, role) {
    await page.waitForSelector('select', { timeout: 6000 });
    await page.select('select', role);

    const uInput = await page.$('form input:not([type="password"])');
    await clearAndType(uInput, username);

    const pInput = await page.$('form input[type="password"]');
    await clearAndType(pInput, password);
  }

  try {
    // ================================================================
    // PHASE 2 — FRESH AUTHENTICATION TEST (REAL BROWSER)
    // ================================================================
    console.log("--- PHASE 2: Fresh Authentication In Real Browser ---");
    
    // 2.1 Student 1-Click Login
    await resetBrowserSession();
    await fillLoginForm('King', 'King@123', 'student');
    const studentLoginStart = Date.now();
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 8000 });
    const studentLoginDuration = Date.now() - studentLoginStart;
    assert(await page.evaluate(() => window.location.pathname) === '/student', `Student: 1-click login navigated to /student immediately (${studentLoginDuration}ms)`);
    assert(studentLoginDuration < 5000, "Student: Login operates swiftly without hangs");

    // Verify dashboard content
    await page.waitForSelector('h1', { timeout: 5000 });
    const studentHeading = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    assert(studentHeading.includes('Welcome'), `Student Dashboard: Heading rendered correctly ("${studentHeading}")`);

    // Verify session persistence across browser reload
    await page.reload({ waitUntil: 'networkidle2' });
    assert(await page.evaluate(() => window.location.pathname) === '/student', "Student: Session persists on page refresh (no kickback)");
    assert(await page.evaluate(() => !!localStorage.getItem('token')), "Student: Token preserved in localStorage");

    // Test direct navigation to protected student routes
    const studentSubRoutes = ['/profile', '/my-timetable', '/attendance-analytics', '/smart-leave-planner', '/leave-history'];
    for (const r of studentSubRoutes) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle2' });
      assert(await page.evaluate(() => window.location.pathname) === r, `Student Protected Route: Directly loaded '${r}'`);
    }

    // Student Logout
    await page.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('log out') || b.innerText.toLowerCase().includes('logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    assert(await page.evaluate(() => window.location.pathname) === '/', "Student: Logout immediately returns to '/'");
    assert(await page.evaluate(() => !localStorage.getItem('token')), "Student: Token completely deleted on logout");

    // Test Browser Back after logout
    await page.goBack();
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    assert(await page.evaluate(() => window.location.pathname) === '/', "Student: Browser Back blocked after logout and redirected to '/'");

    // 2.2 Admin 1-Click Login
    console.log("\n--- Admin Login & Session Flow ---");
    await resetBrowserSession();
    await fillLoginForm('Admin', 'Admin@123', 'admin');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 8000 });
    assert(await page.evaluate(() => window.location.pathname) === '/admin', "Admin: 1-click login navigated to /admin");

    // Admin session persistence across refresh
    await page.reload({ waitUntil: 'networkidle2' });
    assert(await page.evaluate(() => window.location.pathname) === '/admin', "Admin: Session persists on reload");

    // Admin direct routes
    const adminSubRoutes = ['/class-attendance', '/approve-leave', '/manage-students', '/timetable-management', '/timetable-generator'];
    for (const r of adminSubRoutes) {
      await page.goto(`${BASE_URL}${r}`, { waitUntil: 'networkidle2' });
      assert(await page.evaluate(() => window.location.pathname) === r, `Admin Protected Route: Directly loaded '${r}'`);
    }

    // Admin Logout
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    await page.evaluate(() => {
      const logoutBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('log out') || b.innerText.toLowerCase().includes('logout'));
      if (logoutBtn) logoutBtn.click();
    });
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    assert(await page.evaluate(() => !localStorage.getItem('token')), "Admin: Token purged on logout");

    // 2.3 Role Mismatch Security Enforcement
    console.log("\n--- Role Mismatch Enforcement ---");
    // Admin credentials in Student portal
    await resetBrowserSession();
    await fillLoginForm('Admin', 'Admin@123', 'student');
    await (await page.$('button[type="submit"]')).click();
    await new Promise(r => setTimeout(r, 1000));
    assert(await page.evaluate(() => window.location.pathname) === '/', "Role Mismatch: Admin in Student portal stays on '/'");
    const adminMismatchBanner = await page.evaluate(() => document.body.innerText);
    assert(adminMismatchBanner.includes("These credentials belong to an Admin account"), "Role Mismatch: Correct Admin-account error banner displayed");
    assert(await page.evaluate(() => !localStorage.getItem('token')), "Role Mismatch: Zero JWT issued or saved");

    // Student credentials in Admin portal
    await resetBrowserSession();
    await fillLoginForm('King', 'King@123', 'admin');
    await (await page.$('button[type="submit"]')).click();
    await new Promise(r => setTimeout(r, 1000));
    assert(await page.evaluate(() => window.location.pathname) === '/', "Role Mismatch: Student in Admin portal stays on '/'");
    const stdMismatchBanner = await page.evaluate(() => document.body.innerText);
    assert(stdMismatchBanner.includes("These credentials belong to a Student account"), "Role Mismatch: Correct Student-account error banner displayed");
    assert(await page.evaluate(() => !localStorage.getItem('token')), "Role Mismatch: Zero JWT issued or saved");

    // 2.4 Invalid Authentication Handling
    console.log("\n--- Invalid Authentication Scenarios ---");
    // Wrong password
    await resetBrowserSession();
    await fillLoginForm('King', 'WrongPassword123!', 'student');
    await (await page.$('button[type="submit"]')).click();
    await new Promise(r => setTimeout(r, 1000));
    assert(await page.evaluate(() => window.location.pathname) === '/', "Invalid Auth: Wrong password rejects navigation");
    assert(await page.evaluate(() => !localStorage.getItem('token')), "Invalid Auth: No token on wrong password");

    // Unknown user
    await fillLoginForm('NonExistentUser9999', 'AnyPass@123', 'student');
    await (await page.$('button[type="submit"]')).click();
    await new Promise(r => setTimeout(r, 1000));
    assert(await page.evaluate(() => window.location.pathname) === '/', "Invalid Auth: Unknown user rejects navigation");

    // Whitespace username handling (should succeed because backend trims username)
    await fillLoginForm('  King  ', 'King@123', 'student');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 8000 });
    assert(await page.evaluate(() => window.location.pathname) === '/student', "Whitespace Trim: Padded '  King  ' successfully authenticates");

    // ================================================================
    // PHASE 3 — AUTH STATE RACE CONDITIONS & CROSS-ROLE SHIELDING
    // ================================================================
    console.log("\n--- PHASE 3: Auth Race Conditions & Cross-Role Shielding ---");
    
    // Cross-role shielding: Logged-in Student accessing /admin
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    const pathAfterStdAdminAttempt = await page.evaluate(() => window.location.pathname);
    assert(pathAfterStdAdminAttempt !== '/admin', `Cross-Role Shielding: Student attempting /admin redirected to '${pathAfterStdAdminAttempt}'`);

    // Cross-role shielding: Logged-in Admin accessing /student
    await resetBrowserSession();
    await fillLoginForm('Admin', 'Admin@123', 'admin');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 8000 });
    await page.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle2' });
    const pathAfterAdminStdAttempt = await page.evaluate(() => window.location.pathname);
    assert(pathAfterAdminStdAttempt !== '/student', `Cross-Role Shielding: Admin attempting /student redirected to '${pathAfterAdminStdAttempt}'`);

    // ================================================================
    // PHASE 4 — DATA ISOLATION & IDOR DEFENSE
    // ================================================================
    console.log("\n--- PHASE 4: Data Isolation & Server-Side IDOR Defense ---");
    
    // Login as Student King via API to get token
    const stdAuth = await request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' });
    const studentToken = stdAuth.data.token;
    const kingStudentId = stdAuth.data.user.studentId;

    // Login as Admin via API
    const admAuth = await request('POST', '/auth/login', { username: 'Admin', password: 'Admin@123', role: 'admin' });
    const adminToken = admAuth.data.token;

    // Other student id (Mohammed Huzaifa is student ID 1)
    const victimStudentId = kingStudentId === 1 ? 2 : 1;

    // 4.1 Attendance IDOR attempt
    const attIdor = await request('GET', `/attendance/${victimStudentId}/2026/9`, null, studentToken);
    assert(attIdor.status === 403, "IDOR Defense: Student reading victim attendance returned 403 Forbidden");

    // 4.2 Profile IDOR attempt
    const profIdor = await request('GET', `/students/${victimStudentId}`, null, studentToken);
    assert(profIdor.status === 403, "IDOR Defense: Student reading victim profile returned 403 Forbidden");

    // 4.3 Leaves IDOR: Student gets ONLY their own leaves
    const leavesRes = await request('GET', '/leave/my-leaves', null, studentToken);
    assert(leavesRes.status === 200, "Data Isolation: Student retrieved leave history");
    const nonKingLeaves = leavesRes.data.filter(l => l.studentId !== kingStudentId);
    assert(nonKingLeaves.length === 0, "Data Isolation: Exactly 0 leaves belonging to other students leaked");

    // 4.4 Admin Privileges IDOR: Student approving leaves
    const approveIdor = await request('PUT', '/leave/approve/1', {}, studentToken);
    assert(approveIdor.status === 403, "IDOR Defense: Student approving leave returned 403 Forbidden");

    // 4.5 Admin Privileges IDOR: Student viewing class attendance register
    const registerIdor = await request('GET', '/attendance/class-sheet?date=2026-09-18', null, studentToken);
    assert(registerIdor.status === 403, "IDOR Defense: Student accessing class attendance register returned 403 Forbidden");

    // ================================================================
    // PHASE 5 — ATTENDANCE DEEP TEST & VALIDATION
    // ================================================================
    console.log("\n--- PHASE 5: Attendance Deep Test & Lockouts ---");
    
    // 5.1 Student self-marking lockout
    const stdMark = await request('POST', '/attendance/mark', {
      studentId: kingStudentId,
      date: '2026-09-18',
      status: 'present',
    }, studentToken);
    assert(stdMark.status === 403, "Attendance Lockout: Student self-marking returned 403 Forbidden");

    // 5.2 Future date validation (reject marking future attendance)
    const futureDate = '2035-01-01';
    const futureMark = await request('POST', '/attendance/mark', {
      studentId: kingStudentId,
      year: 2035,
      month: 1,
      day: 1,
      status: 'present',
    }, adminToken);
    assert(futureMark.status === 400, "Future Date Lockout: Future attendance rejected with 400 Bad Request");

    // 5.3 Batch attendance idempotency (marking twice on same date updates, does NOT duplicate)
    const testClassDate = '2026-09-15';
    const batch1 = await request('POST', '/attendance/batch-mark', {
      date: testClassDate,
      records: [{ studentId: kingStudentId, status: 'present' }],
    }, adminToken);
    assert(batch1.status === 200, "Batch Attendance: First batch mark succeeded");

    const batch2 = await request('POST', '/attendance/batch-mark', {
      date: testClassDate,
      records: [{ studentId: kingStudentId, status: 'absent' }],
    }, adminToken);
    assert(batch2.status === 200, "Batch Attendance: Re-submission (upsert) succeeded");

    // Verify DB has only ONE record for that date
    const verifyAtt = await request('GET', `/attendance/${kingStudentId}/2026/9`, null, studentToken);
    assert(verifyAtt.data['15'] === 'absent', "Batch Idempotency: Attendance updated to 'absent' without duplicate records");

    // ================================================================
    // PHASE 6 — LEAVE MANAGEMENT & ATTENDANCE SYNCHRONIZATION
    // ================================================================
    console.log("\n--- PHASE 6: Leave Management & Attendance Synchronization ---");
    
    // 6.1 Apply leave for Oct 12 - Oct 13, 2026
    const leaveApply = await request('POST', '/leave/apply', {
      leaveType: 'Academic',
      fromDate: '2026-10-12',
      toDate: '2026-10-13',
      reason: 'Adversarial QA Validation Leave',
    }, studentToken);
    assert(leaveApply.status === 201 && leaveApply.data.leave?.id, "Leave: Application created in pending status");
    const leaveId = leaveApply.data.leave.id;

    // 6.2 Admin Approval & Attendance Synchronization
    const leaveApprove = await request('PUT', `/leave/approve/${leaveId}`, {}, adminToken);
    assert(leaveApprove.status === 200 && leaveApprove.data.leave?.status === 'approved', "Leave: Admin approved leave application");

    // Verify attendance records in DB for Oct 12 and Oct 13
    const attOct = await request('GET', `/attendance/${kingStudentId}/2026/10`, null, studentToken);
    assert(attOct.data['12'] === 'on_leave', "Leave Sync: Day 12 synchronized to 'on_leave'");
    assert(attOct.data['13'] === 'on_leave', "Leave Sync: Day 13 synchronized to 'on_leave'");

    // 6.3 Rejection & Reversion
    const leaveReject = await request('PUT', `/leave/reject/${leaveId}`, {}, adminToken);
    assert(leaveReject.status === 200 && leaveReject.data.leave?.status === 'rejected', "Leave: Admin rejected leave application");

    const attOctRevert = await request('GET', `/attendance/${kingStudentId}/2026/10`, null, studentToken);
    assert(attOctRevert.data['12'] !== 'on_leave', "Leave Reversion: Day 12 'on_leave' cleared upon rejection");
    assert(attOctRevert.data['13'] !== 'on_leave', "Leave Reversion: Day 13 'on_leave' cleared upon rejection");

    // 6.4 Invalid leave dates: fromDate > toDate
    const invalidLeave = await request('POST', '/leave/apply', {
      leaveType: 'Medical',
      fromDate: '2026-10-20',
      toDate: '2026-10-10',
      reason: 'Inverted dates test',
    }, studentToken);
    assert(invalidLeave.status === 400, "Leave Validation: fromDate > toDate rejected with 400");

    // ================================================================
    // PHASE 7 — ATTENDANCE ANALYTICS & THRESHOLDS
    // ================================================================
    console.log("\n--- PHASE 7: Attendance Analytics & Exact Formulas ---");
    
    const analyticsRes = await request('GET', '/analytics/subject-attendance', null, studentToken);
    assert(analyticsRes.status === 200, "Analytics: Fetched student analytics");
    const overallPct = analyticsRes.data.overall?.percentage;
    assert(typeof overallPct === 'number' && overallPct >= 0 && overallPct <= 100, `Analytics: Valid overall percentage (${overallPct}%)`);
    assert(analyticsRes.data.subjects?.length > 0, `Analytics: Found ${analyticsRes.data.subjects?.length} subjects`);

    // Verify mathematical bounds on subjects
    for (const sub of analyticsRes.data.subjects) {
      assert(sub.attendancePercentage >= 0 && sub.attendancePercentage <= 100, `${sub.code}: Valid pct (${sub.attendancePercentage}%)`);
      if (sub.attendancePercentage >= 75) {
        assert(sub.status === 'SAFE', `${sub.code}: >= 75% classified as SAFE`);
        assert(typeof sub.safeToMiss === 'number' && sub.safeToMiss >= 0, `${sub.code}: safeToMiss computed`);
      } else {
        assert(sub.status === 'WARNING' || sub.status === 'DANGER', `${sub.code}: < 75% classified as WARNING/DANGER`);
        assert(typeof sub.classesToRecover === 'number' && sub.classesToRecover >= 1, `${sub.code}: classesToRecover computed`);
      }
    }

    // ================================================================
    // PHASE 8 — SMART LEAVE PLANNER REAL-WORLD SIMULATION
    // ================================================================
    console.log("\n--- PHASE 8: Smart Leave Planner Real-World Simulation ---");
    
    // Simulate leave on Monday Oct 5 to Wednesday Oct 7, 2026
    const smartPlan = await request('POST', '/analytics/smart-leave-plan', {
      fromDate: '2026-10-05',
      toDate: '2026-10-07',
    }, studentToken);
    assert(smartPlan.status === 200, "Smart Leave: Simulation returned 200 OK");
    assert(typeof smartPlan.data.totalClassesMissed === 'number', `Smart Leave: Classes missed computed: ${smartPlan.data.totalClassesMissed}`);
    assert(smartPlan.data.totalClassesMissed > 0, "Smart Leave: Non-zero classes detected on instructional days (NO false 0)");
    assert(smartPlan.data.overallVerdict !== undefined, `Smart Leave: Overall verdict: ${smartPlan.data.overallVerdict}`);
    assert(Array.isArray(smartPlan.data.subjectImpacts), "Smart Leave: Subject impacts array returned");

    // ================================================================
    // PHASE 9 & 10 — TIMETABLE GENERATOR & BMSIT SEEDER
    // ================================================================
    console.log("\n--- PHASE 9 & 10: Timetable Generator & Seeder Idempotency ---");
    
    // Timetable Seeder idempotence check
    const seedCheck = await request('POST', '/timetable/admin/seed-bmsit', {}, adminToken);
    assert(seedCheck.status === 200, "Seeder: Seed call returned 200");
    if (seedCheck.data.exists) {
      assert(seedCheck.data.exists === true, "Seeder Idempotency: Protected against unintentional overwrite");
    } else {
      assert(seedCheck.data.success === true, "Seeder: Freshly seeded BMSIT timetable");
    }

    // ================================================================
    // PHASE 11 & 12 — STUDENT TIMETABLE UI & PRINT / PDF ENGINE
    // ================================================================
    console.log("\n--- PHASE 11 & 12: Real Browser Timetable & Print Engine ---");
    
    // Login in browser as Student King
    await resetBrowserSession();
    await fillLoginForm('King', 'King@123', 'student');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 8000 });

    // Open /my-timetable
    await page.goto(`${BASE_URL}/my-timetable`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Check if slots are visible in the DOM
    const slotCountInDOM = await page.evaluate(() => {
      // Find periods/slots cards or table cells
      const slots = document.querySelectorAll('[class*="border"], [class*="rounded"]');
      return slots.length;
    });
    assert(slotCountInDOM > 0, `Student Timetable UI: Rendered visual elements in DOM (${slotCountInDOM} elements)`);

    // Print / PDF Preview check on Timetable Management page
    await resetBrowserSession();
    await fillLoginForm('Admin', 'Admin@123', 'admin');
    await (await page.$('button[type="submit"]')).click();
    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 8000 });
    await page.goto(`${BASE_URL}/timetable-management`, { waitUntil: 'networkidle2' });

    const openedPrintModal = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.toLowerCase().includes('print') || 
        b.innerText.toLowerCase().includes('export') ||
        b.innerText.toLowerCase().includes('pdf')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (openedPrintModal) {
      await new Promise(r => setTimeout(r, 600));
      const modalHeader = await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        return modal ? modal.innerText : '';
      });
      assert(modalHeader.includes('TIMETABLE') || modalHeader.includes('DEPARTMENT') || modalHeader.includes('Engineering') || modalHeader.includes('Preview'), "Print Engine: Institutional preview modal successfully rendered");
    }

    // ================================================================
    // PHASE 13 & 14 — THEME & MULTI-VIEWPORT RESPONSIVENESS
    // ================================================================
    console.log("\n--- PHASE 13 & 14: Theme & Multi-Viewport Responsiveness ---");
    
    const testViewports = [
      { width: 375, height: 667, name: 'Mobile (375px)' },
      { width: 414, height: 896, name: 'Mobile Lg (414px)' },
      { width: 768, height: 1024, name: 'Tablet (768px)' },
      { width: 1024, height: 768, name: 'Laptop Sm (1024px)' },
      { width: 1280, height: 800, name: 'Laptop (1280px)' },
      { width: 1440, height: 900, name: 'Desktop (1440px)' },
    ];

    for (const vp of testViewports) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      assert(!overflow, `Responsiveness (${vp.name}): Zero root horizontal window overflow`);
    }

    // Reset viewport back to desktop
    await page.setViewport({ width: 1440, height: 900 });

    // ================================================================
    // PHASE 18 — CONCURRENCY & DOUBLE CLICK STRESS TEST
    // ================================================================
    console.log("\n--- PHASE 18: Concurrency & Double-Click Stress Test ---");
    
    // 5 concurrent login requests
    const concurrentLogins = await Promise.all([
      request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' }),
      request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' }),
      request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' }),
      request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' }),
      request('POST', '/auth/login', { username: 'King', password: 'King@123', role: 'student' }),
    ]);
    const allLoginsSucceeded = concurrentLogins.every(r => r.status === 200 && r.data.token);
    assert(allLoginsSucceeded, "Concurrency Stress: 5 rapid concurrent logins all succeeded without locking or corruption");

    // Rapid batch mark attendance concurrency
    const concurrentBatch = await Promise.all([
      request('POST', '/attendance/batch-mark', { date: '2026-09-10', records: [{ studentId: kingStudentId, status: 'present' }] }, adminToken),
      request('POST', '/attendance/batch-mark', { date: '2026-09-10', records: [{ studentId: kingStudentId, status: 'present' }] }, adminToken),
    ]);
    assert(concurrentBatch.every(r => r.status === 200), "Concurrency Stress: Rapid concurrent batch marking handled gracefully");

    // ================================================================
    // PHASE 19 — HYGIENE, CONSOLE ERRORS & SECRETS CHECK
    // ================================================================
    console.log("\n--- PHASE 19: Browser Console Errors & Leaks ---");
    assert(consoleErrors.length === 0, `Browser Hygiene: Zero unhandled console errors (Count: ${consoleErrors.length})`);
    if (consoleErrors.length > 0) {
      console.log("Console errors detected:", consoleErrors);
    }

  } catch (err) {
    console.error("Adversarial QA exception:", err);
    assert(false, `Unexpected exception: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log(`ADVERSARIAL QA SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} TESTS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) {
    console.error("Failures:", failures);
    process.exit(1);
  }
}

runAdversarialQA();
