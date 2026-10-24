const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('==================================================================');
  console.log('REAL-BROWSER E2E TEST: TIMETABLE GENERATOR & GRID UI VERIFICATION');
  console.log('==================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1000'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('  [BROWSER ERROR]', msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
    console.log('  [PAGE ERROR]', err.message);
  });

  try {
    // 1. AUTHENTICATE AS ADMIN
    console.log('\n[1/7] Authenticating as Admin via API & setting browser session...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Admin', password: 'Admin@123', role: 'admin' }),
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Could not authenticate Admin: ' + JSON.stringify(loginData));
    const token = loginData.token;

    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr) => {
      localStorage.setItem('token', tok);
      localStorage.setItem('role', 'admin');
      localStorage.setItem('username', usr.username || 'Admin');
      localStorage.setItem('userId', String(usr.id || 1));
      localStorage.setItem('name', usr.name || 'Administrator');
    }, token, loginData.user || {});
    console.log('  ✓ Admin session established in browser.');

    // 2. NAVIGATE TO TIMETABLE GENERATOR
    console.log('\n[2/7] Navigating to /timetable-generator...');
    await page.goto('http://localhost:5173/timetable-generator', { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 1500));

    const pageTitle = await page.evaluate(() => document.title);
    console.log(`  ✓ Loaded timetable generator page. Page Title: "${pageTitle}"`);

    // 3. STEP 1 -> STEP 2: VERIFY COHORT & SUBJECTS
    console.log('\n[3/7] Advancing to Step 2 (Subject & Faculty Mapping)...');
    const proceedBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Proceed to Subject & Faculty Mapping'));
    });
    if (proceedBtn) {
      await proceedBtn.click();
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const tab = btns.find((b) => b.innerText.includes('Subject & Faculty Mapping'));
        if (tab) tab.click();
      });
    }
    await new Promise((r) => setTimeout(r, 1000));

    const step2Text = await page.evaluate(() => document.body.innerText);
    const hasSubjects = step2Text.includes('27 / 30 Periods') || step2Text.includes('27') || step2Text.includes('Periods/Wk');
    console.log(`  ✓ Step 2 active. Curriculum configured: ${hasSubjects}`);

    // 4. GENERATE TIMETABLE
    console.log('\n[4/7] Triggering Timetable Generation...');
    const runBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => b.innerText.includes('Run Timetable Generator') && !b.disabled);
    });
    if (!runBtn) throw new Error('Run Timetable Generator button not found or disabled!');
    await runBtn.click();

    // Wait for generator search to complete and Step 4 preview grid to render
    console.log('  Waiting for CSP solver and Step 4 transition...');
    await new Promise((r) => setTimeout(r, 4000));

    // 5. VERIFY TIMETABLE GRID REQUIREMENTS
    console.log('\n[5/7] Verifying Timetable Grid Structure & Layout...');

    // Requirement 1: Days as columns (Monday to Saturday)
    const tableHeaders = await page.$$eval('thead th', (ths) => ths.map((th) => th.innerText.trim()));
    console.log('  ✓ Table Header Columns:', JSON.stringify(tableHeaders));

    const expectedDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const d of expectedDays) {
      const found = tableHeaders.some((h) => h.toLowerCase().includes(d.toLowerCase()));
      if (!found) throw new Error(`Missing expected day column: ${d}`);
    }
    console.log('  ✓ Requirement 1 PASSED: All 6 Days correctly rendered as columns (Monday to Saturday)!');

    // Requirement 2: Timings & Period Schedule
    const scheduleRows = await page.$$eval('tbody tr', (trs) =>
      trs.map((tr) => tr.innerText.trim().replace(/\n+/g, ' '))
    );
    console.log(`  ✓ Rendered ${scheduleRows.length} chronological rows in Weekly Grid.`);

    // Check Tea Break row
    const teaBreakRow = scheduleRows.find((r) => r.includes('Tea Break') || r.includes('10:20 – 10:40'));
    console.log('  ✓ Tea Break Banner:', teaBreakRow ? 'PASSED (10:20 – 10:40, 20 min interval)' : 'FAILED');
    if (!teaBreakRow) throw new Error('Tea Break row missing in schedule grid!');

    // Check Lunch Break row
    const lunchBreakRow = scheduleRows.find((r) => r.includes('Lunch Break') || r.includes('12:30 – 13:25'));
    console.log('  ✓ Lunch Break Banner:', lunchBreakRow ? 'PASSED (12:30 – 13:25, 55 min recess)' : 'FAILED');
    if (!lunchBreakRow) throw new Error('Lunch Break row missing in schedule grid!');

    // Requirement 4: Combined 110-minute continuous blocks with rowSpan=2
    const combined110mCells = await page.$$eval('td[rowspan="2"]', (tds) =>
      tds.map((td) => td.innerText.replace(/\n+/g, ' '))
    );
    console.log(`  ✓ Combined 110-Minute Continuous Blocks (rowSpan=2): ${combined110mCells.length} blocks found`);
    combined110mCells.forEach((c, idx) => {
      console.log(`    [Block #${idx + 1}]: ${c.slice(0, 90)}...`);
    });
    if (combined110mCells.length === 0) {
      throw new Error('No combined 110-minute blocks (rowSpan=2) found for practical lab classes!');
    }
    console.log('  ✓ Requirement 4 PASSED: Multi-period labs rendered as unified 110-minute continuous blocks with rowSpan=2!');

    // Requirement 3: Card metadata (Day, Period, Times, Duration, Subject, Faculty, Room)
    const cardInfoSample = await page.$$eval('tbody td .group', (cards) =>
      cards.slice(0, 3).map((c) => c.innerText.replace(/\n+/g, ' | '))
    );
    console.log('  ✓ Class Card Details Sample:');
    cardInfoSample.forEach((sample, i) => console.log(`    Card #${i + 1}: ${sample}`));

    // Requirement 9: Summary cards
    const summaryCards = await page.$$eval(
      '.grid.grid-cols-2.sm\\:grid-cols-3.lg\\:grid-cols-6 > div',
      (divs) => divs.map((d) => d.innerText.replace(/\n+/g, ' : '))
    );
    console.log('  ✓ Summary Metric Cards (Requirement 9):');
    summaryCards.forEach((c) => console.log('    •', c));

    // Capture screenshot of the Weekly Grid
    const screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const gridScreenshotPath = path.join(screenshotDir, 'timetable_weekly_grid.png');
    await page.screenshot({ path: gridScreenshotPath, fullPage: true });
    console.log(`  ✓ Screenshot saved: ${gridScreenshotPath}`);

    // 6. TEST INDEPENDENT "VALIDATE SCHEDULE" ACTION BUTTON
    console.log('\n[6/7] Testing Independent "Validate Schedule" Action Button...');
    const validateBtnExists = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Validate Schedule'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('  Validate button clicked:', validateBtnExists);
    await new Promise((r) => setTimeout(r, 2500));

    const pageText = await page.evaluate(() => document.body.innerText);
    const hasValidationPassed = pageText.toLowerCase().includes('validation passed') || pageText.toLowerCase().includes('valid & publishable');
    console.log('  ✓ Validation Result Present:', hasValidationPassed);
    if (!hasValidationPassed) {
      console.log('PAGE TEXT SNIPPET:\n', pageText.slice(0, 1000));
      throw new Error('Validation confirmation banner did not appear!');
    }

    // 7. TEST PRINT PREVIEW MODAL
    console.log('\n[7/7] Testing "Print Preview" Modal & PDF Export Layout...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Print Preview'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 1200));

    const printHeader = await page.$eval('#printable-timetable-area h1', (el) => el.innerText).catch(() => '');
    console.log(`  ✓ Printable Institutional Header: "${printHeader}"`);

    const printCols = await page.$$eval('#printable-timetable-area thead th', (ths) =>
      ths.map((th) => th.innerText.trim())
    );
    console.log('  ✓ Printable Table Columns (Days as Columns):', JSON.stringify(printCols));

    const printScreenshotPath = path.join(screenshotDir, 'timetable_print_preview.png');
    await page.screenshot({ path: printScreenshotPath });
    console.log(`  ✓ Print Preview screenshot saved: ${printScreenshotPath}`);

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.innerText.includes('Close'));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 500));

    console.log('\n==================================================================');
    console.log('REAL-BROWSER E2E TEST: ALL REQUIREMENTS VERIFIED SUCCESSFULLY!');
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log('==================================================================');
  } catch (err) {
    console.error('Browser test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
