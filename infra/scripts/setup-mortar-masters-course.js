/**
 * Initialize or update the MORTAR MASTERS Online course structure in mortar-stage.
 *
 * Run this ONCE before migrating any lessons. It creates (or updates) the
 * course document, curriculum, and both modules with proper titles, order,
 * and skill labels.  All lesson migration scripts (migrate:lesson1 … migrate:lesson8)
 * read the IDs this script prints — those are already embedded in the
 * tools/lesson-migrate/lesson-N.config.json files.
 *
 * Usage:
 *   node infra/scripts/setup-mortar-masters-course.js
 *   node infra/scripts/setup-mortar-masters-course.js --dry-run
 */

const fs   = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID  = "mortar-stage";
const REPO_ROOT   = path.resolve(__dirname, "../..");
const DEFAULT_CREDS = path.join(REPO_ROOT, "mortar-stage-firebase-adminsdk-fbsvc-67e746a43d.json");
const DRY_RUN     = process.argv.includes("--dry-run");

// ── IDs that are already baked into all lesson-N.config.json files ──────────
const COURSE_ID      = "5yOpMeJR9KkbNzdPtQ0E";
const CURRICULUM_ID  = "SLpBKFr786sTNwaRMbUF";

// Module 1 — First Verse: Foundations (lessons 1–5)
const MODULE1_ID  = "kCUhSJJI0mg3cDaTVDTN";
const CHAPTER1_ID = "VDINgFM0Q2GEFUSo1uLu";

// Module 2 — The Core (lessons 6–9)
// Lesson-6 config uses createModule so it auto-creates module 2.
// Lessons 7 & 8 configs reference the IDs below (already in their configs).
const MODULE2_ID  = "hatLrWdDIWhb3ndNZjxV";
const CHAPTER2_ID = "jdgMbIrLo5vi8PGjovr2";

// ── Course & curriculum shape ────────────────────────────────────────────────
const COURSE = {
  title:       "MORTAR MASTERS Online",
  description: "A comprehensive entrepreneurship curriculum covering foundations, branding, sales, competitive analysis, and finance.",
  currency:    "USD",
  status:      "published",
  totalDuration: 0,
  totalPrice:    0,
  modules: [
    {
      title:           "First Verse: Foundations",
      order:           1,
      price:           0,
      durationMonths:  0,
      skills:          [],
      completionBadgeIds: [],
      skillCertificates:  [],
      // Lessons are appended by each migrate:lessonN run — placeholders here
      lessons: [
        { title: "The Release Party",      order: 1 },
        { title: "Expect the Unexpected",  order: 2 },
        { title: "Dollars and Sense",      order: 3 },
        { title: "Fade In",                order: 4 },
        { title: "Reflection",             order: 5 },
      ],
    },
    {
      title:           "The Core",
      order:           2,
      price:           0,
      durationMonths:  0,
      skills:          [],
      completionBadgeIds: [],
      skillCertificates:  [],
      lessons: [
        { title: "The Medium Is the Message", order: 1 },
        { title: "Always Be Closing",         order: 2 },
        { title: "All Eyes on Them",          order: 3 },
        { title: "Balancing Act",             order: 4 },
      ],
    },
  ],
  curriculumMapping: {
    curriculumId: CURRICULUM_ID,
    modules: [
      {
        moduleId: MODULE1_ID,
        chapters: [{ chapterId: CHAPTER1_ID, lessons: [] }],
      },
      {
        moduleId: MODULE2_ID,
        chapters: [{ chapterId: CHAPTER2_ID, lessons: [] }],
      },
    ],
  },
};

const CURRICULUM = {
  title:       "MORTAR MASTERS Online",
  description: "Full digital curriculum for the Mortar Masters entrepreneurship programme.",
};

const MODULE1 = {
  title: "First Verse: Foundations",
  order: 1,
};

const CHAPTER1 = {
  title: "First Verse: Foundations",
  order: 1,
};

const MODULE2 = {
  title: "The Core",
  order: 2,
};

