#!/usr/bin/env node
/**
 * create-beta-preview-course.js — PURELY ADDITIVE.
 *
 * Copies an existing course doc (default: "Digital Curriculum Student Demo (1)")
 * into a NEW admin-only course "MORTAR Masters Beta Preview" containing only the
 * first module and that module's first 2 lessons.
 *
 * - Never writes to, renames, or deletes the source course.
 * - Never writes to /curricula (lesson content is shared by reference, exactly
 *   how the existing demo course works).
 * - assignedUserIds: []  (nobody is assigned)
 * - assignedRoles: admin-only  (visible to you in the admin portal)
 * - Idempotent: fixed destination doc id, safe to re-run.
 *
 * Usage:
 *   node create-beta-preview-course.js            # DRY RUN (default) — prints the payload
 *   node create-beta-preview-course.js --apply    # actually writes
 *   [--source-id <courseId>] [--source-title "..."] [--dest-id <id>] [--lessons 2]
 *   [--strip-badges]   # clear module completionBadgeIds on the copy (see warning)
 *
 * Credentials: set GOOGLE_APPLICATION_CREDENTIALS to a mortar-stage service
 * account JSON, or drop the JSON anywhere in the repo root / this folder and it
 * will be auto-detected.
 */
const fs = require("fs");
const path = require("path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n, d) => {
  const i = argv.indexOf(n);
  return i === -1 ? d : argv[i + 1];
};
const APPLY = argv.includes("--apply");
const STRIP_BADGES = argv.includes("--strip-badges");
const SOURCE_ID = flag("--source-id", null);
const SOURCE_TITLE = flag("--source-title", "Digital Curriculum Student Demo (1)");
const DEST_ID = flag("--dest-id", "mortarMastersBetaPreview");
const DEST_TITLE = flag("--dest-title", "MORTAR Masters Beta Preview");
const LESSON_COUNT = parseInt(flag("--lessons", "2"), 10);
const MODULE_INDEX = parseInt(flag("--module-index", "0"), 10);
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "mortar-stage";

// ── credentials ──────────────────────────────────────────────────────────────
function findKey() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const dirs = [__dirname, path.resolve(__dirname, "..", ".."), path.resolve(__dirname, ".."), process.cwd()];
  for (const d of dirs) {
    let names = [];
    try { names = fs.readdirSync(d); } catch { continue; }
    for (const n of names) {
      if (!/\.json$/i.test(n)) continue;
      if (!/adminsdk|service.?account/i.test(n)) continue;
      try {
        const j = JSON.parse(fs.readFileSync(path.join(d, n), "utf8"));
        if (j.type === "service_account" && j.project_id === PROJECT_ID) return path.join(d, n);
      } catch {}
    }
  }
  return null;
}
const KEY = findKey();
if (!KEY) {
  console.error(`No ${PROJECT_ID} service-account JSON found. Set GOOGLE_APPLICATION_CREDENTIALS.`);
  process.exit(1);
}
const sa = JSON.parse(fs.readFileSync(KEY, "utf8"));
initializeApp({ credential: cert(sa), projectId: PROJECT_ID });
const db = getFirestore();

const log = (...a) => console.log(...a);

