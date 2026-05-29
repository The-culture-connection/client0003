const fs = require("fs");
const path = require("path");

const htmlPath =
  process.argv[2] ||
  path.join(__dirname, "../../exports/lesson-5-canva-bootstrap-snippet.txt");
const html = fs.readFileSync(htmlPath, "utf8");

const pageCount = (html.match(/"A\?":"i"/g) || []).length;
const surveyUi = (html.match(/"A":"survey\\n"/g) || []).length;
const quizUi = (html.match(/"A":"Quiz\\n"/g) || []).length;
const youtube = [...html.matchAll(/youtu\.be\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]);

const textRe = /"A":"((?:\\.|[^"\\]){4,300})"/g;
const texts = [];
let m;
while ((m = textRe.exec(html))) {
  const t = m[1]
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .trim();
  if (t.startsWith("MAHK") || /^[#\d.%]+$/.test(t)) continue;
  if (/^YAF/.test(t)) continue;
  texts.push(t);
}

const unique = [...new Set(texts)];
const interesting = unique.filter((t) =>
  /lesson|quiz|survey|true|false|5\.|root|verse|chapter/i.test(t)
);

console.log(
  JSON.stringify({ pageCount, surveyUi, quizUi, youtube: [...new Set(youtube)], interesting }, null, 2)
);
