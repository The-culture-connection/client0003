const fs = require("fs");
const path = require("path");
const https = require("https");

const url = process.argv[2];
const outHtml = process.argv[3];

function fetch(u) {
  return new Promise((resolve, reject) => {
    https.get(u, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", reject);
  });
}

(async () => {
  const html = url.startsWith("http") ? await fetch(url) : fs.readFileSync(url, "utf8");
  if (outHtml) fs.writeFileSync(outHtml, html);
  const parts = html.split('"A?":"i"');
  console.log("pages:", parts.length - 1);
  for (let i = 1; i < parts.length; i++) {
    const ids = [...parts[i].matchAll(/youtu\.be\/([A-Za-z0-9_-]+)/g)].map((m) => m[1]);
    const uniq = [...new Set(ids)];
    if (uniq.length) console.log(`  page ${i} (PPT ~${i}):`, uniq.join(", "));
  }
})();
