/**
 * Update existing Lesson 4 on mortar-stage from exports/lesson-4-screenshot/manifest.json
 * (replaces lesson_content, surveys, quiz — does not create new course)
 *
 * Env: LESSON4_CURRICULUM_ID, LESSON4_MODULE_ID, LESSON4_CHAPTER_ID, LESSON4_LESSON_ID, LESSON4_COURSE_ID
 * Defaults from exports/lesson-4-screenshot/SEED_RESULT.md
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
const MANIFEST_PATH = path.join(REPO_ROOT, "exports/lesson-4-screenshot/manifest.json");
const PNG_DIR = path.join(REPO_ROOT, "exports/lesson-4-screenshot/png");

const IDS = {
  courseId: process.env.LESSON4_COURSE_ID || "5yOpMeJR9KkbNzdPtQ0E",
  curriculumId: process.env.LESSON4_CURRICULUM_ID || "SLpBKFr786sTNwaRMbUF",
  moduleId: process.env.LESSON4_MODULE_ID || "kCUhSJJI0mg3cDaTVDTN",
  chapterId: process.env.LESSON4_CHAPTER_ID || "VDINgFM0Q2GEFUSo1uLu",
  lessonId: process.env.LESSON4_LESSON_ID || "WhIpw7eIjAyWAEMSiOq6",
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

async function uploadScreenPng(localPath, curriculumId, moduleId, lessonId, name) {
  const bucket = admin.storage().bucket();
  const dest = `curriculum_content/${curriculumId}/${moduleId}/${lessonId}/screens/${name}`;
  await bucket.upload(localPath, {
    destination: dest,
    metadata: { contentType: "image/png" },
  });
  await bucket.file(dest).makePublic();
  return {
    storage_path: dest,
    image_url: `https://storage.googleapis.com/${bucket.name}/${dest}`,
  };
}

async function deleteCollection(collRef) {
  const snap = await collRef.get();
  if (snap.empty) return;
  const batch = collRef.firestore.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

async function run() {
  init();
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const playlist = manifest.playlist || manifest.screens;
  if (!playlist?.length) throw new Error("manifest has no playlist");

  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();
  const { curriculumId, moduleId, chapterId, lessonId, courseId } = IDS;

  const lessonRef = db.doc(
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}/lessons/${lessonId}`
  );
  await lessonRef.set(
    {
      screen_mode: "immersive",
      content_type: "media",
      updated_at: now,
    },
    { merge: true }
  );

  const contentRef = lessonRef.collection("lesson_content");
  await deleteCollection(contentRef);

  let order = 0;
  for (const item of playlist) {
    if (item.type === "video") {
      await contentRef.add({
        order,
        type: "video",
        video_provider: "youtube",
        video_id: item.youtubeId,
        video_url: item.videoUrl,
        caption: item.caption || "",
        background_color: "#000000",
        source_slide: item.sourceSlide,
        created_at: now,
        updated_at: now,
      });
      order++;
      continue;
    }
    const localPath = path.join(PNG_DIR, item.fileName);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing: ${localPath}`);
    }
    const uploaded = await uploadScreenPng(
      localPath,
      curriculumId,
      moduleId,
      lessonId,
      `screen_${String(item.sourceSlide).padStart(3, "0")}.png`
    );
    await contentRef.add({
      order,
      type: "image",
      image_url: uploaded.image_url,
      storage_path: uploaded.storage_path,
      alt_text: `Lesson 4 — slide ${item.sourceSlide}`,
      source_slide: item.sourceSlide,
      width_px: item.widthPx,
      height_px: item.heightPx,
      created_at: now,
      updated_at: now,
    });
    order++;
  }

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

  console.log("\n=== Lesson 4 updated ===\n");
  console.log(`lesson_content items: ${order}`);
  console.log(`surveys: ${checkpoints.length}`);
  console.log(`quiz questions: ${(quiz.questions || []).length}`);
  checkpoints.forEach((c) => {
    console.log(`  ${c.title} → afterScreenIndex ${c.afterSlideIndex}`);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
