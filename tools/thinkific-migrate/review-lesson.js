/**
 * Local QA preview for a lesson — renders each PNG slide to ./preview/ (no upload,
 * no Firestore writes) and prints the full text of every survey/assignment so the
 * mapping can be eyeballed and validated.
 *
 * Usage: node review-lesson.js --module 1 --lesson 2
 */
const fs = require("fs");
const path = require("path");
const { loadDotEnv } = require("./thinkific-client");
const { fetchChapterItems, mapItemsToMortar, htmlToText } = require("./lib-content");
const { renderHtmlToPng, closeBrowser } = require("./lib-render");

loadDotEnv();
const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));
const OUT = path.join(__dirname, "preview");

function arg(n, d) { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; }
const M = parseInt(arg("--module", "1"), 10);
const L = parseInt(arg("--lesson", "1"), 10);

async function run() {
  const mod = IDS.modules.find((m) => m.order === M);
  const lesson = mod.lessons.find((l) => l.order === L);
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT);

  console.log(`Reviewing M${M}.${L} "${lesson.title}" (chapter ${lesson.thinkificChapterId})\n`);
  const { items } = await fetchChapterItems(lesson.thinkificChapterId);
  const { slides, checkpoints, quiz, flags } = mapItemsToMortar(items);

  console.log("=== SLIDE MANIFEST (order → kind → source) ===");
  slides.forEach((s, i) => {
    const d = s.kind === "video" ? `YouTube ${s.videoId}` : s.kind === "gif" ? s.url.split("/").pop() : `${s.html.length} chars`;
    console.log(`  [${String(i).padStart(2, "0")}] ${s.kind.padEnd(6)} ${s._name}  (${d})`);
  });

  console.log(`\nRendering ${slides.filter((s) => s.kind === "render").length} PNG slides to ${OUT} …`);
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const tag = `M${M}L${L}_${String(i).padStart(2, "0")}`;
    if (s.kind === "render") {
      const png = await renderHtmlToPng(s.html);
      fs.writeFileSync(path.join(OUT, `${tag}_render.png`), png);
    }
  }
  console.log("done.\n");

  console.log("=== SURVEY / ASSIGNMENT CONTENT (to validate: is each really a survey?) ===");
  for (const c of checkpoints) {
    console.log(`\n▸ [${c._source}] "${c.title}"  (after slide ${c.afterSlideIndex})`);
    c.questions.forEach((q) => console.log(`    Q${q.order + 1}: ${q.question}`));
  }
  if (quiz) {
    console.log(`\n=== QUIZ (${quiz.questions.length} q, pass ${quiz.passPercentage}%) ===`);
    quiz.questions.forEach((q) =>
      console.log(`  Q${q.order + 1}: ${q.question}\n     A:${q.optionA} | B:${q.optionB} | C:${q.optionC} | D:${q.optionD}  ✓${q.correctAnswer}`)
    );
  }
  if (flags.length) {
    console.log(`\n=== FLAGS ===`);
    flags.forEach((f) => console.log(`  - ${f}`));
  }
}

run().then(closeBrowser).catch(async (e) => { await closeBrowser().catch(() => {}); console.error(e.message || e); process.exit(1); });
