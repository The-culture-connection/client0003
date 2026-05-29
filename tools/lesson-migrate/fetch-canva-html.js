const fs = require("fs");
const path = require("path");
const https = require("https");

const url = process.argv[2] || "https://mortarengagementengines.my.canva.site/dahk-u7ed9g";
const out = path.join(__dirname, "../../exports/lesson-5-canva.html");

https
  .get(url, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, data);
      console.log(`Wrote ${out} (${data.length} bytes)`);
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
