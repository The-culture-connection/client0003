/**
 * Render Thinkific slide HTML → PNG via headless Chrome (puppeteer-core, system
 * Chrome — no Chromium download). Produces a white, Montserrat-styled image that
 * matches how the content looked in Thinkific.
 *
 * Override the browser with CHROME_PATH in .env if Chrome isn't at the default.
 */
const fs = require("fs");
const puppeteer = require("puppeteer-core");

const CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

function chromePath() {
  for (const p of CANDIDATES) if (fs.existsSync(p)) return p;
  throw new Error(
    "No Chrome/Edge found. Set CHROME_PATH in tools/thinkific-migrate/.env."
  );
}

const WIDTH = 900; // content width in px (Thinkific reading width ~ this)

let _browser = null;
async function getBrowser() {
  if (!_browser) {
    _browser = await puppeteer.launch({
      executablePath: chromePath(),
      headless: "new",
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
    });
  }
  return _browser;
}

function wrapHtml(inner) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;padding:0;background:#ffffff;}
  .wrap{width:${WIDTH}px;margin:0;padding:48px;box-sizing:border-box;
        font-family:'Montserrat',Arial,sans-serif;color:#414141;font-size:17px;line-height:1.6;}
  .wrap img{max-width:100%;height:auto;display:block;margin:1em auto;}
  .wrap p{margin:0 0 1em;} .wrap h1,.wrap h2,.wrap h3{color:#222;}
  .wrap a{color:#2563eb;} .wrap table{max-width:100%;border-collapse:collapse;}
  .wrap iframe{max-width:100%;}
  /* Flatten PlayerSnips flip-cards for a static image: show both faces stacked,
     and neutralize their colored backgrounds + force dark text so all content
     (icon labels, answer options, scores) is readable regardless of the card's
     original (often same-color-on-same-color) styling. */
  .flip-card{height:auto !important;perspective:none !important;min-height:0 !important;
     transform:none !important;margin-bottom:14px !important;}
  .flip-card .front,.flip-card .back{position:relative !important;opacity:1 !important;
     transform:none !important;backface-visibility:visible !important;
     -webkit-backface-visibility:visible !important;height:auto !important;left:auto !important;
     box-shadow:none !important;}
  .flip-card *,.flip-cards .flip-card *{background:transparent !important;background-color:transparent !important;
     color:#222 !important;text-shadow:none !important;}
  .flip-card .back{margin-top:4px;border-top:1px solid #ddd;}
</style></head><body><div class="wrap">${inner}</div></body></html>`;
}

/** Render an HTML fragment to a PNG buffer. */
async function renderHtmlToPng(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: WIDTH, height: 700, deviceScaleFactor: 2 });
    await page.setContent(wrapHtml(html || ""), {
      waitUntil: "networkidle0",
      timeout: 60000,
    });
    // Best-effort: wait for web fonts to settle.
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    const el = await page.$(".wrap");
    return await el.screenshot({ type: "png" });
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}

module.exports = { renderHtmlToPng, closeBrowser, WIDTH };
