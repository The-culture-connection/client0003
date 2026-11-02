/**
 * MORTAR MASTERS course update (Nov 2026).
 *
 *   1. Welcome video becomes its own free module ("Welcome", order 0) instead of
 *      the first lesson of First Verse. The lesson keeps its id, so learner
 *      progress carries over; its content is copied to the new module's path.
 *      No certificate is issued for the Welcome module.
 *   2. Every paid module is priced at $75 and the course gets a $200 bundle.
 *   3. End-of-module surveys ("SURVEY" / "Post-Class Survey" on the last lesson
 *      of each module) are disabled — not deleted, so an admin can re-enable them.
 *   4. Admin and superAdmin are added to the course's assigned roles, alongside
 *      students.
 *
 * Dry run by default. Writes a JSON backup of everything it touches before
 * changing anything.
 *
 * Usage (from the repo root):
 *   node infra/scripts/migrate-mortar-masters-nov-2026.js --project mortar-stage --creds <service-account.json>
 *   node infra/scripts/migrate-mortar-masters-nov-2026.js --project mortar-stage --creds <file> --apply
 *   Optional: --course <courseId>   (default: the course whose title contains "MORTAR MASTERS")
 */

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

const MODULE_PRICE = 75;
const BUNDLE_PRICE = 200;
const ADMIN_ROLES = ["Admin", "superAdmin"];
const WELCOME_TITLE = "Welcome";
const WELCOME_DESCRIPTION =
  "Start here — a free welcome video introducing the MORTAR Entrepreneurship Academy and how the course works.";
/** Checkpoint titles treated as the end-of-module survey (last lesson of a module only). */
const END_OF_MODULE_SURVEY_TITLE = /^\s*(survey|post-class survey|end[- ]of[- ]module survey)\s*$/i;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const APPLY = process.argv.includes("--apply");
const PROJECT_ID = arg("--project");
const CREDS = arg("--creds");
const COURSE_ARG = arg("--course");

if (!PROJECT_ID || !CREDS) {
  console.error("Required: --project <firebase project id> --creds <service account json>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(CREDS))),
  projectId: PROJECT_ID,
});
const db = admin.firestore();
const {FieldValue} = admin.firestore;

const log = (...a) => console.log(APPLY ? "[apply]" : "[dry-run]", ...a);

/** Copy a document and all of its subcollections, recursively. */
async function copyDocTree(srcRef, dstRef, counter) {
  const snap = await srcRef.get();
  if (snap.exists) {
    counter.docs++;
    if (APPLY) await dstRef.set(snap.data());
  }
  const subs = await srcRef.listCollections();
  for (const sub of subs) {
    const docs = await sub.listDocuments();
    for (const d of docs) {
      await copyDocTree(d, dstRef.collection(sub.id).doc(d.id), counter);
    }
  }
}

