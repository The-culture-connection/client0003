/**
 * Create the new "MORTAR MASTERS Online" course structure in Firestore,
 * migrated from Thinkific.
 *
 * This creates a BRAND-NEW course (fresh IDs) with the full 3-module structure:
 *   Module 1 — First Verse: Foundations   (5 lessons)
 *   Module 2 — The Core                    (5 lessons)
 *   Module 3 — Really Real                 (5 lessons)
 *
 * It writes:
 *   courses/{courseId}                                              (legacy course doc + curriculumMapping)
 *   curricula/{curriculumId}                                        (curriculum root)
 *   curricula/{curriculumId}/modules/{moduleId}                     (one per module)
 *   .../modules/{moduleId}/chapters/{chapterId}                     ("Main Chapter", one per module)
 *   .../chapters/{chapterId}/lessons/{lessonId}                     (lesson SHELLS — no slide content yet)
 *
 * Lesson slide/media CONTENT is populated separately (see README — content
 * migration phase that pulls from the Thinkific API).
 *
 * Field conventions are copied from the app:
 *   - courses/*   use camelCase  createdAt / updatedAt / createdBy   (see lib/courses.ts createCourse)
 *   - curricula/* use snake_case created_at / updated_at / created_by_uid (see lib/curriculum.ts)
 *
 * Usage:
 *   node tools/thinkific-migrate/setup-course.js --dry-run     # preview, no writes
 *   node tools/thinkific-migrate/setup-course.js               # write to Firestore
 *
 * Credentials (same mechanism as infra/scripts/*):
 *   - Place the service-account JSON at the repo root as
 *       mortar-stage-firebase-adminsdk-fbsvc-67e746a43d.json
 *     OR set GOOGLE_APPLICATION_CREDENTIALS to its path.
 *   - Override the target project with FIREBASE_PROJECT_ID (default: mortar-stage).
 *   - Set MIGRATION_UID to the admin uid to record as creator (default: "thinkific-migration").
 *
 * On success it prints all generated IDs and writes them to
 *   tools/thinkific-migrate/course-ids.json
 * so the content-migration phase can reference them.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { loadDotEnv } = require("./thinkific-client");

loadDotEnv(); // pull FIREBASE_PROJECT_ID / MIGRATION_UID / GOOGLE_APPLICATION_CREDENTIALS from .env

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mortar-stage";
const REPO_ROOT = path.resolve(__dirname, "../..");
// Falls back to the service-account JSON at the repo root. Override with
// GOOGLE_APPLICATION_CREDENTIALS in .env if your filename differs.
const DEFAULT_CREDS = path.join(
  REPO_ROOT,
  "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json"
);
const DRY_RUN = process.argv.includes("--dry-run");
const MIGRATION_UID = process.env.MIGRATION_UID || "thinkific-migration";
const IDS_OUT = path.join(__dirname, "course-ids.json");

// ── Course shape (authoritative — from the Thinkific course outline) ──────────
const COURSE_META = {
  title: "MORTAR MASTERS Online",
  description:
    "A comprehensive entrepreneurship curriculum covering foundations, " +
    "branding & marketing, sales, competitive analysis, finance, and pitching.",
  currency: "USD",
  status: "draft", // flip to "published" once content is migrated & reviewed
};

/**
 * Modules → lessons. Lesson `title` uses the short name (matches existing
 * convention). The descriptive subtitle and the skill earned are kept here for
 * documentation / the content-migration phase; skills are intentionally NOT
 * written onto the module yet (they require certificate PDFs — see README).
 */
// Source Thinkific course (MORTAR MASTERS Online). `thinkificChapterId` links
// each lesson shell to its Thinkific chapter for the content-migration phase.
const THINKIFIC_COURSE_ID = "2418972";

