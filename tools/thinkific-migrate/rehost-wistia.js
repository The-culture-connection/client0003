/**
 * rehost-wistia.js — gap-fix 1.2 execution: re-host Thinkific-hosted Wistia
 * videos into Firebase Storage and fill wistia-map.json.
 *
 * For every /api/course_player/v2/contents/{id}/play/{mediaId} iframe found in
 * the cached chapters (scan-cache/):
 *   1. resolve the Wistia hashed id from the /play/ page (Thinkific host)
 *   2. GET https://fast.wistia.net/embed/medias/{id}.json
 *   3. pick the best mp4 asset (largest with height <= 720, else smallest)
 *   4. download → upload to curriculum_content/{curriculumId}/videos/{id}.mp4
 *   5. record { wistiaId: { video_url, title, w, h, bytes } } in wistia-map.json
 *
 * Idempotent: ids already in wistia-map.json are skipped.
 */
const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { loadDotEnv } = require("./thinkific-client");
loadDotEnv();
const { ThinkificPlayer, sleep } = require("./thinkific-player");

const IDS = JSON.parse(fs.readFileSync(path.join(__dirname, "course-ids.json"), "utf8"));
admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"))
  ),
  projectId: process.env.FIREBASE_PROJECT_ID || "mortar-stage",
  storageBucket: `${process.env.FIREBASE_PROJECT_ID || "mortar-stage"}.firebasestorage.app`,
});
const bucket = admin.storage().bucket();

const MAP_PATH = path.join(__dirname, "wistia-map.json");
const map = fs.existsSync(MAP_PATH) ? JSON.parse(fs.readFileSync(MAP_PATH, "utf8")) : {};

// Wistia fetches go through curl, not node fetch: in the Cowork cloud, node's
// fetch uses an egress route whose allowlist snapshot is fixed at session
// start, while curl (env proxy) sees live allowlist updates. Wistia hosts were
// allowlisted mid-session (2026-07-20).
const { execFileSync } = require("child_process");
function curlJson(url) {
  const out = execFileSync(
    "curl",
    ["-sf", "-L", "--max-time", "120", "-A", "Mozilla/5.0", "-e", "https://mortarmastersonline.thinkific.com/", url],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  return JSON.parse(out.toString("utf8"));
}
function curlToFile(url, outPath) {
  execFileSync("curl", [
    "-sf", "-L", "--max-time", "600",
    "-A", "Mozilla/5.0",
    "-e", "https://mortarmastersonline.thinkific.com/",
    "-o", outPath,
    url,
  ]);
}

(async () => {
  // 1. Collect all /play/ iframe URLs from cached chapter JSON.
  const playUrls = new Set();
  for (const f of fs.readdirSync(path.join(__dirname, "scan-cache"))) {
    const items = JSON.parse(fs.readFileSync(path.join(__dirname, "scan-cache", f), "utf8"));
    for (const it of items) {
      const html =
        it.body?.html_item?.html_text ||
        it.body?.assignment?.assignment_content ||
        it.body?.download?.html_description ||
        "";
      for (const m of html.matchAll(/<iframe\b[^>]*src=["']([^"']+)["']/gi)) {
        const src = m[1].replace(/&amp;/g, "&");
        if (/\/api\/course_player\/v2\/contents\/\d+\/play\//.test(src)) playUrls.add(src);
      }
    }
  }
  console.log(`Found ${playUrls.size} Thinkific /play/ embeds in cached chapters.`);

  const player = new ThinkificPlayer();
  for (const url of playUrls) {
    const pathname = url.replace(/^https?:\/\/[^/]+/, "");
    const page = await player.get(pathname);
    const body = page.__nonJson ? page.body : "";
    const wm =
      body.match(/wistia_async_([a-z0-9]+)/i) ||
      body.match(/fast\.wistia\.(?:com|net)\/embed\/(?:iframe|medias)\/([a-z0-9]+)/i);
    const title = ((body.match(/<title>([^<]*)<\/title>/i) || [])[1] || "").trim();
    if (!wm) {
      console.log(`  ✗ no Wistia id in ${pathname}`);
      continue;
    }
    const id = wm[1];
    if (map[id] && map[id].video_url) {
      console.log(`  = ${id} (${title}) already re-hosted, skipping`);
      continue;
    }

    // 2. Wistia media JSON → best mp4 asset.
    const media = curlJson(`https://fast.wistia.net/embed/medias/${id}.json`).media;
    const mp4s = (media.assets || []).filter(
      (a) => /mp4/i.test(a.type || "") || /\.mp4(\?|$)/.test(a.url || "") || a.container === "mp4"
    );
    if (!mp4s.length && !(media.assets || []).some((a) => a.type === "original"))
      throw new Error(`no mp4 assets for ${id} (${title})`);
    // Preference: sized mp4 <=720p, then md/hd/mp4/iphone variants (some older
    // media report no size and individual delivery URLs can 404 — try in
    // order), then the original as last resort.
    const pref = (a) =>
      (a.height || 0) > 0 && (a.height || 0) <= 720 && /mp4/i.test(a.type || "") ? 0
      : /^md_mp4/i.test(a.type || "") ? 1
      : /^hd_mp4/i.test(a.type || "") ? 2
      : /^mp4_video/i.test(a.type || "") ? 3
      : /iphone/i.test(a.type || "") ? 4
      : /mp4/i.test(a.type || "") ? 5
      : 9;
    const candidates = [...mp4s.sort((a, b) => pref(a) - pref(b) || (b.height || 0) - (a.height || 0)),
      ...(media.assets || []).filter((a) => a.type === "original")];

    // 3. Download (curl — see header note). Try candidates until one works.
    const tmp = `/tmp/wistia_${id}.mp4`;
    let asset = null, bytes = 0;
    for (const cand of candidates) {
      try {
        process.stdout.write(`  ↓ ${id} "${media.name || title}" [${cand.type} ${cand.width || "?"}x${cand.height || "?"}]… `);
        curlToFile(cand.url, tmp);
        bytes = fs.statSync(tmp).size;
        if (bytes > 1000) { asset = cand; break; }
        console.log("empty, next candidate");
      } catch (e) {
        console.log(`failed (${e.status || e.message}), next candidate`);
      }
    }
    if (!asset) throw new Error(`all asset downloads failed for ${id} (${title})`);

    // 4. Upload to Storage (public, like the slide PNGs).
    const dest = `curriculum_content/${IDS.curriculumId}/videos/${id}.mp4`;
    await bucket.upload(tmp, {
      destination: dest,
      metadata: { contentType: "video/mp4", cacheControl: "public, max-age=31536000" },
      resumable: bytes > 20 * 1024 * 1024,
    });
    await bucket.file(dest).makePublic();
    fs.unlinkSync(tmp);

    map[id] = {
      video_url: `https://storage.googleapis.com/${bucket.name}/${dest}`,
      title: media.name || title,
      w: asset.width,
      h: asset.height,
      bytes,
    };
    fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
    console.log(`✓ → ${dest} (${Math.round(bytes / 1e6)}MB)`);
    await sleep(300);
  }
  console.log(`\nwistia-map.json now has ${Object.keys(map).length} entries.`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
