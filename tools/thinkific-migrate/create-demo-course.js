/**
 * create-demo-course.js — one-off, PURELY ADDITIVE preview setup requested by
 * Grace: admin-only course "Digital Curriculum Student Demo Test Upload" on
 * mortar-stage exposing the lessons migrated in batch 1 (M1.2–M1.6, M3.5).
 *
 * - Creates courses/demoStudentTestUpload (assignedRoles Admin/superAdmin,
 *   status published)
 * - Copies lessonSurveys/lessonQuizzes for those lessons into the demo course
 * - Sets is_published: true on the 6 migrated lessons (LessonPlayer requires it)
 *
 * Touches nothing else. Idempotent (fixed doc id, safe to re-run).
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { loadDotEnv } = require("./thinkific-client");
loadDotEnv();

const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))
  ),
  projectId: process.env.FIREBASE_PROJECT_ID || "mortar-stage",
});
const db = admin.firestore();
const { FieldValue } = require("firebase-admin/firestore");

const DEMO_ID = "demoStudentTestUpload";
// Full migrated set (M3.4 stays a shell — intentionally empty in Thinkific).
const MIGRATED = [
  { m: 1, l: [1, 2, 3, 4, 5, 6] },
  { m: 2, l: [1, 2, 3, 4, 5] },
  { m: 3, l: [1, 2, 3, 5] },
];

(async () => {
  const now = FieldValue.serverTimestamp();

  // Build subset structures aligned by index (LessonPlayer pairs
  // curriculumMapping.modules[i] with course.modules[i]).
  const modulesArr = [];
  const mappingMods = [];
  const lessonIds = [];
  for (const grp of MIGRATED) {
    const mod = IDS.modules.find((x) => x.order === grp.m);
    const lessons = grp.l.map((o) => mod.lessons.find((x) => x.order === o));
    lessonIds.push(...lessons.map((x) => x.lessonId));
    modulesArr.push({
      id: mod.moduleId,
      title: mod.title,
      order: modulesArr.length + 1,
      price: 0,
      durationMonths: 0,
      skills: [],
      completionBadgeIds: [],
      lessons: lessons.map((x, i) => ({ title: x.title, order: i + 1 })),
    });
    mappingMods.push({
      moduleId: mod.moduleId,
      chapters: [
        {
          chapterId: mod.chapterId,
          lessons: lessons.map((x) => ({ lessonId: x.lessonId, title: x.title })),
        },
      ],
    });
  }

  await db.doc(`courses/${DEMO_ID}`).set({
    title: "Digital Curriculum Student Demo Test Upload",
    description:
      "Admin-only preview of the Thinkific migration output (batch 1: M1.2–M1.6 + M3.5). Safe to delete after review.",
    currency: "USD",
    totalPrice: 0,
    totalDuration: 0,
    modules: modulesArr,
    curriculumMapping: { curriculumId: IDS.curriculumId, modules: mappingMods },
    assignedRoles: ["Admin", "admin", "superAdmin"],
    assignedUserIds: [],
    status: "published",
    createdBy: "thinkific-migration",
    createdAt: now,
    updatedAt: now,
  });
  console.log(`✓ courses/${DEMO_ID} created (assignedRoles Admin/superAdmin, status published)`);

  for (const lid of lessonIds) {
    for (const col of ["lessonSurveys", "lessonQuizzes"]) {
      const src = await db.doc(`courses/${IDS.courseId}/${col}/${lid}`).get();
      if (src.exists) await db.doc(`courses/${DEMO_ID}/${col}/${lid}`).set(src.data());
    }
  }
  console.log(`✓ surveys/quizzes copied for ${lessonIds.length} lessons`);

  for (const grp of MIGRATED) {
    const mod = IDS.modules.find((x) => x.order === grp.m);
    for (const o of grp.l) {
      const les = mod.lessons.find((x) => x.order === o);
      const p = `curricula/${IDS.curriculumId}/modules/${mod.moduleId}/chapters/${mod.chapterId}/lessons/${les.lessonId}`;
      await db.doc(p).set({ is_published: true, updated_at: now }, { merge: true });
      console.log(`  published M${grp.m}.${o} ${les.title}`);
    }
  }
  console.log("✓ done");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
