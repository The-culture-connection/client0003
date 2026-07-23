/**
 * make-challenge-badges.js — the 8 engagement "Challenge" badges (Grace's
 * GoodReads-style list). Generates artwork → badge_bank, creates
 * badge_definitions. Five are ACTIVE (metric exists); three are INACTIVE
 * drafts (no engine metric yet / name+threshold TBD). Idempotent.
 */
const fs = require("fs");
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

const RED = "#B3202C", GOLD = "#F0B323", GRAY = "#8a8a8a";

const BADGES = [
  {
    id: "challenge-all-about-you", name: "All About You",
    top: "CHALLENGE", main: "ALL ABOUT\nYOU", sub: "PROFILE FULLY SET UP", accent: RED,
    description: "Fully set up your profile — tell the community who you are.",
    active: true, display_order: 30,
    rule: { metric_key: "onboarding_completions", operator: "gte", threshold: 1, timeframe: "all_time" },
  },
  {
    id: "challenge-opening-track", name: "Opening Track",
    top: "CHALLENGE", main: "OPENING\nTRACK", sub: "THE RELEASE PARTY COMPLETE", accent: RED,
    description: "Completed \"The Release Party\" — the opening lesson of MORTAR Masters: Online. (Engine rule: first 2 lessons completed — the closest per-lesson proxy the badge metrics support.)",
    active: true, display_order: 31,
    rule: { metric_key: "lessons_completed", operator: "gte", threshold: 2, timeframe: "all_time" },
  },
  {
    id: "challenge-freestyle-session", name: "Freestyle Session",
    top: "CHALLENGE", main: "FREESTYLE\nSESSION", sub: "FIRST DISCUSSION POST", accent: RED,
    description: "Made your first post in a discussion forum.",
    active: true, display_order: 32,
    rule: { metric_key: "discussions_created", operator: "gte", threshold: 1, timeframe: "all_time" },
  },
  {
    id: "challenge-call-and-response", name: "Call & Response",
    top: "CHALLENGE", main: "CALL &\nRESPONSE", sub: "FIRST DISCUSSION REPLY", accent: RED,
    description: "Replied to a post in the discussion forum. (Name is a suggestion — rename in Badge Management if you prefer.)",
    active: true, display_order: 33,
    rule: { metric_key: "discussion_replies", operator: "gte", threshold: 1, timeframe: "all_time" },
  },
  {
    id: "challenge-wrapped", name: "Wrapped",
    top: "CHALLENGE", main: "WRAPPED", sub: "ALL THREE MODULES COMPLETE", accent: GOLD,
    description: "Completed all three modules of MORTAR Masters: Online — Foundations, The Core, and Really Real.",
    active: true, display_order: 34,
    rule: { metric_key: "lessons_completed", operator: "gte", threshold: 15, timeframe: "all_time" },
  },
  {
    id: "challenge-studio-time-draft", name: "Studio Time (draft — rename me)",
    top: "CHALLENGE · DRAFT", main: "STUDIO\nTIME", sub: "LEARNING HOURS GOAL", accent: GRAY,
    description: "DRAFT: N learning hours within a time period. Inactive — the badge engine has no learning-hours metric yet, and the threshold needs average-completion-time data. Activate + rename once decided.",
    active: false, display_order: 40,
    rule: { metric_key: "lessons_completed", operator: "gte", threshold: 9999, timeframe: "all_time" },
  },
  {
    id: "challenge-album-drop-draft", name: "Album Drop (draft — rename me)",
    top: "CHALLENGE · DRAFT", main: "ALBUM\nDROP", sub: "FULL COURSE IN RECORD TIME", accent: GRAY,
    description: "DRAFT: complete the full course within a set number of days. Inactive — needs average-completion-time data and a time-window rule (engine timeframe is all_time in v1).",
    active: false, display_order: 41,
    rule: { metric_key: "lessons_completed", operator: "gte", threshold: 9999, timeframe: "all_time" },
  },
  {
    id: "challenge-outro-draft", name: "Outro (draft — rename me)",
    top: "CHALLENGE · DRAFT", main: "OUTRO", sub: "END-OF-COURSE SURVEY", accent: GRAY,
    description: "DRAFT: complete the end-of-course survey. Inactive — survey submissions aren't a badge-engine metric yet (needs a counter added to the analytics rollup).",
    active: false, display_order: 42,
    rule: { metric_key: "lessons_completed", operator: "gte", threshold: 9999, timeframe: "all_time" },
  },
];

function badgeHtml(b) {
  const mainLines = b.main.split("\n");
  const mainSize = mainLines.length > 1 ? 58 : b.main.length > 9 ? 54 : 66;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  body{margin:0}
  .badge{width:512px;height:512px;border-radius:50%;background:radial-gradient(circle at 50% 38%, #3a3a3a 0%, #232323 62%, #161616 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;
    font-family:'Montserrat',Arial,sans-serif;box-sizing:border-box;overflow:hidden;}
  .ring{position:absolute;inset:14px;border:6px solid ${b.accent};border-radius:50%;}
  .ring2{position:absolute;inset:30px;border:2px dashed rgba(255,255,255,.28);border-radius:50%;}
  .brick{width:54px;height:22px;background:${b.accent};border-radius:3px;margin-bottom:18px;
    box-shadow:0 0 0 3px #161616, 0 0 0 5px ${b.accent}55;}
  .top{color:#cfcfcf;font-size:18px;letter-spacing:4px;font-weight:600;margin-bottom:10px;text-align:center;max-width:360px}
  .main{color:#ffffff;font-size:${mainSize}px;font-weight:800;letter-spacing:2px;line-height:1.08;text-align:center;max-width:400px;
    text-shadow:0 2px 12px rgba(0,0,0,.6);}
  .sub{color:${b.accent};font-size:15px;letter-spacing:2.5px;font-weight:700;margin-top:16px;text-align:center;max-width:380px}
  </style></head><body>
  <div class="badge"><div class="ring"></div><div class="ring2"></div>
    <div class="brick"></div>
    <div class="top">${b.top}</div>
    <div class="main">${b.main.split("\n").join("<br>")}</div>
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
      image_url, storage_path: storagePath, label: b.name,
      created_by_uid: "thinkific-migration", created_at: FieldValue.serverTimestamp(),
    });
    await db.doc(`badge_definitions/${b.id}`).set({
      name: b.name, description: b.description, image_url,
      platform: "digital_curriculum", display_order: b.display_order,
      tier: "Challenge", active: b.active, award_mode: "one_time",
      rule: b.rule, conditions: [ { metric_key: b.rule.metric_key, operator: b.rule.operator, threshold: b.rule.threshold } ],
      created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    fs.writeFileSync(`/tmp/badge_${b.id}.png`, png);
    console.log(`✓ ${b.id} ${b.active ? "(ACTIVE)" : "(inactive draft)"}`);
  }
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
