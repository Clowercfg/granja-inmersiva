import { chromium } from "C:\\Users\\Achito\\AppData\\Local\\npm-cache\\_npx\\e41f203b7505f1fb\\node_modules\\playwright-core\\index.mjs";

const URL = "http://localhost:5174/?engine=canvas2d&stress=true";

(async () => {
  console.log("[runner] Launching browser...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 520, height: 900 } });

  const logs = [];
  page.on("console", (msg) => {
    const text = msg.text();
    logs.push(text);
    process.stdout.write(text + "\n");
  });

  console.log("[runner] Navigating to stress test page...");
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 15000 });

  // Wait for tests to complete (up to 120s)
  console.log("[runner] Waiting for stress tests to complete (max 120s)...");
  const start = Date.now();
  let done = false;
  while (Date.now() - start < 120000) {
    await page.waitForTimeout(2000);
    const found = logs.some((l) => l.includes("Stress tests complete"));
    if (found) {
      done = true;
      break;
    }
  }

  if (!done) {
    console.log("[runner] WARNING: Tests did not complete in time, extracting partial results");
  }

  await page.waitForTimeout(1000);
  await browser.close();

  // Extract the table from console logs
  const tableStart = logs.findIndex((l) => l.includes("Test"));
  const tableLines = logs.filter(
    (l) =>
      l.includes("Normal") ||
      l.includes("200 plots") ||
      l.includes("100 animals") ||
      l.includes("500 veg") ||
      l.includes("Heavy") ||
      l.includes("Ent") ||
      l.includes("---")
  );

  console.log("\n[runner] === STRESS TEST RESULTS ===\n");
  for (const line of logs) {
    if (
      line.includes("Stress") ||
      line.includes("avg") ||
      line.includes("fps") ||
      line.includes("frame") ||
      line.includes("canvas") ||
      line.includes("Canvas") ||
      line.includes("Test") ||
      line.includes("Normal") ||
      line.includes("200 plots") ||
      line.includes("100 animals") ||
      line.includes("500 veg") ||
      line.includes("Heavy") ||
      line.includes("Ent") ||
      line.includes("analysis") ||
      line.includes("Analysis") ||
      line.includes("comfortably") ||
      line.includes("marginal") ||
      line.includes("struggles") ||
      line.includes("Peak")
    ) {
      console.log(line);
    }
  }

  console.log("\n[runner] Done.");
})();
