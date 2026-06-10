/**
 * Probe the authenticated course-player API to discover the real content shapes
 * (HTML body, quiz questions, survey questions). Run this once after capturing a
 * session cookie into .env (THINKIFIC_COOKIE).
 *
 * Usage: node tools/thinkific-migrate/inspect-player.js
 */
const { ThinkificPlayer, sleep } = require("./thinkific-player");
const { loadDotEnv } = require("./thinkific-client");

// One sample content id per type (from the course tree).
const SAMPLES = {
  HtmlItem: "51873999", // Lesson 1 Intro
  Survey: "51878316", // Lesson 1 Survey
  Quiz: "51981514", // Lesson 2 Quiz
  Assignment: "51976946", // 2.0 Before We Go Any Further
  Download: "52007632", // Calculate Your Budget
};

// Candidate endpoint templates to try per content id (first JSON hit wins).
const CANDIDATES = [
  (id) => `/api/course_player/v2/contents/${id}`,
  (id) => `/api/course_player/v2/content/${id}`,
  (id) => `/api/course_player/contents/${id}`,
];

function summarize(obj, depth = 0) {
  // Print top-level keys + nested keys 1 level deep so we can see structure
  // without dumping huge HTML blobs.
  if (obj && obj.__nonJson) return `(non-JSON shell, ${obj.length} bytes)`;
  return JSON.stringify(
    obj,
    (k, v) => {
      if (typeof v === "string" && v.length > 400) return v.slice(0, 400) + `…[+${v.length - 400} chars]`;
      return v;
    },
    2
  );
}

async function run() {
  loadDotEnv();
  const player = new ThinkificPlayer();

  for (const [type, id] of Object.entries(SAMPLES)) {
    console.log("\n" + "=".repeat(72));
    console.log(`${type}  (content id ${id})`);
    console.log("=".repeat(72));
    let got = null;
    for (const tmpl of CANDIDATES) {
      const path = tmpl(id);
      try {
        const r = await player.get(path);
        if (r && r.__nonJson) {
          console.log(`  ${path} -> non-JSON shell (skip)`);
          continue;
        }
        console.log(`  ✓ ${path}`);
        got = r;
        break;
      } catch (e) {
        console.log(`  ✗ ${path} -> ${String(e.message).split("\n")[0]}`);
      }
      await sleep(300);
    }
    if (got) console.log(summarize(got));
    await sleep(300);
  }
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
