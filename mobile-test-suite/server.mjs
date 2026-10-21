// Mobile test suite server: the tester page at `/`, the Flutter web build of
// the mobile app at `/app/`. No dependencies — `node server.mjs`.
//
// Env:
//   PORT            set by Railway
//   APP_DIR         Flutter web build (default ./app)
//   SUITE_PASSWORD  optional; when set, every request needs HTTP basic auth
//                   with any username and this password.

import {createServer} from "node:http";
import {readFile, stat} from "node:fs/promises";
import {extname, join, normalize, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = resolve(here, "public");
const APP_DIR = resolve(process.env.APP_DIR || join(here, "app"));
const PASSWORD = process.env.SUITE_PASSWORD || "";
const PORT = Number(process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".bin": "application/octet-stream",
  ".frag": "application/octet-stream",
  ".mp4": "video/mp4",
};

function authorized(req) {
  if (!PASSWORD) return true;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice(6), "base64").toString();
  return decoded.slice(decoded.indexOf(":") + 1) === PASSWORD;
}

/** Resolves [rel] inside [root], or null if it would escape it. */
function inside(root, rel) {
  const full = resolve(root, "." + sep + normalize(rel));
  return full === root || full.startsWith(root + sep) ? full : null;
}

async function sendFile(res, file, {cache}) {
  const body = await readFile(file);
  res.writeHead(200, {
    "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
    // The app shell and its bootstrap must never be stale after a redeploy;
    // hashed/static assets can be cached briefly.
    "Cache-Control": cache ? "public, max-age=300" : "no-cache",
  });
  res.end(body);
}

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

const NO_CACHE = new Set(["index.html", "flutter_bootstrap.js", "flutter_service_worker.js", "version.json"]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const path = decodeURIComponent(url.pathname);

    if (path === "/healthz") {
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.end("ok");
      return;
    }
    if (!authorized(req)) {
      res.writeHead(401, {"WWW-Authenticate": 'Basic realm="Mortarverse test suite"'});
      res.end("Password required");
      return;
    }

    if (path === "/app") {
      res.writeHead(301, {Location: "/app/"});
      res.end();
      return;
    }
    if (path.startsWith("/app/")) {
      const rel = path.slice("/app/".length) || "index.html";
      const file = inside(APP_DIR, rel);
      if (file && (await isFile(file))) {
        const name = rel.split("/").pop();
        await sendFile(res, file, {cache: !NO_CACHE.has(name)});
      } else {
        // Client-side routes (go_router) fall back to the app shell.
        await sendFile(res, join(APP_DIR, "index.html"), {cache: false});
      }
      return;
    }

    const file = inside(PUBLIC_DIR, path === "/" ? "index.html" : path.slice(1));
    if (file && (await isFile(file))) {
      await sendFile(res, file, {cache: false});
      return;
    }
    res.writeHead(404, {"Content-Type": "text/plain"});
    res.end("Not found");
  } catch (e) {
    console.error(e);
    res.writeHead(500, {"Content-Type": "text/plain"});
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Mobile test suite on :${PORT} (app from ${APP_DIR})`);
});
