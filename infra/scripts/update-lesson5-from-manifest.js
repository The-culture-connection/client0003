/**
 * Update Lesson 5 surveys, quiz, and title on mortar-stage (no PNG re-upload).
 *
 * Env: LESSON5_LESSON_ID (default JwbndTcYG0IzidZhaRIT), LESSON5_COURSE_ID, etc.
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = "mortar-stage";
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_CREDS = path.join(
  REPO_ROOT,
  "mortar-stage-firebase-adminsdk-fbsvc-cf45f45ef4.json"
);
const CONFIG_PATH = path.join(REPO_ROOT, "tools/lesson-migrate/lesson-5.config.json");
const MANIFEST_PATH = path.join(REPO_ROOT, "exports/lesson-5-screenshot/manifest.json");

const IDS = {
  courseId: process.env.LESSON5_COURSE_ID || "5yOpMeJR9KkbNzdPtQ0E",
  curriculumId: process.env.LESSON5_CURRICULUM_ID || "SLpBKFr786sTNwaRMbUF",
  moduleId: process.env.LESSON5_MODULE_ID || "kCUhSJJI0mg3cDaTVDTN",
  chapterId: process.env.LESSON5_CHAPTER_ID || "VDINgFM0Q2GEFUSo1uLu",
  lessonId: process.env.LESSON5_LESSON_ID || "JwbndTcYG0IzidZhaRIT",
};

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
  if (!fs.existsSync(MANIFEST_PATH)) {
    require("child_process").execSync(
      `node "${path.join(REPO_ROOT, "tools/lesson-migrate/build-manifest.js")}" lesson-5.config.json`,
      { stdio: "inherit", cwd: REPO_ROOT }
    );
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const lessonTitle = manifest.lessonTitle || cfg.lessonTitle;
  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();
  const { courseId, curriculumId, moduleId, chapterId, lessonId } = IDS;

  const lessonRef = db.doc(
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}`
  );
  await lessonRef.set({ title: lessonTitle, updated_at: now }, { merge: true });

  const checkpoints = (manifest.surveys || []).map((s) => ({
    id: s.id,
    enabled: s.enabled !== false,
    title: s.title,
    afterSlideIndex: s.afterScreenIndex,
    order: s.order,
    questions: (s.questions || []).map((q, i) => ({
      order: q.order ?? i,
      question: typeof q === "string" ? q : q.question,
    })),
    generatePdfOnComplete: false,
  }));

  await db.doc(`courses/${courseId}/lessonSurveys/${lessonId}`).set({
    checkpoints,
    updated_at: now,
  });

  const quiz = manifest.quiz || {};
  await db.doc(`courses/${courseId}/lessonQuizzes/${lessonId}`).set({
    enabled: quiz.enabled !== false,
    maxAttempts: quiz.maxAttempts ?? 3,
    passPercentage: quiz.passPercentage ?? 70,
    questions: quiz.questions || [],
    updated_at: now,
  });

  const courseRef = db.doc(`courses/${courseId}`);
  const courseSnap = await courseRef.get();
  if (courseSnap.exists) {
    const course = courseSnap.data();
    const modules = [...(course.modules || [])];
    const mod = modules[0];
    if (mod?.lessons) {
      mod.lessons = mod.lessons.map((l) =>
        l.order === 2 || l.title === "Lesson 5" ? { ...l, title: lessonTitle } : l
      );
      modules[0] = mod;
    }
    const mapping = course.curriculumMapping || {};
    const mapModules = [...(mapping.modules || [])];
    const mapMod = mapModules[0];
    if (mapMod?.chapters?.[0]?.lessons) {
      mapMod.chapters[0].lessons = mapMod.chapters[0].lessons.map((l) =>
        l.lessonId === lessonId ? { ...l, title: lessonTitle } : l
      );
      mapModules[0] = mapMod;
    }
    await courseRef.set(
      { modules, curriculumMapping: { ...mapping, modules: mapModules }, updatedAt: now },
      { merge: true }
    );
  }

  console.log("\n=== Lesson 5 assessments updated ===\n");
  console.log(`title: ${lessonTitle}`);
  console.log(`surveys: ${checkpoints.length} (${checkpoints.reduce((n, c) => n + c.questions.length, 0)} questions total)`);
  checkpoints.forEach((c) => {
    console.log(`  ${c.title} (${c.questions.length} q) afterScreenIndex=${c.afterSlideIndex}`);
  });
  console.log(`quiz: ${(quiz.questions || []).length} questions`);
  (quiz.questions || []).forEach((q, i) => {
    console.log(`  Q${i + 1}: ${q.question.slice(0, 70)}... → ${q.correctAnswer}`);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
