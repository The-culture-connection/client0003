/**
 * Throwaway inspector: dump the raw Thinkific JSON for one content item of each
 * type (HtmlItem, Survey, Quiz, Assignment, Download) plus its "contentable"
 * detail, so we can see the exact field shapes before writing the migration.
 *
 * Usage: node tools/thinkific-migrate/inspect-content.js
 */
const { ThinkificClient, loadDotEnv } = require("./thinkific-client");

// One sample content id per type, picked from the course tree.
const SAMPLES = {
  HtmlItem: "51873999", // Lesson 1 Intro
  Survey: "51878316", // Lesson 1 Survey
  Quiz: "51981514", // Lesson 2 Quiz
  Assignment: "51976946", // 2.0 Before We Go Any Further
  Download: "52007632", // Calculate Your Budget
};

// Thinkific contentable endpoints (pluralized type).
const CONTENTABLE_PATH = {
  HtmlItem: "html_items",
  Survey: "surveys",
  Quiz: "quizzes",
  Assignment: "assignments",
  Download: "downloads",
  Video: "videos",
  Lesson: "lessons",
  Multimedia: "multimedia",
  Presentation: "presentations",
};

async function run() {
  loadDotEnv();
  const client = new ThinkificClient();

  for (const [type, id] of Object.entries(SAMPLES)) {
    console.log("\n" + "=".repeat(70));
    console.log(`CONTENT ${type}  (id ${id})`);
    console.log("=".repeat(70));
    let content;
    try {
      content = await client.getContent(id);
      console.log("--- /contents/" + id + " ---");
      console.log(JSON.stringify(content, null, 2));
    } catch (e) {
      console.log("content fetch failed:", e.message);
      continue;
    }

    const ctype = content.contentable_type;
    const cid = content.contentable_id;
    const pathSeg = CONTENTABLE_PATH[ctype];
    if (pathSeg && cid) {
      try {
        const detail = await client._get(`/${pathSeg}/${cid}`);
        console.log(`--- /${pathSeg}/${cid} (contentable) ---`);
        console.log(JSON.stringify(detail, null, 2));
      } catch (e) {
        console.log(`contentable /${pathSeg}/${cid} failed:`, e.message);
      }
    }
  }
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