const MODULES = [
  {
    title: "First Verse: Foundations",
    lessons: [
      { title: "Welcome to the MORTAR Entrepreneurship Academy", subtitle: "Course introduction", thinkificChapterId: "11995497" },
      { title: "The Release Party", subtitle: "Introduction to course", thinkificChapterId: "11995690" },
      { title: "Expect the Unexpected", subtitle: "Setting Your Sights on the Road Ahead", thinkificChapterId: "11996587" },
      { title: "Dollars and Sense", subtitle: "Getting Your House in Order", skill: "Personal Finance (Tier I)", thinkificChapterId: "12018567" },
      { title: "Fade In", subtitle: "Clarifying Your Concept", thinkificChapterId: "12034236" },
      { title: "Reflection", subtitle: "Checking in and Making Decisions", note: "Verify against Thinkific for changes before migrating content.", thinkificChapterId: "12149691" },
    ],
  },
  {
    title: "The Core",
    lessons: [
      { title: "The Medium Is the Message", subtitle: "Branding & Marketing", skill: "Branding & Marketing (Tier I)", thinkificChapterId: "11172042" },
      { title: "Always Be Closing", subtitle: "Sales & Distribution", thinkificChapterId: "11180230" },
      { title: "All Eyes on Them", subtitle: "Competitive Analysis", thinkificChapterId: "11180232" },
      { title: "Balancing Act", subtitle: "Cost Structures", skill: "Business Finance (Tier I)", thinkificChapterId: "11180236" },
      { title: "Make Me Care", subtitle: "Storytelling for Entrepreneurs", skill: "Pitch Your Business (Tier I)", thinkificChapterId: "11180238" },
    ],
  },
  {
    title: "Really Real",
    lessons: [
      { title: "Game Recognize Game", subtitle: "Pricing and Revenue", thinkificChapterId: "11265311" },
      { title: "Legit or Quit", subtitle: "Legitimizing Your Business", thinkificChapterId: "11265294" },
      { title: "C.R.E.A.M.", subtitle: "Cash Flow and Funding", thinkificChapterId: "12195194" },
      { title: "Pitching & Alternatives", subtitle: "Pitch submission", note: "Empty in Thinkific (Lesson 14 / Pitch Night) — no slide content to migrate.", thinkificChapterId: "12055922" },
      { title: "The End of the Beginning", subtitle: "Goals & Planning", thinkificChapterId: "12055452" },
    ],
  },
];

