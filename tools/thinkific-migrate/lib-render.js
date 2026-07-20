/**
 * Render Thinkific slide HTML → PNG via headless Chrome (puppeteer-core, system
 * Chrome — no Chromium download). Produces a white, Montserrat-styled image that
 * matches how the content looked in Thinkific.
 *
 * Override the browser with CHROME_PATH in .env if Chrome isn't at the default.
 */
const fs = require("fs");
const puppeteer = require("puppeteer-core");

function chromePath() {
  // Resolved at CALL time (not module load) so CHROME_PATH set by loadDotEnv()
  // is honored — module-load resolution silently missed .env values on cloud runs.
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error(
    "No Chrome/Edge found. Set CHROME_PATH in tools/thinkific-migrate/.env."
  );
}

const WIDTH = 900; // content width in px (Thinkific reading width ~ this)

// ── Asset inlining ───────────────────────────────────────────────────────────
// Chromium cannot use the sandbox egress proxy (env-var proxies are ignored and
// --proxy-server CONNECTs get reset), so the page is rendered with ZERO network:
// every image and font is fetched in Node (whose proxy works) and inlined as a
// data: URI before the HTML reaches the browser. Deterministic + offline-safe.

const _assetCache = new Map(); // url -> data URI

async function fetchDataUri(url) {
  if (_assetCache.has(url)) return _assetCache.get(url);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`Asset fetch failed (${res.status}): ${url.slice(0, 160)}`);
  const ctype = (res.headers.get("content-type") || "application/octet-stream").split(";")[0];
  const buf = Buffer.from(await res.arrayBuffer());
  const uri = `data:${ctype};base64,${buf.toString("base64")}`;
  _assetCache.set(url, uri);
  return uri;
}

/** Inline every <img src> and CSS url(...) as a data: URI; drop srcset/lazy attrs. */
async function inlineAssets(html) {
  let out = String(html || "");

  // <img ...> — inline src, drop srcset/sizes/loading so Chromium can't pick
  // a network candidate.
  const imgTags = [...out.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  for (const tag of imgTags) {
    const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcM) continue;
    const src = srcM[1].replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(src)) continue;
    const uri = await fetchDataUri(src);
    let newTag = tag
      .replace(/\s(?:srcset|sizes|loading|decoding)=["'][^"']*["']/gi, "")
      .replace(srcM[0], `src="${uri}"`);
    out = out.split(tag).join(newTag);
  }

  // url(...) inside <style> blocks or style="" attributes (background images).
  const urlRefs = [...out.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/gi)];
  for (const m of urlRefs) {
    const raw = m[1].replace(/&amp;/g, "&");
    try {
      const uri = await fetchDataUri(raw);
      out = out.split(m[0]).join(`url("${uri}")`);
    } catch {
      /* background decoration — non-fatal, leave as-is */
    }
  }
  return out;
}

let _fontCssPromise = null;
/** Montserrat @font-face CSS with every woff2 inlined as a data: URI. */
function fontFaceCss() {
  if (!_fontCssPromise) {
    _fontCssPromise = (async () => {
      try {
        const cssUrl =
          "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap";
        let css = await (await fetch(cssUrl, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36" },
        })).text();
        const fontUrls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/g)].map((m) => m[1]))];
        for (const fu of fontUrls) css = css.split(fu).join(await fetchDataUri(fu));
        return css;
      } catch (e) {
        console.warn("Montserrat inline failed (" + e.message + ") — falling back to system fonts.");
        return "";
      }
    })();
  }
  return _fontCssPromise;
}

let _browser = null;
async function getBrowser() {
  if (!_browser) {
    const args = ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"];
    // Chromium ignores http(s)_proxy env vars (curl/node honor them). In
    // proxied environments (e.g. Cowork cloud) images/fonts silently fail to
    // load without this — pass the proxy through explicitly.
    const proxy = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy;
    if (proxy) {
      try {
        const u = new URL(proxy);
        args.push(`--proxy-server=${u.hostname}:${u.port || 80}`);
        const bypass = (process.env.no_proxy || process.env.NO_PROXY || "")
          .split(",").map((s) => s.trim()).filter(Boolean).join(";");
        if (bypass) args.push(`--proxy-bypass-list=${bypass}`);
      } catch { /* unparseable proxy URL — launch without it */ }
    }
    _browser = await puppeteer.launch({
      executablePath: chromePath(),
      headless: "new",
      args,
    });
  }
  return _browser;
}

