/**
 * Migrate ONE lesson's content from Thinkific into MORTAR.
 *
 * Pulls the lesson's Thinkific chapter (via the authenticated course-player API),
 * maps it to MORTAR shapes (html slides + survey checkpoints + quiz), and either
 * previews (default) or writes to Firestore (--write).
 *
 * Targets a lesson by its MORTAR module/lesson order (from course-ids.json):
 *   node migrate-lesson.js --module 1 --lesson 2              # preview "The Release Party"
 *   node migrate-lesson.js --module 1 --lesson 3 --write      # write "Expect the Unexpected"
 *
 * Writes (only with --write):
 *   curricula/{cur}/modules/{m}/chapters/{c}/lessons/{l}/lesson_content/*   (slides; replaces existing)
 *   …/lessons/{l}                          content_type = "media"
 *   courses/{courseId}/lessonSurveys/{lessonId}     { checkpoints: [...] }
 *   courses/{courseId}/lessonQuizzes/{lessonId}     { LessonQuiz }
 * Lessons stay is_published:false; course stays draft.
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const { loadDotEnv } = require("./thinkific-client");
const { fetchChapterItems, mapItemsToMortar, htmlToText } = require("./lib-content");
const { renderHtmlToPng, closeBrowser } = require("./lib-render");

loadDotEnv();

const REPO_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mortar-stage";
const DEFAULT_CREDS = path.join(REPO_ROOT, "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json");
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));

// Per-lesson manual edits, keyed by "module.lesson" (MORTAR order).
const LESSON_OVERRIDES = {
  "1.2": { skipContentNames: ["1.1 Legend"] }, // delete the icon Legend slide
};

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const WRITE = process.argv.includes("--write");
const MODULE_N = parseInt(arg("--module", "1"), 10);
const LESSON_N = parseInt(arg("--lesson", "1"), 10);

function initFirebase() {
  if (!admin.apps.length) {
    const envCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credsPath = envCreds && fs.existsSync(envCreds) ? envCreds : DEFAULT_CREDS;
    if (!fs.existsSync(credsPath)) throw new Error(`Credentials not found: ${credsPath}`);
    const sa = JSON.parse(fs.readFileSync(credsPath, "utf8").replace(/^﻿/, ""));
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: PROJECT_ID,
      storageBucket: `${PROJECT_ID}.firebasestorage.app`,
    });
  }
  return { db: admin.firestore(), bucket: admin.storage().bucket() };
}

/** Upload a buffer to Storage (public) and return its download URL + path. */
async function uploadBuffer(bucket, buffer, dest, contentType) {
  const file = bucket.file(dest);
  await file.save(buffer, {
    metadata: { contentType, cacheControl: "public, max-age=31536000" },
    resumable: false,
  });
  await file.makePublic();
  return { image_url: `https://storage.googleapis.com/${bucket.name}/${dest}`, storage_path: dest };
}

function findLesson() {
  const mod = IDS.modules.find((m) => m.order === MODULE_N);
  if (!mod) throw new Error(`No module with order ${MODULE_N} in course-ids.json`);
  const lesson = mod.lessons.find((l) => l.order === LESSON_N);
  if (!lesson) throw new Error(`No lesson order ${LESSON_N} in module ${MODULE_N}`);
  return { mod, lesson };
}

