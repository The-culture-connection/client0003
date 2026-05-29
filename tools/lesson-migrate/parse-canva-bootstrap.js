/**
 * One-off: extract page count, youtube URLs, and text blobs from Canva export HTML.
 * Usage: node tools/lesson-migrate/parse-canva-bootstrap.js <url-or-html-file>
 */
const fs = require("fs");
const https = require("https");

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

function extractBootstrap(html) {
  const m = html.match(/window\['bootstrap'\] = JSON\.parse\('(.+?)'\);/s);
  if (!m) throw new Error("bootstrap not found");
  const raw = m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  return JSON.parse(raw);
}

function collectTexts(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const x of node) collectTexts(x, out);
    return out;
  }
  if (node["A?"] === "A" && typeof node.A === "string" && node.A.trim()) {
    const t = node.A.replace(/\\n/g, "\n").trim();
    if (t.length > 1 && !/^[\s\\n]+$/.test(t)) out.push(t);
  }
  for (const v of Object.values(node)) collectTexts(v, out);
  return out;
}

function findYoutube(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (typeof node === "string" && node.includes("youtu")) {
    const m = node.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
    if (m) out.push(m[1]);
  }
  if (Array.isArray(node)) {
    for (const x of node) findYoutube(x, out);
    return out;
  }
  for (const v of Object.values(node)) findYoutube(v, out);
  return out;
}

async function main() {
  const arg = process.argv[2] || "https://mortarengagementengines.my.canva.site/dahk-u7ed9g";
  const html = arg.startsWith("http") ? await fetchHtml(arg) : fs.readFileSync(arg, "utf8");
  const boot = extractBootstrap(html);
  const pages = boot?.page?.A?.A || [];
  console.log(`Pages: ${pages.length}\n`);
  pages.forEach((page, i) => {
    const n = i + 1;
    const texts = [...new Set(collectTexts(page))].filter((t) => t.length > 2);
    const yt = [...new Set(findYoutube(page))];
    const isSurvey = texts.some((t) => /^survey$/i.test(t.trim()));
    const isQuiz = texts.some((t) => /quiz/i.test(t));
    console.log(`--- Page ${n} ${isSurvey ? "[SURVEY UI]" : ""}${isQuiz ? "[QUIZ?]" : ""} ---`);
    if (yt.length) console.log(`  YouTube: ${yt.join(", ")}`);
    texts.slice(0, 12).forEach((t) => console.log(`  ${t.slice(0, 120).replace(/\n/g, " ")}`));
    if (texts.length > 12) console.log(`  ... +${texts.length - 12} more text blobs`);
    console.log();
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