(async () => {
  log(`project      : ${PROJECT_ID}`);
  log(`credentials  : ${path.basename(KEY)} (${sa.client_email})`);
  log(`mode         : ${APPLY ? "APPLY (writes)" : "DRY RUN (no writes)"}`);
  log("");

  // ── 1. locate source ───────────────────────────────────────────────────────
  let srcDoc;
  if (SOURCE_ID) {
    srcDoc = await db.doc(`courses/${SOURCE_ID}`).get();
    if (!srcDoc.exists) throw new Error(`courses/${SOURCE_ID} not found`);
  } else {
    const all = await db.collection("courses").get();
    const norm = (s) => String(s || "").trim().toLowerCase();
    const matches = all.docs.filter((d) => norm(d.data().title) === norm(SOURCE_TITLE));
    if (matches.length === 0) {
      log("Courses in this project:");
      all.docs.forEach((d) => log(`  - ${d.id} | "${d.data().title}"`));
      throw new Error(`No course titled "${SOURCE_TITLE}"`);
    }
    if (matches.length > 1) {
      matches.forEach((d) => log(`  ambiguous: ${d.id} | "${d.data().title}"`));
      throw new Error(`Multiple courses titled "${SOURCE_TITLE}" — pass --source-id`);
    }
    srcDoc = matches[0];
  }
  const src = srcDoc.data();
  log(`source       : courses/${srcDoc.id} — "${src.title}"`);
  log(`               modules=${(src.modules || []).length} status=${src.status} roles=${JSON.stringify(src.assignedRoles)} assignees=${(src.assignedUserIds || []).length}`);

  // snapshot the source for the untouched-check
  const snapPath = path.join(__dirname, `source-snapshot-${srcDoc.id}.json`);
  fs.writeFileSync(snapPath, JSON.stringify(src, null, 2));
  log(`               snapshot written → ${path.basename(snapPath)}`);

  if (srcDoc.id === DEST_ID) throw new Error("Destination id equals source id — refusing.");

  // ── 2. build the trimmed module + mapping ──────────────────────────────────
  const srcMod = (src.modules || [])[MODULE_INDEX];
  if (!srcMod) throw new Error(`Source has no module at index ${MODULE_INDEX}`);
  const srcMapMod = src.curriculumMapping?.modules?.[MODULE_INDEX];
  if (!srcMapMod) throw new Error(`Source curriculumMapping has no module at index ${MODULE_INDEX}`);

  // LessonPlayer pairs curriculumMapping.modules[i] with modules[i], and walks
  // mapping chapters in order — so trim both sides to the same first N lessons.
  const keptMapChapters = [];
  const keptLessonIds = [];
  for (const ch of srcMapMod.chapters || []) {
    if (keptLessonIds.length >= LESSON_COUNT) break;
    const take = (ch.lessons || []).slice(0, LESSON_COUNT - keptLessonIds.length);
    if (!take.length) continue;
    keptLessonIds.push(...take.map((l) => l.lessonId));
    keptMapChapters.push({ chapterId: ch.chapterId, lessons: take.map((l) => ({ lessonId: l.lessonId, title: l.title })) });
  }
  if (keptLessonIds.length < LESSON_COUNT)
    throw new Error(`Module has only ${keptLessonIds.length} mapped lessons; asked for ${LESSON_COUNT}`);

  const keptLessons = (srcMod.lessons || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .slice(0, LESSON_COUNT)
    .map((l, i) => ({ ...l, order: i + 1 }));

  const destModule = { ...srcMod, order: 1, lessons: keptLessons };
  if (STRIP_BADGES) destModule.completionBadgeIds = [];

  const destCourse = {
    title: DEST_TITLE,
    description:
      "Beta preview of MORTAR Masters: the first module (" +
      (srcMod.title || "Module 1") +
      ") limited to its first " +
      LESSON_COUNT +
      " lessons. Admin-only; no assignees. Copied from \"" +
      src.title +
      "\".",
    thumbnailUrl: src.thumbnailUrl ?? null,
    currency: src.currency ?? "USD",
    totalPrice: 0,
    totalDuration: 0,
    modules: [destModule],
    curriculumMapping: {
      curriculumId: src.curriculumMapping.curriculumId,
      modules: [{ moduleId: srcMapMod.moduleId, chapters: keptMapChapters }],
    },
    assignedRoles: src.assignedRoles && src.assignedRoles.length ? src.assignedRoles : ["Admin", "admin", "superAdmin"],
    assignedUserIds: [],
    status: "published", // published + admin-only roles = visible to you, nobody else
    createdBy: "beta-preview-copy",
  };
  if (destCourse.thumbnailUrl === null) delete destCourse.thumbnailUrl;

  log("");
  log(`destination  : courses/${DEST_ID} — "${DEST_TITLE}"`);
  log(`module       : "${destModule.title}" (moduleId ${srcMapMod.moduleId})`);
  keptMapChapters.forEach((ch) =>
    ch.lessons.forEach((l, i) => log(`  lesson ${i + 1}  : ${l.title}  [${l.lessonId}] chapter ${ch.chapterId}`))
  );
  log(`roles        : ${JSON.stringify(destCourse.assignedRoles)}   assignedUserIds: []`);
  log(`badges       : module completionBadgeIds = ${JSON.stringify(destModule.completionBadgeIds || [])}${STRIP_BADGES ? " (stripped)" : ""}`);

  // ── 3. per-lesson subcollections on the course doc ─────────────────────────
  const subcols = await srcDoc.ref.listCollections();
  const copyPlan = [];
  for (const col of subcols) {
    for (const lid of keptLessonIds) {
      const d = await col.doc(lid).get();
      if (d.exists) copyPlan.push({ col: col.id, id: lid, data: d.data() });
    }
  }
  log(`subcollections on source: ${subcols.map((c) => c.id).join(", ") || "(none)"}`);
  copyPlan.forEach((p) => log(`  copy ${p.col}/${p.id}`));

  // ── 4. sanity: the mapped lessons exist and are published ──────────────────
  const cid = destCourse.curriculumMapping.curriculumId;
  for (const ch of keptMapChapters) {
    for (const l of ch.lessons) {
      const p = `curricula/${cid}/modules/${srcMapMod.moduleId}/chapters/${ch.chapterId}/lessons/${l.lessonId}`;
      const d = await db.doc(p).get();
      const slides = d.exists ? (await d.ref.collection("lesson_content").get()).size : 0;
      log(`  check ${l.lessonId}: exists=${d.exists} is_published=${d.exists ? d.data().is_published : "-"} content_items=${slides}`);
    }
  }

  if (!APPLY) {
    log("");
    log("DRY RUN — nothing written. Re-run with --apply to create the course.");
    log(JSON.stringify(destCourse, null, 2).slice(0, 4000));
    process.exit(0);
  }

  // ── 5. write ───────────────────────────────────────────────────────────────
  const existing = await db.doc(`courses/${DEST_ID}`).get();
  await db.doc(`courses/${DEST_ID}`).set({
    ...destCourse,
    createdAt: existing.exists ? existing.data().createdAt || FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  log(`✓ courses/${DEST_ID} ${existing.exists ? "updated" : "created"}`);
  for (const p of copyPlan) {
    await db.doc(`courses/${DEST_ID}/${p.col}/${p.id}`).set(p.data);
    log(`✓ copied ${p.col}/${p.id}`);
  }

  // ── 6. verify source untouched ─────────────────────────────────────────────
  const after = (await db.doc(`courses/${srcDoc.id}`).get()).data();
  const same = JSON.stringify(after) === JSON.stringify(JSON.parse(fs.readFileSync(snapPath, "utf8")));
  log(same ? `✓ source courses/${srcDoc.id} unchanged` : `✗ SOURCE CHANGED — investigate!`);
  process.exit(same ? 0 : 2);
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