async function run() {
  const { mod, lesson } = findLesson();
  console.log(`\n=== Migrate M${MODULE_N}.${LESSON_N} "${lesson.title}"  ${WRITE ? "[WRITE]" : "[PREVIEW]"} ===`);
  if (!lesson.thinkificChapterId) {
    console.log("This lesson has no Thinkific chapter linked (nothing to migrate).");
    return;
  }
  console.log(`Thinkific chapter ${lesson.thinkificChapterId} → MORTAR lesson ${lesson.lessonId}\n`);

  const { items } = await fetchChapterItems(lesson.thinkificChapterId);
  console.log(`Fetched ${items.length} Thinkific content items:`);
  for (const it of items) console.log(`   - (${it.type}) ${it.content.name}`);

  const overrides = LESSON_OVERRIDES[`${MODULE_N}.${LESSON_N}`] || {};
  const { slides, checkpoints, quiz, flags } = mapItemsToMortar(items, overrides);

  const counts = slides.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
  console.log(`\n→ MORTAR mapping:`);
  console.log(
    `   slides: ${slides.length}  (image/png: ${counts.render || 0}, video: ${counts.video || 0}, gif: ${counts.gif || 0})`
  );
  slides.forEach((s, i) => {
    const detail =
      s.kind === "render" ? `${s.html.length} chars → PNG`
      : s.kind === "video" ? `YouTube ${s.videoId}`
      : `GIF ${s.url.split("/").pop()}`;
    console.log(`        [${i}] (${s.kind}) ${s._name}  — ${detail}`);
  });
  console.log(`   survey checkpoints: ${checkpoints.length}`);
  checkpoints.forEach((c) =>
    console.log(`        "${c.title}" (${c._source}) after slide ${c.afterSlideIndex}, ${c.questions.length} question(s)`)
  );
  if (quiz) {
    console.log(`   quiz: ${quiz.questions.length} questions, pass ${quiz.passPercentage}%`);
    quiz.questions.forEach((q) =>
      console.log(`        Q${q.order + 1}: ${q.question.slice(0, 60)}…  ✓${q.correctAnswer}`)
    );
  } else {
    console.log(`   quiz: none`);
  }
  if (flags.length) {
    console.log(`\n⚠ Flags (${flags.length}):`);
    flags.forEach((f) => console.log(`   - ${f}`));
  }

  if (!WRITE) {
    console.log(`\n(preview only — re-run with --write to apply)\n`);
    return;
  }

  // ── Write ──────────────────────────────────────────────────────────────────
  const { db, bucket } = initFirebase();
  const now = FieldValue.serverTimestamp();
  const lessonPath = `curricula/${IDS.curriculumId}/modules/${mod.moduleId}/chapters/${mod.chapterId}/lessons/${lesson.lessonId}`;
  const contentRef = db.collection(`${lessonPath}/lesson_content`);
  const storageBase = `curriculum_content/${IDS.curriculumId}/${mod.moduleId}/${lesson.lessonId}/screens`;

  // Build the MORTAR media slides (render PNGs, re-host GIFs, classify videos).
  const mediaSlides = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (s.kind === "render") {
      const png = await renderHtmlToPng(s.html);
      const up = await uploadBuffer(bucket, png, `${storageBase}/slide_${i}.png`, "image/png");
      const slide = { order: i, type: "image", alt_text: s._name, ...up };
      if (s.links && s.links.length) slide.links = s.links;
      mediaSlides.push(slide);
      process.stdout.write(
        `  [${i}] rendered PNG (${Math.round(png.length / 1024)}KB)${s.links?.length ? ` +${s.links.length} link(s)` : ""}\n`
      );
    } else if (s.kind === "gif") {
      const res = await fetch(s.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const up = await uploadBuffer(bucket, buf, `${storageBase}/slide_${i}.gif`, "image/gif");
      mediaSlides.push({ order: i, type: "image", alt_text: s._name, ...up });
      process.stdout.write(`  [${i}] re-hosted GIF (${Math.round(buf.length / 1024)}KB)\n`);
    } else if (s.kind === "video") {
      mediaSlides.push({
        order: i,
        type: "video",
        video_provider: s.provider || "youtube",
        video_id: s.videoId,
        video_url: s.url,
        caption: s._name,
      });
      process.stdout.write(`  [${i}] video slide (YouTube ${s.videoId})\n`);
    }
  }

  // Replace existing slides, then write the new ones in order.
  const existing = await contentRef.get();
  const delBatch = db.batch();
  existing.forEach((d) => delBatch.delete(d.ref));
  await delBatch.commit();
  for (const ms of mediaSlides) {
    await contentRef.add({ ...ms, created_at: now, updated_at: now });
  }
  await db.doc(lessonPath).set(
    { content_type: "media", updated_at: now },
    { merge: true }
  );
  // Verify every intended slide actually landed (guards against silent drops).
  const after = await contentRef.get();
  if (after.size !== mediaSlides.length) {
    throw new Error(
      `SLIDE COUNT MISMATCH: intended ${mediaSlides.length} but Firestore has ${after.size}. Re-run this lesson.`
    );
  }
  console.log(`  wrote ${mediaSlides.length} media slides + set content_type=media (verified ${after.size})`);

  if (checkpoints.length) {
    const clean = checkpoints.map(({ _source, ...c }) => c);
    await db.doc(`courses/${IDS.courseId}/lessonSurveys/${lesson.lessonId}`).set(
      { checkpoints: clean, updated_at: now },
      { merge: true }
    );
    console.log(`  wrote ${checkpoints.length} survey checkpoint(s)`);
  }
  if (quiz) {
    await db.doc(`courses/${IDS.courseId}/lessonQuizzes/${lesson.lessonId}`).set(
      { ...quiz, updated_at: now },
      { merge: true }
    );
    console.log(`  wrote quiz (${quiz.questions.length} questions)`);
  }
  console.log(`\n✓ Lesson content written (lesson stays unpublished).\n`);
}

run()
  .then(() => closeBrowser())
  .catch(async (e) => {
    await closeBrowser().catch(() => {});
    console.error(e.message || e);
    process.exit(1);
  });
