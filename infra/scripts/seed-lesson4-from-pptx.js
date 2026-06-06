/**
 * Seed Lesson 4 (Fade In) from exports/lesson-4-screenshot manifest + PNGs.
 *
 * Usage:
 *   node infra/scripts/seed-lesson4-from-pptx.js
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to.json node infra/scripts/seed-lesson4-from-pptx.js
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = "mortar-stage";
const REPO_ROOT = path.resolve(__dirname, "../..");
const DEFAULT_CREDS = path.join(
  REPO_ROOT,
  "mortar-stage-firebase-adminsdk-fbsvc-67e746a43d.json"
);
const MANIFEST_PATH = path.join(REPO_ROOT, "exports/lesson-4-screenshot/manifest.json");
const PNG_DIR = path.join(REPO_ROOT, "exports/lesson-4-screenshot/png");

function init() {
  if (admin.apps.length) return;
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_CREDS;
  if (!fs.existsSync(credsPath)) {
    throw new Error(`Credentials not found: ${credsPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credsPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: PROJECT_ID,
    storageBucket: `${PROJECT_ID}.firebasestorage.app`,
  });
}

async function uploadScreenPng(localPath, curriculumId, moduleId, lessonId, screenNumber) {
  const bucket = admin.storage().bucket();
  const filename = `screen_${String(screenNumber).padStart(3, "0")}.png`;
  const dest = `curriculum_content/${curriculumId}/${moduleId}/${lessonId}/screens/${filename}`;
  await bucket.upload(localPath, {
    destination: dest,
    metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000" },
  });
  const file = bucket.file(dest);
  await file.makePublic();
  return {
    storage_path: dest,
    image_url: `https://storage.googleapis.com/${bucket.name}/${dest}`,
  };
}

async function run() {
  init();
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Run export + build-manifest first. Missing: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const playlist = manifest.playlist || manifest.screens;
  if (!playlist?.length) {
    throw new Error("manifest missing playlist");
  }
  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();
  const createdBy = process.env.SEED_CREATED_BY_UID || "seed-lesson4-from-pptx";

  const curriculumRef = db.collection("curricula").doc();
  const moduleRef = curriculumRef.collection("modules").doc();
  const chapterRef = moduleRef.collection("chapters").doc();
  const lessonRef = chapterRef.collection("lessons").doc();
  const courseRef = db.collection("courses").doc();
  const lessonId = lessonRef.id;
  const curriculumId = curriculumRef.id;
  const moduleId = moduleRef.id;
  const chapterId = chapterRef.id;
  const courseId = courseRef.id;

  await curriculumRef.set({
    title: "Mortar Masters — Verse One",
    description: "Lesson 4 Fade In (migrated from Canva / Lesson4.pptx).",
    created_by_uid: createdBy,
    created_at: now,
    updated_at: now,
  });

  await moduleRef.set({
    title: "Verse One: Foundations",
    order: 1,
    created_at: now,
    updated_at: now,
  });

  await chapterRef.set({
    title: "Lesson 4 — Fade In",
    order: 1,
    created_at: now,
    updated_at: now,
  });

  await lessonRef.set({
    title: manifest.lessonTitle || "Fade In",
    order: 1,
    theme: "dark_slide",
    is_published: true,
    content_type: "media",
    screen_mode: "immersive",
    source_type: "pptx_import",
    import_status: "ready",
    source_file_name: "Lesson4.pptx",
    created_by_uid: createdBy,
    curriculum_id: curriculumId,
    module_id: moduleId,
    chapter_id: chapterId,
    created_at: now,
    updated_at: now,
  });

  const contentRef = lessonRef.collection("lesson_content");
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
      throw new Error(`Missing PNG: ${localPath}`);
    }
    const uploaded = await uploadScreenPng(
      localPath,
      curriculumId,
      moduleId,
      lessonId,
      item.sourceSlide
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

  await courseRef.set({
    title: "Mortar Masters — Lesson 4: Fade In",
    description: "Fade In — customer, mission, and vision (Lesson 4).",
    currency: "USD",
    modules: [
      {
        title: "Verse One: Foundations",
        order: 1,
        price: 0,
        durationMonths: 0,
        lessons: [{ title: manifest.lessonTitle || "Fade In", order: 1 }],
      },
    ],
    createdBy,
    status: "published",
    totalDuration: 0,
    totalPrice: 0,
    curriculumMapping: {
      curriculumId,
      modules: [
        {
          moduleId,
          chapters: [
            {
              chapterId,
              lessons: [{ lessonId, title: manifest.lessonTitle || "Fade In" }],
            },
          ],
        },
      ],
    },
    createdAt: now,
    updatedAt: now,
  });

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

  const baseUrl = process.env.DC_APP_URL || "http://localhost:5173";
  const learnUrl =
    `${baseUrl}/learn/lesson/${lessonId}` +
    `?courseId=${courseId}&curriculumId=${curriculumId}&moduleId=${moduleId}&chapterId=${chapterId}`;

  console.log("\n=== Lesson 4 seeded to mortar-stage ===\n");
  console.log(`courseId=${courseId}`);
  console.log(`curriculumId=${curriculumId}`);
  console.log(`moduleId=${moduleId}`);
  console.log(`chapterId=${chapterId}`);
  console.log(`lessonId=${lessonId}`);
  console.log(`playlistItems=${playlist.length}`);
  console.log(`surveyCheckpoints=${checkpoints.length}`);
  console.log(`quizQuestions=${(quiz.questions || []).length}`);
  console.log(`\nLearn URL:\n${learnUrl}\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
