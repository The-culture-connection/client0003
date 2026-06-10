/**
 * Drive the running Digital Curriculum app with headless Chrome: log in with the
 * test admin account and screenshot one or more routes, so lessons/pages can be
 * previewed exactly as the app renders them.
 *
 * Reads APP_URL / APP_TEST_EMAIL / APP_TEST_PASSWORD from .env.
 *
 * Usage:
 *   node preview-app.js /courses/<courseId>
 *   node preview-app.js /learn/lesson/<lessonId>?curriculumId=..&moduleId=..&chapterId=..
 *   (pass multiple routes to capture several in one login)
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { loadDotEnv } = require("./thinkific-client");

loadDotEnv();
const BASE = process.env.APP_URL || "http://localhost:5173";
const EMAIL = process.env.APP_TEST_EMAIL;
const PASS = process.env.APP_TEST_PASSWORD;
const CHROME =
  process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.join(__dirname, "preview");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle2", timeout: 45000 });
  await page.waitForSelector('input[type="email"], input[type="password"]', { timeout: 15000 });
  const emailSel = (await page.$('input[type="email"]')) ? 'input[type="email"]' : "input";
  await page.type(emailSel, EMAIL, { delay: 10 });
  await page.type('input[type="password"]', PASS, { delay: 10 });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /sign in/i.test(x.textContent));
    if (b) b.click();
  });
  // Wait until we navigate away from /login (auth succeeded).
  await page
    .waitForFunction(() => !location.pathname.includes("/login"), { timeout: 20000 })
    .catch(() => {});
  await sleep(1500);
  // Staff accounts are bounced from learner routes to /admin while in "admin"
  // view mode. Switch to "student" so we can preview lessons as a learner.
  await page.evaluate(() => localStorage.setItem("mortar_admin_view_mode", "student"));
}

async function capture(page, route) {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);
  await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 45000 });
  await sleep(2000);
  const tag = route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "_").slice(0, 60) || "root";
  const file = path.join(OUT, `app_${tag}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`  ${route}\n    → ${await page.title()} | ${page.url()}\n    → ${file}`);
}

/** Step through a lesson: click Next, auto-fill+submit any survey, screenshot each. */
async function stepThrough(page, steps) {
  for (let i = 0; i < steps; i++) {
    await sleep(1200);
    const file = path.join(OUT, `step_${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file, fullPage: true });
    // If a survey is showing, fill textareas and submit; else click Next.
    const onSurvey = await page.evaluate(() => {
      const tas = [...document.querySelectorAll("textarea")];
      tas.forEach((t) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setter.call(t, "Test answer for migration preview.");
        t.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const btn = [...document.querySelectorAll("button")].find((b) => /submit/i.test(b.textContent));
      if (tas.length && btn) { btn.click(); return true; }
      return false;
    });
    if (!onSurvey) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("button")].find((x) => /next|start quiz|start survey|survey:/i.test(x.textContent));
        if (b) b.click();
      });
    }
    console.log(`  step ${i}: ${onSurvey ? "survey submitted" : "next"} → ${file}`);
  }
}

(async () => {
  if (!EMAIL || !PASS) throw new Error("Set APP_TEST_EMAIL / APP_TEST_PASSWORD in .env");
  const stepsArg = process.argv.indexOf("--steps");
  const steps = stepsArg >= 0 ? parseInt(process.argv[stepsArg + 1], 10) : 0;
  const routes = process.argv.slice(2).filter((a) => a !== "--steps" && a !== String(steps));
  if (!routes.length) routes.push("/");
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    console.log("Logging in as", EMAIL, "…");
    await login(page);
    console.log("After login:", page.url());
    if (steps > 0) {
      await page.goto(BASE + routes[0], { waitUntil: "networkidle2", timeout: 45000 });
      await sleep(2000);
      await stepThrough(page, steps);
    } else {
      for (const r of routes) await capture(page, r);
    }
    if (errors.length) console.log("page errors:\n  " + errors.slice(0, 6).join("\n  "));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