const CHAPTER2 = {
  title: "The Core — Lessons 6–9",
  order: 1,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function init() {
  if (admin.apps.length) return;
  const envCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (envCreds && fs.existsSync(envCreds)) {
    // User credentials (Firebase CLI token) — use applicationDefault
    const raw = fs.readFileSync(envCreds, "utf8").replace(/^﻿/, "");
    const parsed = JSON.parse(raw);
    let credential;
    if (parsed.type === "authorized_user") {
      credential = admin.credential.refreshToken(parsed);
    } else {
      credential = admin.credential.cert(parsed);
    }
    admin.initializeApp({ credential, projectId: PROJECT_ID, storageBucket: `${PROJECT_ID}.firebasestorage.app` });
    return;
  }

  if (!fs.existsSync(DEFAULT_CREDS)) {
    throw new Error(`Credentials not found: ${DEFAULT_CREDS}\nSet GOOGLE_APPLICATION_CREDENTIALS or place the service-account JSON at the repo root.`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(DEFAULT_CREDS, "utf8"));
  admin.initializeApp({
    credential:    admin.credential.cert(serviceAccount),
    projectId:     PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
}

async function upsert(ref, data, label) {
  if (DRY_RUN) {
    console.log(`[dry-run] Would write ${label}:`, JSON.stringify(data, null, 2));
    return;
  }
  await ref.set(data, { merge: true });
  console.log(`  Written: ${label}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  if (DRY_RUN) console.log("=== DRY RUN — no writes will be made ===\n");

  init();
  const db  = admin.firestore();
  const now = FieldValue.serverTimestamp();

  // 1. Course document
  console.log("1. Course document...");
  await upsert(
    db.doc(`courses/${COURSE_ID}`),
    { ...COURSE, updatedAt: now },
    `courses/${COURSE_ID}`
  );

  // 2. Curriculum root
  console.log("2. Curriculum root...");
  await upsert(
    db.doc(`curricula/${CURRICULUM_ID}`),
    { ...CURRICULUM, updated_at: now },
    `curricula/${CURRICULUM_ID}`
  );

  // 3. Module 1
  console.log("3. Module 1 — First Verse: Foundations...");
  await upsert(
    db.doc(`curricula/${CURRICULUM_ID}/modules/${MODULE1_ID}`),
    { ...MODULE1, updated_at: now },
    `modules/${MODULE1_ID}`
  );

  // 4. Chapter 1 (inside Module 1)
  console.log("4. Chapter 1...");
  await upsert(
    db.doc(`curricula/${CURRICULUM_ID}/modules/${MODULE1_ID}/chapters/${CHAPTER1_ID}`),
    { ...CHAPTER1, updated_at: now },
    `chapters/${CHAPTER1_ID}`
  );

  // 5. Module 2
  console.log("5. Module 2 — The Core...");
  await upsert(
    db.doc(`curricula/${CURRICULUM_ID}/modules/${MODULE2_ID}`),
    { ...MODULE2, updated_at: now },
    `modules/${MODULE2_ID}`
  );

  // 6. Chapter 2 (inside Module 2)
  console.log("6. Chapter 2...");
  await upsert(
    db.doc(`curricula/${CURRICULUM_ID}/modules/${MODULE2_ID}/chapters/${CHAPTER2_ID}`),
    { ...CHAPTER2, updated_at: now },
    `chapters/${CHAPTER2_ID}`
  );

  console.log(`
=== Course structure ready ===

Course:      MORTAR MASTERS Online
courseId:    ${COURSE_ID}
curriculumId:${CURRICULUM_ID}

Module 1:    First Verse: Foundations
  moduleId:  ${MODULE1_ID}
  chapterId: ${CHAPTER1_ID}
  Lessons:   1 (The Release Party), 2 (Expect the Unexpected),
             3 (Dollars and Sense), 4 (Fade In), 5 (Reflection)

Module 2:    The Core
  moduleId:  ${MODULE2_ID}
  chapterId: ${CHAPTER2_ID}
  Lessons:   6 (The Medium Is the Message), 7 (Always Be Closing),
             8 (All Eyes on Them), 9 (Balancing Act — PPTX needed)

Skills to configure after lessons are uploaded:
  Lesson 3 completion → Personal Finance (Tier I)
  Lesson 6 completion → Branding & Marketing (Tier I)
  Lesson 9 completion → Business Finance (Tier I)

Flags:
  ⚠  Lesson 5 (Reflection) — verify content against Thinkific before running migrate:lesson5
  ⚠  Lesson 9 (Balancing Act) — PPTX and config not yet created

Next steps:
  npm run migrate:lesson1
  npm run migrate:lesson2
  npm run migrate:lesson3
  npm run migrate:lesson4   (uses separate seed:lesson4 pipeline)
  npm run migrate:lesson5   (verify Thinkific first)
  npm run migrate:lesson6
  npm run migrate:lesson7
  npm run migrate:lesson8
`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
