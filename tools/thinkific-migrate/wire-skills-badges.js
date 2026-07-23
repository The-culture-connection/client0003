/**
 * wire-skills-badges.js — attach skills, module completion badges, and
 * subtitles to the migrated course data. Idempotent.
 *
 *  - courses/{original,demo}: modules[].skills, modules[].completionBadgeIds,
 *    modules[].lessons[].subtitle (+ skill where applicable)
 *  - curriculum lesson docs: subtitle + skill fields (from course-ids.json)
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

const MODULE_META = {
  PiTZ2ssnS9llXBeIFKuM: { // First Verse: Foundations
    skills: ["Personal Finance (Tier I)"],
    completionBadgeIds: ["module-foundations-complete"],
  },
  umRozJXgQPNcWLtojyXP: { // The Core
    skills: ["Branding & Marketing (Tier I)", "Business Finance (Tier I)", "Pitch Your Business (Tier I)"],
    completionBadgeIds: ["module-the-core-complete"],
  },
  CyaEwUTGPHhdsIH7Vk1w: { // Really Real
    skills: [],
    completionBadgeIds: ["module-really-real-complete"],
  },
};

const lessonMeta = {}; // lessonId -> {subtitle, skill}
for (const mod of IDS.modules)
  for (const l of mod.lessons) lessonMeta[l.lessonId] = { subtitle: l.subtitle || null, skill: l.skill || null };

(async () => {
  // 1. Curriculum lesson docs: subtitle + skill.
  for (const mod of IDS.modules) {
    for (const l of mod.lessons) {
      const p = `curricula/${IDS.curriculumId}/modules/${mod.moduleId}/chapters/${mod.chapterId}/lessons/${l.lessonId}`;
      await db.doc(p).set(
        { subtitle: l.subtitle || null, skill: l.skill || null, updated_at: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }
  }
  console.log("✓ 16 lesson docs: subtitle + skill set");

  // 2. Course docs: module skills/badges + per-lesson subtitles in modules[].
  for (const courseId of [IDS.courseId, "demoStudentTestUpload"]) {
    const ref = db.doc(`courses/${courseId}`);
    const snap = await ref.get();
    if (!snap.exists) { console.log(`  (course ${courseId} missing — skipped)`); continue; }
    const c = snap.data();
    const mapping = c.curriculumMapping?.modules || [];
    const modules = (c.modules || []).map((m, mi) => {
      const mapMod = mapping[mi];
      const meta = MODULE_META[mapMod?.moduleId] || {};
      const mapLessons = mapMod?.chapters?.[0]?.lessons || [];
      const lessons = (m.lessons || []).map((les, li) => {
        const lid = mapLessons[li]?.lessonId;
        const lm = lid ? lessonMeta[lid] : null;
        const out = { ...les };
        if (lm?.subtitle) out.subtitle = lm.subtitle;
        if (lm?.skill) out.skill = lm.skill;
        return out;
      });
      return { ...m, skills: meta.skills ?? m.skills ?? [], completionBadgeIds: meta.completionBadgeIds ?? m.completionBadgeIds ?? [], lessons };
    });
    await ref.set({ modules, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    console.log(`✓ courses/${courseId}: skills + completionBadgeIds + lesson subtitles wired (${modules.length} modules)`);
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
