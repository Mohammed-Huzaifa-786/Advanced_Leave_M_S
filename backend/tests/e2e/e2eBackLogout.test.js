const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', msg => console.log('ClientLog:', msg.text()));

  await page.goto('http://localhost:5173/');
  await page.select('select', 'student');
  const u = await page.$('form input:not([type="password"])');
  await u.type('King');
  const p = await page.$('form input[type="password"]');
  await p.type('King@123');
  await (await page.$('button[type="submit"]')).click();
  await page.waitForFunction(() => window.location.pathname === '/student');
  console.log('1. Logged in at:', await page.evaluate(() => window.location.pathname));

  // Navigate to another route so there is history
  await page.goto('http://localhost:5173/leave-history', { waitUntil: 'networkidle2' });
  console.log('2. Navigated to:', await page.evaluate(() => window.location.pathname));

  // Click logout
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('logout'));
    if (btn) btn.click();
  });
  await page.waitForFunction(() => window.location.pathname === '/');
  console.log('3. Logged out at:', await page.evaluate(() => window.location.pathname));
  console.log('3b. Token after logout:', await page.evaluate(() => localStorage.getItem('token')));

  // Press browser back
  console.log('4. Calling page.goBack()...');
  await page.goBack();
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await page.waitForFunction(() => window.location.pathname === '/', { timeout: 5000 });
  console.log('5. Path after goBack redirect:', await page.evaluate(() => window.location.pathname));

  const text = await page.evaluate(() => document.body.innerText);
  console.log('6. Shows Sign In page:', text.includes('Sign in') || text.includes('Portal'));
  console.log('7. Shows leave history data:', text.includes('Leave Applications') || text.includes('Medical'));

  await browser.close();
})();
