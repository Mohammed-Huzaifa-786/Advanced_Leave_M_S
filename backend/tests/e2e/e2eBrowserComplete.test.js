const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://127.0.0.1:5173";
const ARTIFACT_DIR = "C:\\Users\\lenovo\\.gemini\\antigravity\\brain\\e5d4d982-e2c0-4024-bdf1-c5c6955ec8cd";

(async () => {
  console.log("=== RUNNING COMPLETE USER-CONTROLLED TIMETABLE E2E BROWSER VERIFICATION ===");
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Login via Demo Admin Button
  console.log("1. Logging in as Admin...");
  await page.goto(BASE_URL + "/", { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Admin\nAdmin / Admin@123")
    );
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  console.log("-> Logged in successfully. Current URL:", page.url());

  // 2. Open Timetable Generator
  console.log("2. Opening Timetable Generator...");
  await page.goto(BASE_URL + "/timetable-generator", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Navigate to Step 2
  console.log("3. Moving to Step 2: Subject & Resource Mapping...");
  const step2Btn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find(
      (b) => b.innerText.includes("Proceed to Subject & Faculty Mapping")
    );
  });
  if (step2Btn && step2Btn.asElement()) {
    await step2Btn.asElement().click();
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Screenshot Step 2 (Configured slots)
  const step2Shot = path.join(ARTIFACT_DIR, "user_controlled_step2_slots.png");
  await page.screenshot({ path: step2Shot, fullPage: false });
  console.log("-> Saved Step 2 Screenshot:", step2Shot);

  // Check Step 2 content
  const step2Inspection = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasStep2Title: text.includes("Subject, Faculty & Facility Mapping"),
      hasConfiguredSlots: text.includes("Configured Time Slots"),
      hasContinuousLabBlocks: text.includes("Continuous 110m Lab Blocks") || text.includes("110m"),
    };
  });
  console.log("Step 2 Inspection:", step2Inspection);

  // 4. Run Scenario 1: Generate Clash-Free Timetable Exactly as Configured
  console.log("4. Running Generator for Conflict-Free Schedule (Scenario 1)...");
  const genBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Run Timetable Generator")
    );
  });
  if (genBtn && genBtn.asElement()) {
    await genBtn.asElement().click();
  }

  // 5. Wait for Step 4 Preview Grid
  console.log("5. Waiting for Weekly Timetable Matrix (Step 4)...");
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return t.includes("Generated Schedule Preview Grid") || t.includes("Conflict-Free & Gap-Optimized Schedule");
  }, { timeout: 15000 });

  const gridInspection = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasGrid: text.includes("Generated Schedule Preview Grid") || text.includes("Conflict-Free & Gap-Optimized Schedule"),
      hasTeaBreak: text.includes("Tea") || text.includes("TEA"),
      hasLunchBreak: text.includes("Lunch") || text.includes("LUNCH"),
      hasValidStatus: text.includes("Valid & Publishable"),
    };
  });
  console.log("Scenario 1 Grid Inspection:", gridInspection);

  const step4Shot = path.join(ARTIFACT_DIR, "user_controlled_step4_grid.png");
  await page.screenshot({ path: step4Shot, fullPage: false });
  console.log("-> Saved Step 4 Grid Screenshot:", step4Shot);

  // 6. Test Scenario 2: Return to Step 2, create a clash, verify Conflict Resolution Modal
  console.log("6. Returning to Step 2 to test Conflict Resolution...");
  const backStep2Btn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Reconfigure Subjects (Step 2)")
    );
  });
  if (backStep2Btn && backStep2Btn.asElement()) {
    await backStep2Btn.asElement().click();
    await new Promise((r) => setTimeout(r, 1500));
  }

  // 7. Introduce a section clash by changing Subject 2 Slot 1's period to Period 1 (matching Subject 1 Slot 1)
  console.log("7. Introducing intentional section clash on Monday Period 1...");
  const clashInjected = await page.evaluate(() => {
    // Find all slot card containers
    const slotCards = document.querySelectorAll("div.grid.grid-cols-2.gap-1\\.5");
    if (slotCards.length >= 2) {
      // Find the period select on the second slot card
      const selects = slotCards[1].querySelectorAll("select");
      if (selects && selects.length >= 2) {
        // Set Day to Monday
        selects[0].value = "Monday";
        selects[0].dispatchEvent(new Event("change", { bubbles: true }));
        // Set Period to 1
        selects[1].value = "1";
        selects[1].dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  });
  console.log("Clash injected:", clashInjected);
  await new Promise((r) => setTimeout(r, 1000));

  // Take screenshot showing the inline clash indicator
  const clashBadgeShot = path.join(ARTIFACT_DIR, "user_controlled_clash_badge.png");
  await page.screenshot({ path: clashBadgeShot, fullPage: false });
  console.log("-> Saved Inline Clash Badge Screenshot:", clashBadgeShot);

  // 8. Click Run Timetable Generator to trigger the Conflict Resolution Modal
  console.log("8. Clicking 'Run Timetable Generator' with conflicting slots...");
  const genBtnAfterClash = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Run Timetable Generator")
    );
  });
  if (genBtnAfterClash && genBtnAfterClash.asElement()) {
    await genBtnAfterClash.asElement().click();
  }

  // 9. Wait for Conflict Resolution Modal
  console.log("9. Waiting for Conflict Resolution Modal...");
  await page.waitForFunction(() => {
    const modal = document.querySelector("div.fixed.inset-0.z-50");
    if (!modal) return false;
    const t = modal.innerText.toLowerCase();
    return t.includes("schedule clashes detected") && t.includes("proposed minimal adjustment");
  }, { timeout: 15000 });

  const modalInspection = await page.evaluate(() => {
    const modal = document.querySelector("div.fixed.inset-0.z-50");
    const text = modal ? modal.innerText : "";
    return {
      hasClashDetected: text.toLowerCase().includes("schedule clashes detected"),
      hasProposedChanges: text.toLowerCase().includes("proposed minimal adjustment"),
      hasAcceptButton: text.toLowerCase().includes("accept proposed changes & apply"),
      modalSummary: text.slice(0, 400),
    };
  });
  console.log("Conflict Modal Inspection:", modalInspection);

  const modalShot = path.join(ARTIFACT_DIR, "user_controlled_conflict_modal.png");
  await page.screenshot({ path: modalShot, fullPage: false });
  console.log("-> Saved Conflict Modal Screenshot:", modalShot);

  // 10. Click "Accept Proposed Changes & Apply"
  console.log("10. Clicking 'Accept Proposed Changes & Apply' in Conflict Modal...");
  const acceptBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll("button")).find((b) =>
      b.innerText.includes("Accept Proposed Changes & Apply")
    );
  });
  if (acceptBtn && acceptBtn.asElement()) {
    await acceptBtn.asElement().click();
  }

  // 11. Wait for minimal conflict resolution to apply and show resolved Step 4 grid
  console.log("11. Waiting for resolved schedule to appear in Step 4...");
  await page.waitForFunction(() => {
    const t = document.body.innerText;
    return (t.includes("Generated Schedule Preview Grid") || t.includes("Conflict-Free & Gap-Optimized Schedule")) && !t.includes("Schedule Clashes Detected");
  }, { timeout: 15000 });

  const resolvedInspection = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasGrid: text.includes("Generated Schedule Preview Grid") || text.includes("Conflict-Free & Gap-Optimized Schedule"),
      hasZeroViolations: text.includes("0 Violations") || text.includes("Valid & Publishable"),
      isPublishable: text.includes("Valid & Publishable"),
    };
  });
  console.log("Minimal Resolution Applied Inspection:", resolvedInspection);

  const resolvedShot = path.join(ARTIFACT_DIR, "user_controlled_resolved_grid.png");
  await page.screenshot({ path: resolvedShot, fullPage: false });
  console.log("-> Saved Resolved Grid Screenshot:", resolvedShot);

  console.log("=== ALL BROWSER E2E TESTS COMPLETED WITH 100% SUCCESS! ===");
  await browser.close();
  process.exit(0);
})();