async function findCourse() {
  if (COURSE_ARG) {
    const s = await db.collection("courses").doc(COURSE_ARG).get();
    if (!s.exists) throw new Error(`Course ${COURSE_ARG} not found`);
    return s;
  }
  const all = await db.collection("courses").get();
  const matches = all.docs.filter((d) => /mortar masters/i.test(String(d.data().title ?? "")));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one MORTAR MASTERS course, found ${matches.length}: ` +
        matches.map((d) => `${d.id} (${d.data().title})`).join(", ") +
        ". Pass --course <id>."
    );
  }
  return matches[0];
}

async function main() {
  const courseSnap = await findCourse();
  const courseRef = courseSnap.ref;
  const course = courseSnap.data();
  const mapping = course.curriculumMapping;
  if (!mapping?.curriculumId) throw new Error("Course has no curriculumMapping");
  const cid = mapping.curriculumId;
  log(`Course ${courseRef.id} "${course.title}" · curriculum ${cid}`);

  // Modules and mapping rows are aligned by index in display order.
  const modules = [...(course.modules ?? [])];
  const mapModules = [...(mapping.modules ?? [])];
  if (modules.length !== mapModules.length) {
    throw new Error(`modules (${modules.length}) and mapping (${mapModules.length}) lengths differ`);
  }

  // ── Backup ────────────────────────────────────────────────────────────────
  const surveysSnap = await courseRef.collection("lessonSurveys").get();
  const backup = {
    project: PROJECT_ID,
    takenAt: new Date().toISOString(),
    courseId: courseRef.id,
    course,
    lessonSurveys: Object.fromEntries(surveysSnap.docs.map((d) => [d.id, d.data()])),
  };
  const backupPath = path.resolve(
    __dirname,
    `backup-${PROJECT_ID}-${courseRef.id}-${Date.now()}.json`
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  log(`Backup written: ${backupPath}`);

  // ── 1. Welcome module ─────────────────────────────────────────────────────
  const alreadySplit =
    modules[0] && Number(modules[0].price ?? 0) <= 0 && modules[0].title === WELCOME_TITLE;
  if (alreadySplit) {
    log("Welcome module already exists — skipping split");
  } else {
    const firstMod = modules[0];
    const firstMap = mapModules[0];
    const chapter = firstMap.chapters?.[0];
    const welcomeMapLesson = chapter?.lessons?.find((l) => /^welcome/i.test(String(l.title ?? "")));
    if (!welcomeMapLesson) throw new Error("No lesson starting with 'Welcome' in the first module");
    const welcomeCourseLesson =
      firstMod.lessons.find((l) => /^welcome/i.test(String(l.title ?? ""))) ?? {
        title: welcomeMapLesson.title,
        order: 1,
      };
    log(`Moving lesson ${welcomeMapLesson.lessonId} "${welcomeMapLesson.title}" into a free Welcome module`);

    const modulesCol = db.collection(`curricula/${cid}/modules`);
    const newModuleRef = modulesCol.doc();
    const newChapterRef = newModuleRef.collection("chapters").doc();
    const srcLessonRef = db.doc(
      `curricula/${cid}/modules/${firstMap.moduleId}/chapters/${chapter.chapterId}/lessons/${welcomeMapLesson.lessonId}`
    );
    const dstLessonRef = newChapterRef.collection("lessons").doc(welcomeMapLesson.lessonId);
    if (!(await srcLessonRef.get()).exists) throw new Error(`Lesson doc missing at ${srcLessonRef.path}`);

    const srcModuleData = (await modulesCol.doc(firstMap.moduleId).get()).data() ?? {};
    const srcChapterData =
      (await db.doc(`curricula/${cid}/modules/${firstMap.moduleId}/chapters/${chapter.chapterId}`).get()).data() ??
      {};
    const now = FieldValue.serverTimestamp();
    if (APPLY) {
      await newModuleRef.set({...srcModuleData, title: WELCOME_TITLE, order: 0, created_at: now, updated_at: now});
      await newChapterRef.set({...srcChapterData, title: WELCOME_TITLE, order: 1, created_at: now, updated_at: now});
    }
    const counter = {docs: 0};
    await copyDocTree(srcLessonRef, dstLessonRef, counter);
    log(`Copied ${counter.docs} lesson content docs to ${dstLessonRef.path} (original left in place)`);

    // Remove the lesson from First Verse (course + mapping), renumber orders.
    firstMod.lessons = firstMod.lessons
      .filter((l) => l !== welcomeCourseLesson)
      .map((l, i) => ({...l, order: i + 1}));
    chapter.lessons = chapter.lessons.filter((l) => l.lessonId !== welcomeMapLesson.lessonId);

    modules.unshift({
      id: newModuleRef.id,
      title: WELCOME_TITLE,
      description: WELCOME_DESCRIPTION,
      order: 0,
      price: 0,
      durationMonths: 0,
      skills: [],
      completionBadgeIds: [],
      skillCertificates: [],
      certificateOnCompletion: false,
      lessons: [{...welcomeCourseLesson, order: 1}],
    });
    mapModules.unshift({
      moduleId: newModuleRef.id,
      chapters: [
        {
          chapterId: newChapterRef.id,
          lessons: [{lessonId: welcomeMapLesson.lessonId, title: welcomeMapLesson.title}],
        },
      ],
    });
  }

  // ── 2. Prices ─────────────────────────────────────────────────────────────
  modules.forEach((m) => {
    const isWelcome = m.order === 0 && m.title === WELCOME_TITLE;
    const next = isWelcome ? 0 : MODULE_PRICE;
    if (Number(m.price ?? 0) !== next) log(`Price "${m.title}": ${m.price} → ${next}`);
    m.price = next;
  });
  const totalPrice = modules.reduce((s, m) => s + Number(m.price ?? 0), 0);
  log(`Bundle price: ${course.bundlePrice ?? "(none)"} → ${BUNDLE_PRICE}; total of modules ${totalPrice}`);

  // ── 4. Admin access ───────────────────────────────────────────────────────
  const roles = new Set(course.assignedRoles ?? []);
  const before = [...roles];
  ADMIN_ROLES.forEach((r) => roles.add(r));
  log(`Assigned roles: [${before.join(", ")}] → [${[...roles].join(", ")}]`);

  const courseUpdate = {
    modules,
    curriculumMapping: {...mapping, modules: mapModules},
    totalPrice,
    bundlePrice: BUNDLE_PRICE,
    assignedRoles: [...roles],
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (APPLY) await courseRef.update(courseUpdate);

  // ── 3. End-of-module surveys ──────────────────────────────────────────────
  for (const mm of mapModules) {
    const lessons = mm.chapters?.flatMap((c) => c.lessons ?? []) ?? [];
    const last = lessons[lessons.length - 1];
    if (!last) continue;
    const ref = courseRef.collection("lessonSurveys").doc(last.lessonId);
    const snap = await ref.get();
    const checkpoints = snap.data()?.checkpoints;
    if (!Array.isArray(checkpoints)) continue;
    let changed = false;
    const next = checkpoints.map((c) => {
      if (c.enabled && END_OF_MODULE_SURVEY_TITLE.test(String(c.title ?? ""))) {
        log(`Disable end-of-module survey "${c.title}" (${c.id}) on "${last.title}"`);
        changed = true;
        return {...c, enabled: false};
      }
      return c;
    });
    if (changed && APPLY) await ref.update({checkpoints: next, updated_at: FieldValue.serverTimestamp()});
  }

  log(APPLY ? "Done." : "Dry run complete — re-run with --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
