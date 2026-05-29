const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(
  path.join(__dirname, "../../exports/lesson-5-canva.html"),
  "utf8"
);
const m = html.match(/window\['bootstrap'\] = JSON\.parse\('([\s\S]+?)'\);/);
if (!m) throw new Error("no bootstrap");
const raw = m[1];

const parts = raw.split('{"A?":"i"');
console.log("segments", parts.length - 1);

for (let i = 1; i < parts.length; i++) {
  const chunk = parts[i].slice(0, 12000);
  const texts = [];
  const re = /"A":"((?:\\.|[^"\\]){3,500})"/g;
  let x;
  while ((x = re.exec(chunk))) {
    const t = x[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    if (t.length < 3 || t.startsWith("MAHK") || /^YAF/.test(t)) continue;
    if (/^#[0-9a-f]{3,8}$/i.test(t)) continue;
    texts.push(t);
  }
  const uniq = [...new Set(texts)];
  const yt = [...chunk.matchAll(/youtu\.be\/([A-Za-z0-9_-]+)/g)].map((y) => y[1]);
  const flags = [];
  if (uniq.some((t) => /^survey$/i.test(t))) flags.push("SURVEY-UI");
  if (uniq.some((t) => /^quiz$/i.test(t))) flags.push("QUIZ-UI");
  if (yt.length) flags.push(`VIDEO:${yt[0]}`);
  console.log(`\n=== Page ${i} ${flags.join(" ")} ===`);
  uniq.slice(0, 15).forEach((t) => console.log(" ", t.replace(/\n/g, " | ").slice(0, 140)));
}