function wrapHtml(inner, fontCss) {
  return `<!doctype html><html><head><meta charset="utf-8">
<style>${fontCss || ""}</style>
<style>
  /* Thinkific course-player dark theme, measured from the live player
     2026-07-20: content pane #2e2e2e, default text #e5e5e5. */
  html,body{margin:0;padding:0;background:#2e2e2e;}
  .wrap{width:${WIDTH}px;margin:0;padding:48px;box-sizing:border-box;
        font-family:'Montserrat',Arial,sans-serif;color:#e5e5e5;font-size:17px;line-height:1.6;}
  .wrap img{max-width:100%;height:auto;display:block;margin:1em auto;}
  .wrap p{margin:0 0 1em;} .wrap h1,.wrap h2,.wrap h3{color:#ffffff;}
  .wrap a{color:#9ecbff;} .wrap table{max-width:100%;border-collapse:collapse;}
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
     color:#e5e5e5 !important;text-shadow:none !important;}
  .flip-card .back{margin-top:4px;border-top:1px solid #555;}
</style></head><body><div class="wrap">${inner}</div></body></html>`;
}

/** Render an HTML fragment to a PNG buffer. */
async function renderHtmlToPng(html) {
  const [inlined, fontCss] = await Promise.all([inlineAssets(html || ""), fontFaceCss()]);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: WIDTH, height: 700, deviceScaleFactor: 2 });
    // All assets are inline data: URIs (no network), so "load" is sufficient —
    // networkidle0 can stall on very large data-URI documents.
    await page.setContent(wrapHtml(inlined, fontCss), {
      waitUntil: "load",
      timeout: 120000,
    });
    // Ensure every inline image is decoded before measuring/screenshotting.
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => (i.decode ? i.decode().catch(() => {}) : null)))
    );
    // Best-effort: wait for web fonts to settle.
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    // Trim trailing blank space: extracted video/iframe segments can leave
    // empty wrapper divs (e.g. fitvids padding-top boxes) that pad the bottom
    // of the slide with nothing. Measure the real content bottom (deepest
    // element that has text or is a visible image) and clip to it.
    const contentBottom = await page.evaluate(() => {
      let max = 0;
      const walk = (el) => {
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            const r = document.createRange();
            r.selectNodeContents(node);
            const rect = r.getBoundingClientRect();
            if (rect.height) max = Math.max(max, rect.bottom + window.scrollY);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "IMG" && node.naturalWidth > 0) {
              const rect = node.getBoundingClientRect();
              if (rect.height) max = Math.max(max, rect.bottom + window.scrollY);
            }
            walk(node);
          }
        }
      };
      walk(document.querySelector(".wrap"));
      return Math.ceil(max);
    });
    // HARD GUARD: refuse to render if any <img> failed to load — a silent
    // broken-image render is worse than a loud failure (2026-07-20 lesson).
    const badImgs = await page.evaluate(() =>
      [...document.images]
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => (i.currentSrc || i.src || "").slice(0, 160))
    );
    if (badImgs.length) {
      throw new Error(
        `Render aborted: ${badImgs.length} image(s) failed to load:\n  ${badImgs.join("\n  ")}`
      );
    }
    const el = await page.$(".wrap");
    if (contentBottom > 0) {
      const box = await el.boundingBox();
      const height = Math.min(box.height, contentBottom - box.y + 48); // keep bottom padding
      if (height >= 100 && height < box.height - 8) {
        return await page.screenshot({
          type: "png",
          clip: { x: box.x, y: box.y, width: box.width, height },
        });
      }
    }
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