// ── Firebase init (mirrors infra/scripts/setup-mortar-masters-course.js) ──────
function init() {
  if (admin.apps.length) return;
  const envCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (envCreds && fs.existsSync(envCreds)) {
    const raw = fs.readFileSync(envCreds, "utf8").replace(/^﻿/, "");
    const parsed = JSON.parse(raw);
    const credential =
      parsed.type === "authorized_user"
        ? admin.credential.refreshToken(parsed)
        : admin.credential.cert(parsed);
    admin.initializeApp({
      credential,
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
    return;
  }

  if (!fs.existsSync(DEFAULT_CREDS)) {
    throw new Error(
      `Credentials not found: ${DEFAULT_CREDS}\n` +
        `Set GOOGLE_APPLICATION_CREDENTIALS or place the service-account JSON at the repo root.`
    );
  }
  const serviceAccount = JSON.parse(fs.readFileSync(DEFAULT_CREDS, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
}

async function write(ref, data, label) {
  if (DRY_RUN) {
    console.log(`[dry-run] ${label}  ->  ${ref.path}`);
    return;
  }
  await ref.set(data, { merge: true });
  console.log(`  written: ${label} (${ref.path})`);
}

async function run() {
  console.log(
    `=== Thinkific → MORTAR course setup  (project: ${PROJECT_ID})  ${DRY_RUN ? "[DRY RUN]" : ""} ===\n`
  );

  init();
  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();

  // Pre-generate IDs so we can build curriculumMapping in one pass.
  const courseRef = db.collection("courses").doc();
  const curriculumRef = db.collection("curricula").doc();
  const courseId = courseRef.id;
  const curriculumId = curriculumRef.id;

  const idMap = {
    project: PROJECT_ID,
    thinkificCourseId: THINKIFIC_COURSE_ID,
    courseId,
    curriculumId,
    modules: [],
  };

  // Build the per-collection module docs + curriculumMapping + legacy course.modules.
  const curriculumMappingModules = [];
  const legacyCourseModules = [];

  for (let m = 0; m < MODULES.length; m++) {
    const mod = MODULES[m];
    const moduleRef = curriculumRef.collection("modules").doc();
    const chapterRef = moduleRef.collection("chapters").doc();
    const moduleOrder = m + 1;

    const lessonEntries = [];
    const mappingLessons = [];
    const legacyLessons = [];

    for (let l = 0; l < mod.lessons.length; l++) {
      const lesson = mod.lessons[l];
      const lessonRef = chapterRef.collection("lessons").doc();
      const lessonOrder = l + 1;

      // Lesson SHELL — matches lib/curriculum.ts createLesson(); no content_type
      // so the builder/content phase decides (slides vs media).
      await write(
        lessonRef,
        {
          title: lesson.title,
          order: lessonOrder,
          theme: "dark_slide",
          is_published: false,
          created_by_uid: MIGRATION_UID,
          curriculum_id: curriculumId,
          module_id: moduleRef.id,
          chapter_id: chapterRef.id,
          created_at: now,
          updated_at: now,
        },
        `lesson ${moduleOrder}.${lessonOrder} "${lesson.title}"`
      );

      mappingLessons.push({ lessonId: lessonRef.id, title: lesson.title });
      legacyLessons.push({ title: lesson.title, order: lessonOrder });
      lessonEntries.push({
        lessonId: lessonRef.id,
        order: lessonOrder,
        title: lesson.title,
        subtitle: lesson.subtitle || null,
        skill: lesson.skill || null,
        note: lesson.note || null,
        thinkificChapterId: lesson.thinkificChapterId || null,
      });
    }

    // Module doc (curricula/*) — snake_case timestamps.
    await write(
      moduleRef,
      { title: mod.title, order: moduleOrder, created_at: now, updated_at: now },
      `module ${moduleOrder} "${mod.title}"`
    );

    // Single auto-chapter, matching the wizard's "Main Chapter" convention.
    await write(
      chapterRef,
      { title: "Main Chapter", order: 1, created_at: now, updated_at: now },
      `chapter for module ${moduleOrder}`
    );

    curriculumMappingModules.push({
      moduleId: moduleRef.id,
      chapters: [{ chapterId: chapterRef.id, lessons: mappingLessons }],
    });

    legacyCourseModules.push({
      id: moduleRef.id,
      title: mod.title,
      order: moduleOrder,
      price: 0,
      durationMonths: 0,
      skills: [], // deferred — needs certificate PDFs (see README)
      completionBadgeIds: [],
      skillCertificates: [],
      lessons: legacyLessons,
    });

    idMap.modules.push({
      moduleId: moduleRef.id,
      chapterId: chapterRef.id,
      title: mod.title,
      order: moduleOrder,
      lessons: lessonEntries,
    });
  }

  // Curriculum root.
  await write(
    curriculumRef,
    {
      title: COURSE_META.title,
      description: COURSE_META.description,
      created_by_uid: MIGRATION_UID,
      created_at: now,
      updated_at: now,
    },
    "curriculum root"
  );

  // Legacy course doc (+ curriculumMapping) — matches lib/courses.ts shape.
  await write(
    courseRef,
    {
      title: COURSE_META.title,
      description: COURSE_META.description,
      currency: COURSE_META.currency,
      status: COURSE_META.status,
      modules: legacyCourseModules,
      totalDuration: 0,
      totalPrice: 0,
      createdBy: MIGRATION_UID,
      createdAt: now,
      updatedAt: now,
      curriculumMapping: { curriculumId, modules: curriculumMappingModules },
    },
    "course doc"
  );

  // Persist IDs for the content-migration phase.
  if (!DRY_RUN) {
    fs.writeFileSync(IDS_OUT, JSON.stringify(idMap, null, 2));
    console.log(`\n  IDs written to ${IDS_OUT}`);
  }

  console.log("\n=== Structure ready ===\n");
  console.log(`Course:       ${COURSE_META.title}`);
  console.log(`courseId:     ${courseId}`);
  console.log(`curriculumId: ${curriculumId}\n`);
  for (const mod of idMap.modules) {
    console.log(`Module ${mod.order}: ${mod.title}`);
    console.log(`  moduleId:  ${mod.moduleId}`);
    console.log(`  chapterId: ${mod.chapterId}`);
    for (const l of mod.lessons) {
      const skill = l.skill ? `   [skill: ${l.skill}]` : "";
      console.log(`    ${mod.order}.${l.order} ${l.title} — ${l.subtitle || ""}${skill}`);
      if (l.note) console.log(`         ⚠ ${l.note}`);
    }
    console.log("");
  }
  if (DRY_RUN) {
    console.log("(dry run — nothing was written; re-run without --dry-run to apply)");
  } else {
    console.log("Next: migrate lesson content from Thinkific (see README).");
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
