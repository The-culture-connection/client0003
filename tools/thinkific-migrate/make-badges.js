/**
 * make-badges.js — generate the 4 badge PNGs (3 module + 1 course), upload to
 * Storage under badge_bank/, and create badge_bank + badge_definitions docs.
 * Wires nothing to courses (course wiring is a separate step).
 * Idempotent: fixed definition ids; bank/storage re-upload replaces same path.
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { loadDotEnv } = require("./thinkific-client");
loadDotEnv();
const puppeteer = require("puppeteer-core");

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))
  ),
  projectId: process.env.FIREBASE_PROJECT_ID || "mortar-stage",
  storageBucket: `${process.env.FIREBASE_PROJECT_ID || "mortar-stage"}.firebasestorage.app`,
});
const db = admin.firestore();
const bucket = admin.storage().bucket();
const { FieldValue } = require("firebase-admin/firestore");

const BADGES = [
  {
    id: "module-foundations-complete",
    top: "FIRST VERSE",
    main: "FOUNDATIONS",
    sub: "MODULE COMPLETE · TIER I",
    accent: "#B3202C",
    name: "Foundations Complete",
    description: "Completed First Verse: Foundations — every lesson, quiz, and activity in Module 1 of MORTAR Masters: Online.",
    display_order: 10,
    tier: "I",
  },
  {
    id: "module-the-core-complete",
    top: "SECOND VERSE",
    main: "THE CORE",
    sub: "MODULE COMPLETE · TIER I",
    accent: "#B3202C",
    name: "The Core Complete",
    description: "Completed The Core — every lesson, quiz, and activity in Module 2 of MORTAR Masters: Online.",
    display_order: 11,
    tier: "I",
  },
  {
    id: "module-really-real-complete",
    top: "THIRD VERSE",
    main: "REALLY REAL",
    sub: "MODULE COMPLETE · TIER I",
    accent: "#B3202C",
    name: "Really Real Complete",
    description: "Completed Really Real — every lesson, quiz, and activity in Module 3 of MORTAR Masters: Online.",
    display_order: 12,
    tier: "I",
  },
  {
    id: "digital-mortar-master",
    top: "MORTAR MASTERS: ONLINE",
    main: "DIGITAL\nMORTAR\nMASTER",
    sub: "ENTREPRENEURSHIP ACADEMY GRADUATE",
    accent: "#F0B323",
    name: "Digital MORTAR MASTER",
    description: "For successfully completing the MORTAR Masters: Online Entrepreneurship Academy — all modules, quizzes, and activities.",
    display_order: 20,
    tier: "Course",
  },
];

function badgeHtml(b) {
  const mainLines = b.main.split("\n");
  const mainSize = mainLines.length > 1 ? 56 : b.main.length > 10 ? 52 : 64;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:'Montserrat';src:local('Montserrat');}
  body{margin:0}
  .badge{width:512px;height:512px;border-radius:50%;background:radial-gradient(circle at 50% 38%, #3a3a3a 0%, #232323 62%, #161616 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;
    font-family:'Montserrat',Arial,sans-serif;box-sizing:border-box;overflow:hidden;}
  .ring{position:absolute;inset:14px;border:6px solid ${b.accent};border-radius:50%;}
  .ring2{position:absolute;inset:30px;border:2px solid rgba(255,255,255,.25);border-radius:50%;}
  .brick{width:54px;height:22px;background:${b.accent};border-radius:3px;margin-bottom:18px;
    box-shadow:0 0 0 3px #161616, 0 0 0 5px ${b.accent}55;}
  .top{color:#cfcfcf;font-size:19px;letter-spacing:4px;font-weight:600;margin-bottom:10px;text-align:center;max-width:360px}
  .main{color:#ffffff;font-size:${mainSize}px;font-weight:800;letter-spacing:2px;line-height:1.08;text-align:center;max-width:400px;
    text-shadow:0 2px 12px rgba(0,0,0,.6);}
  .sub{color:${b.accent};font-size:16px;letter-spacing:2.5px;font-weight:700;margin-top:16px;text-align:center;max-width:380px}
  </style></head><body>
  <div class="badge"><div class="ring"></div><div class="ring2"></div>
    <div class="brick"></div>
    <div class="top">${b.top}</div>
    <div class="main">${mainLines.join("<br>")}</div>
    <div class="sub">${b.sub}</div>
  </div></body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 512, height: 512, deviceScaleFactor: 2 });

  for (const b of BADGES) {
    await page.setContent(badgeHtml(b), { waitUntil: "load" });
    const el = await page.$(".badge");
    const png = await el.screenshot({ type: "png", omitBackground: true });
    const storagePath = `badge_bank/${b.id}.png`;
    await bucket.file(storagePath).save(png, {
      metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000" },
      resumable: false,
    });
    await bucket.file(storagePath).makePublic();
    const image_url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    await db.doc(`badge_bank/${b.id}`).set({
      image_url,
      storage_path: storagePath,
      label: b.name,
      created_by_uid: "thinkific-migration",
      created_at: FieldValue.serverTimestamp(),
    });

    const def = {
      name: b.name,
      description: b.description,
      image_url,
      platform: "digital_curriculum",
      display_order: b.display_order,
      tier: b.tier,
      active: true,
      award_mode: "one_time",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    // Module badges award via the awardCourseModuleBadges callable
    // (courses.modules[].completionBadgeIds); the course badge is
    // metric-driven as a safety net alongside the certificate flow.
    if (b.id === "digital-mortar-master") {
      def.rule = { metric_key: "lessons_completed", operator: "gte", threshold: 15, timeframe: "all_time" };
      def.conditions = [
        { metric_key: "lessons_completed", operator: "gte", threshold: 15 },
        { metric_key: "quizzes_passed", operator: "gte", threshold: 13 },
      ];
    }
    await db.doc(`badge_definitions/${b.id}`).set(def, { merge: true });
    fs.writeFileSync(`/tmp/badge_${b.id}.png`, png);
    console.log(`✓ ${b.id} → ${storagePath} + definition`);
  }
  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
