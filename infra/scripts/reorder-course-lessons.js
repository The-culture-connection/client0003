/**
 * Reorder lessons in a course (module.lessons + curriculumMapping + Firestore lesson order).
 *
 * Usage:
 *   node infra/scripts/reorder-course-lessons.js
 *
 * Env: COURSE_ID, CURRICULUM_ID, MODULE_ID, CHAPTER_ID
 * LESSON_ORDER_JSON='[{"lessonId":"...","title":"...","order":1},...]'
 */
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "mortar-stage";
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_CREDS = path.join(
  REPO_ROOT,
  "mortar-stage-firebase-adminsdk-fbsvc-cf45f45ef4.json"
);

const COURSE_ID = process.env.COURSE_ID || "5yOpMeJR9KkbNzdPtQ0E";
const CURRICULUM_ID = process.env.CURRICULUM_ID || "SLpBKFr786sTNwaRMbUF";
const MODULE_ID = process.env.MODULE_ID || "kCUhSJJI0mg3cDaTVDTN";
const CHAPTER_ID = process.env.CHAPTER_ID || "VDINgFM0Q2GEFUSo1uLu";

/** Desired top-to-bottom order */
const DEFAULT_ORDER = [
  { lessonId: "8j6eOtUnWG1xMBimLc25", title: "Release Party", order: 1 },
  { lessonId: process.env.LESSON2_ID || "DJoLVrSTwQoJyjxhHXL8", title: "The Four-One-One", order: 2 },
  { lessonId: process.env.LESSON3_ID || "4lFBcbFxOLp9Ps2XPkPL", title: "Dollars & Sense", order: 3 },
  { lessonId: "WhIpw7eIjAyWAEMSiOq6", title: "Fade In", order: 4 },
  { lessonId: "JwbndTcYG0IzidZhaRIT", title: "Internal Reflection", order: 5 },
];

function init() {
  if (admin.apps.length) return;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_CREDS;
  const serviceAccount = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
}

async function run() {
  init();
  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();

  const desired = process.env.LESSON_ORDER_JSON
    ? JSON.parse(process.env.LESSON_ORDER_JSON)
    : DEFAULT_ORDER;

  const courseRef = db.doc(`courses/${COURSE_ID}`);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) throw new Error(`Course not found: ${COURSE_ID}`);
  const course = courseSnap.data();

  const modules = [...(course.modules || [])];
  const mod = modules[0];
  if (!mod) throw new Error("Course has no modules[0]");

  mod.lessons = desired.map((d) => ({ title: d.title, order: d.order }));
  modules[0] = mod;

  const mapping = { ...(course.curriculumMapping || {}) };
  const mapModules = [...(mapping.modules || [])];
  const mapMod = { ...mapModules[0] };
  const chapters = [...(mapMod.chapters || [])];
  const chIdx = chapters.findIndex((c) => c.chapterId === CHAPTER_ID);
  const ch = chIdx >= 0 ? { ...chapters[chIdx] } : { chapterId: CHAPTER_ID, lessons: [] };

  ch.lessons = desired.map((d) => ({ lessonId: d.lessonId, title: d.title }));
  if (chIdx >= 0) chapters[chIdx] = ch;
  else chapters.push(ch);
  mapMod.chapters = chapters;
  mapMod.moduleId = mapMod.moduleId || MODULE_ID;
  mapModules[0] = mapMod;

  await courseRef.set(
    {
      modules,
      curriculumMapping: {
        ...mapping,
        curriculumId: mapping.curriculumId || CURRICULUM_ID,
        modules: mapModules,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  const batch = db.batch();
  for (const d of desired) {
    const lessonRef = db.doc(
      `curricula/${CURRICULUM_ID}/modules/${MODULE_ID}/chapters/${CHAPTER_ID}/lessons/${d.lessonId}`
    );
    batch.set(lessonRef, { order: d.order, title: d.title, updated_at: now }, { merge: true });
  }
  await batch.commit();

  console.log("\n=== Course lessons reordered ===\n");
  console.log(`courseId=${COURSE_ID}`);
  desired.forEach((d) => console.log(`  ${d.order}. ${d.title} (${d.lessonId})`));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
