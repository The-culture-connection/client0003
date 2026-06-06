/**
 * Add a lesson (from exports manifest) to an existing course on mortar-stage.
 *
 * Usage:
 *   node infra/scripts/add-lesson-to-course.js tools/lesson-migrate/lesson-5.config.json
 *   LESSON_CONFIG=... GOOGLE_APPLICATION_CREDENTIALS=... node infra/scripts/add-lesson-to-course.js
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

function loadConfigAndManifest() {
  const configArg =
    process.env.LESSON_CONFIG || process.argv[2] || "tools/lesson-migrate/lesson-5.config.json";
  const configPath = path.isAbsolute(configArg)
    ? configArg
    : path.join(REPO_ROOT, configArg);
  const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const manifestPath = path.join(REPO_ROOT, cfg.exportDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest. Run export + build-manifest first: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return { cfg, manifest, manifestPath };
}

async function uploadScreenPng(localPath, curriculumId, moduleId, lessonId, name) {
  const bucket = admin.storage().bucket();
  const dest = `curriculum_content/${curriculumId}/${moduleId}/${lessonId}/screens/${name}`;
  await bucket.upload(localPath, {
    destination: dest,
    metadata: { contentType: "image/png", cacheControl: "public, max-age=31536000" },
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
  const { cfg, manifest } = loadConfigAndManifest();
  const courseIds = manifest.course || cfg.course;
  if (!courseIds?.courseId) {
    throw new Error("manifest.course or config.course required (courseId, curriculumId, moduleId, chapterId)");
  }

  const playlist = manifest.playlist || manifest.screens;
  if (!playlist?.length) throw new Error("manifest has no playlist");

  const db = admin.firestore();
  const now = FieldValue.serverTimestamp();
  const createdBy = process.env.SEED_CREATED_BY_UID || "add-lesson-to-course";

  const { courseId, curriculumId } = courseIds;
  const lessonOrder = courseIds.lessonOrder ?? 2;
  const moduleLessonOrder = courseIds.moduleLessonOrder ?? lessonOrder;
  const lessonTitle = manifest.lessonTitle || cfg.lessonTitle || `Lesson ${cfg.lessonNumber}`;

  let moduleId = courseIds.moduleId;
  let chapterId = courseIds.chapterId;
  const createModule = courseIds.createModule;

  if (createModule && (!moduleId || !chapterId)) {
    const curriculumRef = db.doc(`curricula/${curriculumId}`);
    const moduleRef = curriculumRef.collection("modules").doc();
    const chapterRef = moduleRef.collection("chapters").doc();
    moduleId = moduleRef.id;
    chapterId = chapterRef.id;

    await moduleRef.set({
      title: createModule.moduleTitle || `Module ${createModule.moduleOrder || 2}`,
      description: createModule.moduleDescription || "",
      order: createModule.moduleOrder ?? 2,
      created_at: now,
      updated_at: now,
    });

    await chapterRef.set({
      title: createModule.chapterTitle || createModule.moduleTitle || "Chapter 1",
      order: 1,
      created_at: now,
      updated_at: now,
    });

    console.log(`Created module ${moduleId} + chapter ${chapterId}`);
  }

  if (!moduleId || !chapterId) {
    throw new Error("course.moduleId and course.chapterId required (or course.createModule)");
  }

  const chapterRef = db.doc(
    `curricula/${curriculumId}/modules/${moduleId}/chapters/${chapterId}`
  );
  const chapterSnap = await chapterRef.get();
  if (!chapterSnap.exists) {
    throw new Error(`Chapter not found: ${chapterRef.path}`);
  }

  const lessonRef = chapterRef.collection("lessons").doc();
  const lessonId = lessonRef.id;
  const pngDir = path.join(REPO_ROOT, cfg.exportDir, "png");

  await lessonRef.set({
    title: lessonTitle,
    order: lessonOrder,
    theme: "dark_slide",
    is_published: true,
    content_type: "media",
    screen_mode: "immersive",
    source_type: "pptx_import",
    import_status: "ready",
    source_file_name: path.basename(cfg.sourcePptx || "Lesson.pptx"),
    created_by_uid: createdBy,
    curriculum_id: curriculumId,
    module_id: moduleId,
    chapter_id: chapterId,
    created_at: now,
    updated_at: now,
  });

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
    const localPath = path.join(pngDir, item.fileName);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Missing PNG: ${localPath}`);
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
      alt_text: `Lesson ${cfg.lessonNumber} — slide ${item.sourceSlide}`,
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
  const quizEnabled = quiz.enabled !== false && (quiz.questions || []).length > 0;
  await db.doc(`courses/${courseId}/lessonQuizzes/${lessonId}`).set({
    enabled: quizEnabled,
    maxAttempts: quiz.maxAttempts ?? 3,
    passPercentage: quiz.passPercentage ?? 70,
    questions: quizEnabled ? quiz.questions || [] : [],
    updated_at: now,
  });

  const courseRef = db.doc(`courses/${courseId}`);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) throw new Error(`Course not found: ${courseId}`);
  const course = courseSnap.data();

  const modules = [...(course.modules || [])];
  const targetModuleOrder = createModule?.moduleOrder ?? courseIds.moduleOrder ?? 2;
  let modIdx = modules.findIndex((m) => (m.order ?? 0) === targetModuleOrder);
  if (modIdx < 0 && createModule) {
    modules.push({
      title: createModule.moduleTitle || "Verse Two",
      order: targetModuleOrder,
      price: 0,
      durationMonths: 0,
      lessons: [],
    });
    modules.sort((a, b) => (a.order || 0) - (b.order || 0));
    modIdx = modules.findIndex((m) => (m.order ?? 0) === targetModuleOrder);
  }
  if (modIdx < 0) modIdx = 0;

  const mod = modules[modIdx] || {
    title: "Verse One: Foundations",
    order: 1,
    price: 0,
    durationMonths: 0,
    lessons: [],
  };
  const lessons = [...(mod.lessons || [])];
  if (!lessons.some((l) => l.lessonId === lessonId || (l.title === lessonTitle && l.order === moduleLessonOrder))) {
    lessons.push({ title: lessonTitle, order: moduleLessonOrder });
    lessons.sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  mod.lessons = lessons;
  modules[modIdx] = mod;

  const mapping = course.curriculumMapping || {};
  const mapModules = [...(mapping.modules || [])];
  let mapModIdx = mapModules.findIndex((m) => m.moduleId === moduleId);
  if (mapModIdx < 0 && createModule) {
    mapModules.push({ moduleId, chapters: [{ chapterId, lessons: [] }] });
    mapModIdx = mapModules.length - 1;
  }
  if (mapModIdx < 0) mapModIdx = modIdx;

  const mapMod = mapModules[mapModIdx] || {
    moduleId,
    chapters: [{ chapterId, lessons: [] }],
  };
  mapMod.moduleId = moduleId;
  const chapters = [...(mapMod.chapters || [])];
  const chIdx = chapters.findIndex((c) => c.chapterId === chapterId);
  const ch =
    chIdx >= 0
      ? { ...chapters[chIdx] }
      : { chapterId, lessons: [] };
  const mapLessons = [...(ch.lessons || [])];
  if (!mapLessons.some((l) => l.lessonId === lessonId)) {
    mapLessons.push({ lessonId, title: lessonTitle });
    mapLessons.sort((a, b) => {
      const la = lessons.find((l) => l.title === a.title);
      const lb = lessons.find((l) => l.title === b.title);
      return (la?.order || 0) - (lb?.order || 0);
    });
  }
  ch.lessons = mapLessons;
  if (chIdx >= 0) chapters[chIdx] = ch;
  else chapters.push(ch);
  mapMod.chapters = chapters;
  mapModules[mapModIdx] = mapMod;

  await courseRef.set(
    {
      modules,
      curriculumMapping: {
        ...mapping,
        curriculumId: mapping.curriculumId || curriculumId,
        modules: mapModules,
      },
      updatedAt: now,
    },
    { merge: true }
  );

  const resultPath = path.join(REPO_ROOT, cfg.exportDir, "SEED_RESULT.md");
  const learnUrl =
    `${process.env.DC_APP_URL || "http://localhost:5173"}/learn/lesson/${lessonId}` +
    `?courseId=${courseId}&curriculumId=${curriculumId}&moduleId=${moduleId}&chapterId=${chapterId}`;

  const md = `# Lesson ${cfg.lessonNumber} — added to course

Added: ${new Date().toISOString().slice(0, 10)}

| Field | Value |
|-------|-------|
| **courseId** | \`${courseId}\` |
| **curriculumId** | \`${curriculumId}\` |
| **moduleId** | \`${moduleId}\` |
| **chapterId** | \`${chapterId}\` |
| **lessonId** | \`${lessonId}\` |

## Content

- **${order} playlist items** (images + YouTube; survey UI slides ${(manifest.skippedSurveyUiSlides || []).join(", ")} skipped; quiz UI slide ${quiz.canvaSlide ?? cfg.quizUiSlide} skipped)
- **${checkpoints.length} survey checkpoints**
- **${(quiz.questions || []).length} quiz questions** (edit in Course Builder if placeholders)

## Learn URL

\`\`\`
${learnUrl}
\`\`\`

## Re-run

\`\`\`bash
npm run export:lesson5-screens
npm run add:lesson5
\`\`\`
`;
  fs.writeFileSync(resultPath, md);

  console.log("\n=== Lesson added to course ===\n");
  console.log(`courseId=${courseId}`);
  console.log(`lessonId=${lessonId}`);
  console.log(`lesson_content items: ${order}`);
  console.log(`surveys: ${checkpoints.length}`);
  console.log(`quiz questions: ${(quiz.questions || []).length}`);
  console.log(`\nLearn URL:\n${learnUrl}\n`);
  console.log(`Wrote ${resultPath}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
