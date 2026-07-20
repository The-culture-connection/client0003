/**
 * status.js — Step 0.5 Firestore audit (and Phase 3 drift check).
 *
 * For every lesson in course-ids.json, reports:
 *   - lesson_content slide count
 *   - lesson doc content_type + is_published
 *   - lessonSurveys / lessonQuizzes doc presence (checkpoint/question counts)
 *
 * Read-only. Usage: node status.js [--md]   (--md prints a markdown table)
 */
const fs = require("fs");
const path = require("path");

// minimal .env loader (same convention as the other scripts)
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#") && !process.env[l.slice(0, i)])
      process.env[l.slice(0, i)] = l.slice(i + 1);
  }
}

const admin = require("firebase-admin");
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));

const credsPath =
  process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    ? process.env.GOOGLE_APPLICATION_CREDENTIALS
    : path.join(__dirname, "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json");

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(fs.readFileSync(credsPath, "utf8"))),
  projectId: IDS.project || process.env.FIREBASE_PROJECT_ID,
});
const db = admin.firestore();

const MD = process.argv.includes("--md");

(async () => {
  const rows = [];
  for (const mod of IDS.modules) {
    for (const lesson of mod.lessons) {
      const lessonPath = `curricula/${IDS.curriculumId}/modules/${mod.moduleId}/chapters/${mod.chapterId}/lessons/${lesson.lessonId}`;
      const [lessonDoc, contentSnap, surveyDoc, quizDoc] = await Promise.all([
        db.doc(lessonPath).get(),
        db.collection(`${lessonPath}/lesson_content`).get(),
        db.doc(`courses/${IDS.courseId}/lessonSurveys/${lesson.lessonId}`).get(),
        db.doc(`courses/${IDS.courseId}/lessonQuizzes/${lesson.lessonId}`).get(),
      ]);
      const d = lessonDoc.exists ? lessonDoc.data() : null;
      const surveys = surveyDoc.exists ? surveyDoc.data() : null;
      const quiz = quizDoc.exists ? quizDoc.data() : null;
      const surveyCount = surveys
        ? Array.isArray(surveys.checkpoints)
          ? surveys.checkpoints.length
          : Array.isArray(surveys.surveys)
            ? surveys.surveys.length
            : `?${Object.keys(surveys).length}k`
        : 0;
      const quizCount = quiz
        ? Array.isArray(quiz.questions)
          ? quiz.questions.length
          : `?${Object.keys(quiz).length}k`
        : 0;
      rows.push({
        lesson: `M${mod.order}.${lesson.order}`,
        title: lesson.title,
        lessonDoc: lessonDoc.exists ? "yes" : "MISSING",
        contentType: d ? d.content_type || "—" : "—",
        slides: contentSnap.size,
        surveys: surveyDoc.exists ? `yes (${surveyCount})` : "—",
        quiz: quizDoc.exists ? `yes (${quizCount})` : "—",
        published: d ? String(d.is_published ?? "—") : "—",
        thinkificChapterId: lesson.thinkificChapterId || "(shell)",
      });
    }
  }

  if (MD) {
    console.log("| Lesson | Title | Lesson doc | content_type | Slides | Surveys | Quiz | is_published |");
    console.log("|---|---|---|---|---|---|---|---|");
    for (const r of rows)
      console.log(
        `| ${r.lesson} | ${r.title} | ${r.lessonDoc} | ${r.contentType} | ${r.slides} | ${r.surveys} | ${r.quiz} | ${r.published} |`
      );
  } else {
    console.table(rows.map(({ thinkificChapterId, ...r }) => r));
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
