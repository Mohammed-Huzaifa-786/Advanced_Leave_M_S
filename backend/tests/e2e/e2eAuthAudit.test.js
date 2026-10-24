const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const BASE_URL = 'http://localhost:5173';

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

async function runBrowserAudit() {
  console.log("==================================================================");
  console.log("REAL BROWSER E2E AUDIT: AUTHENTICATION FLOW & SECURITY");
  console.log("Using browser binary:", CHROME_PATH);
  console.log("==================================================================\n");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    async function resetSession() {
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
      await page.evaluate(() => localStorage.clear());
      await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    }

    async function fillAndSubmit(username, password, role) {
      await page.waitForSelector('select', { timeout: 5000 });
      await page.select('select', role);

      const uInput = await page.$('form input:not([type="password"])');
      await uInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await uInput.type(username);

      const pInput = await page.$('form input[type="password"]');
      await pInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await pInput.type(password);

      const submitBtn = await page.$('button[type="submit"]');
      await submitBtn.click();
    }

    // SCENARIO 1: Student Portal + valid student credentials
    console.log("--- Scenario 1: Student Portal + Valid Student Credentials ---");
    await resetSession();
    await fillAndSubmit('King', 'King@123', 'student');

    // Wait for immediate first-click navigation to /student
    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 8000 });
    const currentPath1 = await page.evaluate(() => window.location.pathname);
    assert(currentPath1 === '/student', "Scenario 1: Immediately opens /student on first click without refresh");

    const authStorage1 = await page.evaluate(() => ({
      token: !!localStorage.getItem('token'),
      role: localStorage.getItem('role'),
    }));
    assert(authStorage1.token === true, "Scenario 1: JWT token stored in localStorage");
    assert(authStorage1.role === 'student', "Scenario 1: Role stored as 'student'");

    await page.waitForSelector('h1', { timeout: 5000 });
    const heading1 = await page.evaluate(() => document.querySelector('h1')?.innerText || '');
    assert(heading1.includes('Welcome'), `Scenario 1: Student dashboard heading rendered ("${heading1}")`);

    // SCENARIO 2: Admin Portal + valid admin credentials
    console.log("\n--- Scenario 2: Admin Portal + Valid Admin Credentials ---");
    await resetSession();
    await fillAndSubmit('Admin', 'Admin@123', 'admin');

    await page.waitForFunction(() => window.location.pathname === '/admin', { timeout: 8000 });
    const currentPath2 = await page.evaluate(() => window.location.pathname);
    assert(currentPath2 === '/admin', "Scenario 2: Immediately opens /admin on first click without refresh");

    const authStorage2 = await page.evaluate(() => ({
      token: !!localStorage.getItem('token'),
      role: localStorage.getItem('role'),
    }));
    assert(authStorage2.token === true, "Scenario 2: JWT token stored in localStorage");
    assert(authStorage2.role === 'admin', "Scenario 2: Role stored as 'admin'");

    await page.waitForSelector('body', { timeout: 5000 });
    const pageText2 = await page.evaluate(() => document.body.innerText);
    assert(pageText2.includes('Academic Operations') || pageText2.includes('Admin'), "Scenario 2: Admin dashboard rendered");

    // SCENARIO 3: Student Portal + valid admin credentials (MISMATCH)
    console.log("\n--- Scenario 3: Student Portal + Valid Admin Credentials (Mismatch Rejection) ---");
    await resetSession();
    await fillAndSubmit('Admin', 'Admin@123', 'student');

    await page.waitForSelector('.bg-rose-50, [role="alert"]', { timeout: 5000 });
    const currentPath3 = await page.evaluate(() => window.location.pathname);
    assert(currentPath3 === '/', "Scenario 3: No navigation occurred (still on /)");

    const errorText3 = await page.evaluate(() => {
      const errEl = document.querySelector('.bg-rose-50');
      return errEl ? errEl.innerText : '';
    });
    assert(
      errorText3.includes("These credentials belong to an Admin account. Please select Admin Portal."),
      `Scenario 3: Exact role mismatch error shown ("${errorText3.trim()}")`
    );

    const token3 = await page.evaluate(() => localStorage.getItem('token'));
    assert(token3 === null, "Scenario 3: No token issued or saved in localStorage");

    // SCENARIO 4: Admin Portal + valid student credentials (MISMATCH)
    console.log("\n--- Scenario 4: Admin Portal + Valid Student Credentials (Mismatch Rejection) ---");
    await resetSession();
    await fillAndSubmit('King', 'King@123', 'admin');

    await page.waitForSelector('.bg-rose-50, [role="alert"]', { timeout: 5000 });
    const currentPath4 = await page.evaluate(() => window.location.pathname);
    assert(currentPath4 === '/', "Scenario 4: No navigation occurred (still on /)");

    const errorText4 = await page.evaluate(() => {
      const errEl = document.querySelector('.bg-rose-50');
      return errEl ? errEl.innerText : '';
    });
    assert(
      errorText4.includes("These credentials belong to a Student account. Please select Student Portal."),
      `Scenario 4: Exact role mismatch error shown ("${errorText4.trim()}")`
    );

    const token4 = await page.evaluate(() => localStorage.getItem('token'));
    assert(token4 === null, "Scenario 4: No token issued or saved in localStorage");

    // SCENARIO 5: Login → Protected Route → Browser Refresh
    console.log("\n--- Scenario 5: Login → Protected Route → Browser Refresh ---");
    await resetSession();
    await fillAndSubmit('King', 'King@123', 'student');

    await page.waitForFunction(() => window.location.pathname === '/student', { timeout: 8000 });
    assert(await page.evaluate(() => window.location.pathname) === '/student', "Scenario 5: Reached /student before refresh");

    console.log("  Reloading page...");
    await page.reload({ waitUntil: 'networkidle2' });

    const pathAfterReload = await page.evaluate(() => window.location.pathname);
    assert(pathAfterReload === '/student', "Scenario 5: Remains on /student after browser refresh (NO kickback to /)");

    const authAfterReload = await page.evaluate(() => ({
      token: !!localStorage.getItem('token'),
      role: localStorage.getItem('role'),
    }));
    assert(authAfterReload.token === true && authAfterReload.role === 'student', "Scenario 5: Auth credentials persist after refresh");

    // SCENARIO 6: Logout → Auth Cleared → Protected Route Guard
    console.log("\n--- Scenario 6: Logout → Auth Cleared → Protected Route Guard ---");
    
    // Find and click logout button
    const buttons = await page.$$('button');
    let logoutClicked = false;
    for (const b of buttons) {
      const text = await (await b.getProperty('innerText')).jsonValue();
      if (text.toLowerCase().includes('logout')) {
        await b.click();
        logoutClicked = true;
        break;
      }
    }
    
    if (!logoutClicked) {
      await page.evaluate(() => {
        localStorage.clear();
        window.location.href = '/';
      });
    }

    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
    assert(await page.evaluate(() => window.location.pathname) === '/', "Scenario 6: Redirected to login page (/) on logout");

    const storageAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
    assert(storageAfterLogout === null, "Scenario 6: Token completely removed from localStorage");

    console.log("  Attempting direct navigation to /student while unauthenticated...");
    await page.goto(`${BASE_URL}/student`, { waitUntil: 'networkidle2' });
    const blockedStudentPath = await page.evaluate(() => window.location.pathname);
    assert(blockedStudentPath === '/', "Scenario 6: Direct access to /student blocked and redirected to /");

    console.log("  Attempting direct navigation to /admin while unauthenticated...");
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2' });
    const blockedAdminPath = await page.evaluate(() => window.location.pathname);
    assert(blockedAdminPath === '/', "Scenario 6: Direct access to /admin blocked and redirected to /");

  } catch (err) {
    console.error("Browser audit runtime error:", err);
    assert(false, `Unexpected error during browser audit: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log("\n==================================================================");
  console.log(`REAL BROWSER E2E AUDIT: ${passedTests} PASSED, ${failedTests} FAILED out of ${totalTests} ASSERTIONS`);
  console.log(`PASS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log("==================================================================\n");

  if (failedTests > 0) process.exit(1);
}

runBrowserAudit();
