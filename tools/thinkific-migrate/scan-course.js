/**
 * scan-course.js — full-course dry scan (Phase 1 gap-fixes 1.2 / 1.5 support).
 *
 * Fetches EVERY mapped chapter (16 lessons + 3 verse dividers), runs the
 * mapper, and reports:
 *   - every "unknown" media flag with the iframe/video src (gap-fix 1.2 input)
 *   - every draft item (verifies the global draft skip, gap-fix 1.5)
 *   - per-lesson item/slide/checkpoint/quiz totals + all other flags
 * Raw item JSON is cached under scan-cache/ so re-runs and later analysis
 * don't refetch from Thinkific.
 *
 * Read-only (no Firestore writes). Usage: node scan-course.js
 */
const fs = require("fs");
const path = require("path");
const { loadDotEnv } = require("./thinkific-client");
loadDotEnv();
const { fetchChapterItems, mapItemsToMortar } = require("./lib-content");

const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));
const CACHE = path.join(__dirname, "scan-cache");
fs.mkdirSync(CACHE, { recursive: true });

async function getItems(chapterId) {
  const f = path.join(CACHE, `chapter_${chapterId}.json`);
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const { items } = await fetchChapterItems(String(chapterId));
  fs.writeFileSync(f, JSON.stringify(items));
  return items;
}

(async () => {
  const targets = [];
  for (const mod of IDS.modules)
    for (const l of mod.lessons)
      if (l.thinkificChapterId)
        targets.push({ label: `M${mod.order}.${l.order} ${l.title}`, chapterId: l.thinkificChapterId });
  for (const [k, v] of Object.entries(IDS.moduleIntroChapters || {}))
    targets.push({ label: `[Verse] ${k}`, chapterId: v, verse: true });

  const unknowns = [];
  const drafts = [];
  const otherFlags = [];
  const metaKeys = new Set();
  let totals = { items: 0, slides: 0, checkpoints: 0, quizzes: 0 };

  for (const t of targets) {
    const items = await getItems(t.chapterId);
    items.forEach((it) => Object.keys(it.content || {}).forEach((k) => metaKeys.add(k)));
    const draftItems = items.filter(
      (it) => it.content?.draft === true || it.content?.is_draft === true || it.content?.status === "draft"
    );
    draftItems.forEach((it) =>
      drafts.push(`${t.label} :: (${it.type}) ${it.content.name} [${Object.entries(it.content).filter(([k,v])=>/draft|status/i.test(k)).map(([k,v])=>`${k}=${v}`).join(",")}]`)
    );
    const { slides, checkpoints, quiz, flags } = mapItemsToMortar(items, {});
    totals.items += items.length;
    totals.slides += slides.length;
    totals.checkpoints += checkpoints.length;
    if (quiz) totals.quizzes += 1;
    console.log(
      `${t.label}: ${items.length} items → ${slides.length} slides, ${checkpoints.length} checkpoints, quiz: ${quiz ? quiz.questions.length + "q" : "—"}${draftItems.length ? `, ${draftItems.length} draft` : ""}`
    );
    for (const f of flags) {
      if (/Unrecognized media|Unhandled content type/.test(f)) unknowns.push(`${t.label} :: ${f}`);
      else otherFlags.push(`${t.label} :: ${f}`);
    }
  }

  console.log(`\n=== TOTALS: ${totals.items} items → ${totals.slides} slides, ${totals.checkpoints} checkpoints, ${totals.quizzes} quizzes`);
  console.log(`\n=== UNKNOWN MEDIA (gap-fix 1.2) — ${unknowns.length}:`);
  unknowns.forEach((u) => console.log("  " + u));
  console.log(`\n=== DRAFT ITEMS (gap-fix 1.5) — ${drafts.length}:`);
  drafts.forEach((d) => console.log("  " + d));
  console.log(`\n=== OTHER FLAGS — ${otherFlags.length}:`);
  otherFlags.forEach((f) => console.log("  " + f));
  console.log(`\n(content meta keys seen: ${[...metaKeys].join(", ")})`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
