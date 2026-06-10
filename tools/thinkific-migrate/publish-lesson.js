/**
 * Toggle is_published on a migrated lesson (for previewing as a learner).
 * Also prints the /learn/lesson URL with all required query params.
 *
 * Usage:
 *   node publish-lesson.js --module 1 --lesson 2 --on      # publish (preview)
 *   node publish-lesson.js --module 1 --lesson 2 --off     # revert to unpublished
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { loadDotEnv } = require("./thinkific-client");

loadDotEnv();
const REPO_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mortar-stage";
const CREDS = process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.join(REPO_ROOT, "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json");
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));

function arg(n, d) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; }
const M = parseInt(arg("--module", "1"), 10);
const L = parseInt(arg("--lesson", "1"), 10);
const ON = process.argv.includes("--on");
const OFF = process.argv.includes("--off");

(async () => {
  if (!ON && !OFF) throw new Error("Pass --on or --off");
  const sa = JSON.parse(fs.readFileSync(CREDS, "utf8").replace(/^﻿/, ""));
  admin.initializeApp({ credential: admin.credential.cert(sa), projectId: PROJECT_ID });
  const db = admin.firestore();
  const mod = IDS.modules.find((m) => m.order === M);
  const lesson = mod.lessons.find((l) => l.order === L);
  const lessonPath = `curricula/${IDS.curriculumId}/modules/${mod.moduleId}/chapters/${mod.chapterId}/lessons/${lesson.lessonId}`;
  await db.doc(lessonPath).set({ is_published: ON, updated_at: FieldValue.serverTimestamp() }, { merge: true });
  console.log(`M${M}.${L} "${lesson.title}" is_published = ${ON}`);
  if (ON) {
    const qp = new URLSearchParams({
      curriculumId: IDS.curriculumId,
      moduleId: mod.moduleId,
      chapterId: mod.chapterId,
      courseId: IDS.courseId,
    });
    console.log(`Preview URL:\n  /learn/lesson/${lesson.lessonId}?${qp.toString()}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
