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
const { ThinkificPlayer } = require("./thinkific-player");
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

  // Gap-fix 1.3: prepend the module's Verse divider page as slide 0 of the
  // module's FIRST lesson (zero content loss — Thinkific shows these as
  // standalone chapters; MORTAR has no chapter-divider concept).
  if (LESSON_N === 1 && IDS.moduleIntroChapters) {
    const tail = (mod.title.split(":")[1] || mod.title).trim().toLowerCase();
    const introEntry = Object.entries(IDS.moduleIntroChapters).find(([k]) =>
      k.toLowerCase().includes(tail)
    );
    if (introEntry) {
      console.log(`\nGap-fix 1.3: fetching Verse divider chapter ${introEntry[1]} ("${introEntry[0]}")…`);
      const introRes = await fetchChapterItems(String(introEntry[1]));
      const introMap = mapItemsToMortar(introRes.items, {});
      if (introMap.checkpoints.length || introMap.quiz)
        flags.push(`Verse divider chapter has surveys/quiz — NOT expected; skipped those, kept slides only.`);
      if (introMap.slides.length) {
        slides.unshift(...introMap.slides.map((s) => ({ ...s, _name: `[Verse divider] ${s._name}` })));
        for (const c of checkpoints) c.afterSlideIndex += introMap.slides.length;
        console.log(`   prepended ${introMap.slides.length} divider slide(s).`);
      }
      flags.push(...introMap.flags.map((f) => `[Verse divider] ${f}`));
    } else {
      flags.push(`No Verse divider chapter matched module "${mod.title}" in moduleIntroChapters.`);
    }
  }

  // Gap-fix 1.2: resolve Thinkific-hosted /play/ embeds (Wistia-backed) into
  // hosted video slides via wistia-map.json ({ "<wistiaId>": { video_url, title } },
  // filled by the re-host step). Unresolved ones are flagged, not dropped silently.
  const WISTIA_MAP_PATH = path.join(__dirname, "wistia-map.json");
  const wistiaMap = fs.existsSync(WISTIA_MAP_PATH) ? JSON.parse(fs.readFileSync(WISTIA_MAP_PATH, "utf8")) : {};
  if (slides.some((s) => s.kind === "thinkific_video")) {
    const player = new ThinkificPlayer();
    for (const s of slides) {
      if (s.kind !== "thinkific_video") continue;
      const pathname = s.url.replace(/^https?:\/\/[^/]+/, "");
      const page = await player.get(pathname);
      const body = page.__nonJson ? page.body : "";
      const wm = body.match(/wistia_async_([a-z0-9]+)/i) || body.match(/fast\.wistia\.(?:com|net)\/embed\/(?:iframe|medias)\/([a-z0-9]+)/i);
      const title = (body.match(/<title>([^<]*)<\/title>/i) || [])[1] || s._name;
      if (!wm) {
        flags.push(`Thinkific /play/ embed in "${s._name}" has no Wistia id — NEEDS REVIEW (kept as flag, not migrated).`);
        continue;
      }
      s.wistiaId = wm[1];
      s._title = title.trim();
      const mapped = wistiaMap[s.wistiaId];
      if (mapped && mapped.video_url) {
        s.kind = "video";
        s.provider = "hosted";
        s.url = mapped.video_url;
        s.videoId = null;
      } else {
        flags.push(`Wistia video ${s.wistiaId} ("${s._title}") in "${s._name}" not yet re-hosted — add it to wistia-map.json (run the Wistia re-host step) before --write.`);
      }
    }
  }

  const counts = slides.reduce((a, s) => ((a[s.kind] = (a[s.kind] || 0) + 1), a), {});
  console.log(`\n→ MORTAR mapping:`);
  console.log(
    `   slides: ${slides.length}  (image/png: ${counts.render || 0}, video: ${counts.video || 0}, gif: ${counts.gif || 0})`
  );
  slides.forEach((s, i) => {
    const detail =
      s.kind === "render" ? `${s.html.length} chars → PNG${s._downloads ? ` +${s._downloads.length} download(s) to re-host` : ""}`
      : s.kind === "video" ? (s.provider === "hosted" ? `hosted ${s.url.split("/").pop()}` : `YouTube ${s.videoId}`)
      : s.kind === "thinkific_video" ? `Wistia ${s.wistiaId || "?"} (${s._title || "unresolved"}) — PENDING RE-HOST`
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

  // Gap-fix 1.1: re-host Download files BEFORE rendering — fetch each signed
  // Thinkific download_url and upload to Storage, then swap the URL in the
  // slide html + link buttons so nothing links to an expiring URL.
  const dlBase = `curriculum_content/${IDS.curriculumId}/${mod.moduleId}/${lesson.lessonId}/downloads`;
  for (const s of slides) {
    if (s.kind !== "render" || !s._downloads) continue;
    for (const dl of s._downloads) {
      const res = await fetch(dl.url);
      if (!res.ok) throw new Error(`Download fetch failed (${res.status}) for "${dl.label}"`);
      const buf = Buffer.from(await res.arrayBuffer());
      const ctype = res.headers.get("content-type") || "application/octet-stream";
      const up = await uploadBuffer(bucket, buf, `${dlBase}/${dl.file_name}`, ctype);
      s.html = s.html.split(dl.url).join(up.image_url);
      if (s.links) s.links = s.links.map((l) => (l.url === dl.url ? { ...l, url: up.image_url } : l));
      console.log(`  re-hosted download "${dl.label}" (${Math.round(buf.length / 1024)}KB) → ${up.storage_path}`);
    }
  }

  // Cache-proofing: slide files are content-addressed (md5 in the filename)
  // and the whole screens/ prefix is cleared first. Re-renders therefore get
  // NEW URLs — no stale browser/CDN copies (old names carried max-age=1y).
  const crypto = require("crypto");
  await bucket.deleteFiles({ prefix: `${storageBase}/` }).catch(() => {});

  // Build the MORTAR media slides (render PNGs, re-host GIFs, classify videos).
  const mediaSlides = [];
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    if (s.kind === "render") {
      const png = await renderHtmlToPng(s.html);
      const hash = crypto.createHash("md5").update(png).digest("hex").slice(0, 8);
      const up = await uploadBuffer(bucket, png, `${storageBase}/slide_${i}_${hash}.png`, "image/png");
      const slide = { order: i, type: "image", alt_text: s._name, ...up };
      if (s.links && s.links.length) slide.links = s.links;
      mediaSlides.push(slide);
      process.stdout.write(
        `  [${i}] rendered PNG (${Math.round(png.length / 1024)}KB)${s.links?.length ? ` +${s.links.length} link(s)` : ""}\n`
      );
    } else if (s.kind === "gif") {
      const res = await fetch(s.url);
      const buf = Buffer.from(await res.arrayBuffer());
      const ghash = crypto.createHash("md5").update(buf).digest("hex").slice(0, 8);
      const up = await uploadBuffer(bucket, buf, `${storageBase}/slide_${i}_${ghash}.gif`, "image/gif");
      mediaSlides.push({ order: i, type: "image", alt_text: s._name, ...up });
      process.stdout.write(`  [${i}] re-hosted GIF (${Math.round(buf.length / 1024)}KB)\n`);
    } else if (s.kind === "video") {
      const vs = {
        order: i,
        type: "video",
        video_provider: s.provider || "youtube",
        video_url: s.url,
        caption: s._title || s._name,
      };
      if (s.videoId) vs.video_id = s.videoId;
      mediaSlides.push(vs);
      process.stdout.write(`  [${i}] video slide (${vs.video_provider} ${s.videoId || s.url.split("/").pop()})\n`);
    } else if (s.kind === "thinkific_video") {
      throw new Error(
        `Slide [${i}] "${s._name}" is an un-re-hosted Wistia video (${s.wistiaId || "unresolved"}). ` +
          `Run the Wistia re-host step to fill wistia-map.json, then re-run. (Write aborted so nothing is lost.)`
      );
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

  // Gap-fix 1.6: ALWAYS write surveys + quiz docs as full replacements (no
  // merge) so a re-run can never leave stale checkpoints/questions behind —
  // any lesson is safely re-runnable end-to-end.
  const clean = checkpoints.map(({ _source, ...c }) => c);
  await db.doc(`courses/${IDS.courseId}/lessonSurveys/${lesson.lessonId}`).set(
    { checkpoints: clean, updated_at: now }
  );
  console.log(`  wrote survey doc (${checkpoints.length} checkpoint(s))`);
  const quizDoc = quiz
    ? { ...quiz, updated_at: now }
    : { enabled: false, maxAttempts: 3, passPercentage: 100, questions: [], updated_at: now };
  await db.doc(`courses/${IDS.courseId}/lessonQuizzes/${lesson.lessonId}`).set(quizDoc);
  console.log(`  wrote quiz doc (${quiz ? quiz.questions.length : 0} questions${quiz ? "" : "; disabled"})`);
  console.log(`\n✓ Lesson content written (lesson stays unpublished).\n`);
}

run()
  .then(() => closeBrowser())
  .catch(async (e) => {
    await closeBrowser().catch(() => {});
    console.error(e.message || e);
    process.exit(1);
  });
