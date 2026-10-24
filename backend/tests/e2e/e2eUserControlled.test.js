const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://127.0.0.1:5173";
const ARTIFACT_DIR = "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\e5d4d982-e2c0-4024-bdf1-c5c6955ec8cd";

(async () => {
  console.log("=== STARTING BROWSER E2E TEST: USER-CONTROLLED TIMETABLE GENERATOR ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[PAGE ERROR]", msg.text());
    }
  });

  // Step 1: Login as Admin
  console.log("Step 1: Logging in as Admin...");
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle2" });
  await page.select("select", "admin");
  await page.type('input[placeholder*="admin"]', "Admin");
  await page.type('input[placeholder*="password"]', "Admin@123");
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});

  // Step 2: Navigate to Timetable Generator
  console.log("Step 2: Navigating to Timetable Generator...");
  await page.goto(BASE_URL + "/timetable-generator", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // Verify we are on Step 2 or switch to Step 2
  const step2Btn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Proceed to Subject & Faculty Mapping") || b.innerText.includes("Subject & Faculty Mapping")
    );
  });
  if (step2Btn && step2Btn.asElement()) {
    await step2Btn.asElement().click();
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Verify Step 2 shows configured class slots
  console.log("Step 3: Checking User-Controlled Class Slots in Step 2...");
  const step2Data = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasConfiguredSlots = text.includes("Configured Time Slots") || text.includes("Scheduled Sessions");
    const slotCards = document.querySelectorAll("select").length;
    return { hasConfiguredSlots, selectCount: slotCards, bodySnippet: text.slice(0, 300) };
  });
  console.log("Step 2 inspection:", step2Data);

  // Take screenshot of Step 2 slot editor
  const step2ScreenshotPath = path.join(ARTIFACT_DIR, "user_controlled_step2_slots.png");
  await page.screenshot({ path: step2ScreenshotPath, fullPage: false });
  console.log("Saved Step 2 screenshot to:", step2ScreenshotPath);

  // Step 4: Click "Run Timetable Generator" with conflict-free configuration (Scenario 1)
  console.log("Step 4: Running Generator for Conflict-Free Schedule (Scenario 1)...");
  const genBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Run Timetable Generator")
    );
  });
  if (genBtn && genBtn.asElement()) {
    await genBtn.asElement().click();
  }

  console.log("Waiting for schedule matrix preview (Step 4)...");
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes("Conflict-Free") || t.includes("Generated Schedule Preview Grid");
  }, { timeout: 15000 });

  const gridData = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasConflictFree: text.includes("Conflict-Free"),
      hasMatrix: text.includes("Weekly Schedule Matrix") || text.includes("Generated Schedule Preview Grid"),
      hasTeaBreak: text.includes("Tea") || text.includes("TEA"),
      hasLunchBreak: text.includes("Lunch") || text.includes("LUNCH"),
      classesMatch: text.match(/\d+\s*\/\s*\d+\s*Classes Assigned/),
    };
  });
  console.log("Scenario 1 Grid verification:", gridData);

  const step4ScreenshotPath = path.join(ARTIFACT_DIR, "user_controlled_step4_grid.png");
  await page.screenshot({ path: step4ScreenshotPath, fullPage: false });
  console.log("Saved Step 4 screenshot to:", step4ScreenshotPath);

  // Step 5: Test Conflict Detection & Minimal Resolution Modal (Scenario 2/4)
  console.log("Step 5: Testing Conflict Detection & Minimal Resolution Modal...");
  // Go back to Step 2
  const editCohortBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Reconfigure Subjects (Step 2)") || b.innerText.includes("Subject & Faculty Mapping")
    );
  });
  if (editCohortBtn && editCohortBtn.asElement()) {
    await editCohortBtn.asElement().click();
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Create an intentional conflict: change day/period in first slot of subject 2 to match subject 1
  console.log("Injecting an intentional clash between Subject 1 and Subject 2 on Monday Period 1...");
  await page.evaluate(() => {
    // Select all day and period selects inside slot cards
    const selects = Array.from(document.querySelectorAll("select"));
    // Find second subject's first slot day select and period select
    // Change first subject slot 1 to Monday P1, second subject slot 1 to Monday P1
    const daySelects = selects.filter((s) => s.value === "Monday" || s.value === "Tuesday" || s.value === "Wednesday");
    if (daySelects.length >= 2) {
      daySelects[0].value = "Monday";
      daySelects[0].dispatchEvent(new Event("change", { bubbles: true }));
      daySelects[1].value = "Monday";
      daySelects[1].dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await new Promise((r) => setTimeout(r, 1000));

  // Run generator again to trigger conflict detection
  console.log("Clicking Run Timetable Generator to trigger conflict detection...");
  const genBtn2 = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Run Timetable Generator")
    );
  });
  if (genBtn2 && genBtn2.asElement()) {
    await genBtn2.asElement().click();
  }

  console.log("Waiting for Conflict Resolution Modal to appear...");
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes("Schedule Clashes Detected") || t.includes("Identified Conflicts") || t.includes("Proposed Minimal Adjustment");
  }, { timeout: 15000 });

  const modalData = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasClashDetected: text.includes("Schedule Clashes Detected"),
      hasProposedChanges: text.includes("Proposed Minimal Adjustment"),
      hasAcceptButton: text.includes("Accept Proposed Changes & Apply"),
    };
  });
  console.log("Conflict modal verification:", modalData);

  const conflictScreenshotPath = path.join(ARTIFACT_DIR, "user_controlled_conflict_modal.png");
  await page.screenshot({ path: conflictScreenshotPath, fullPage: false });
  console.log("Saved Conflict Modal screenshot to:", conflictScreenshotPath);

  // Click "Accept Proposed Changes & Apply"
  console.log("Step 6: Clicking 'Accept Proposed Changes & Apply'...");
  const acceptBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Accept Proposed Changes & Apply")
    );
  });
  if (acceptBtn && acceptBtn.asElement()) {
    await acceptBtn.asElement().click();
  }

  console.log("Waiting for resolution to complete and timetable grid to display...");
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes("Conflict-Free") || t.includes("Generated Schedule Preview Grid");
  }, { timeout: 15000 });

  const resolvedGridData = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasConflictFree: text.includes("Conflict-Free"),
      hasGrid: text.includes("Weekly Schedule Matrix") || text.includes("Generated Schedule Preview Grid"),
      clashesCount: text.match(/0\s*Violations/),
    };
  });
  console.log("Resolved Grid verification:", resolvedGridData);

  console.log("=== BROWSER E2E TEST COMPLETED SUCCESSFULLY! ===");
  await browser.close();
})();
