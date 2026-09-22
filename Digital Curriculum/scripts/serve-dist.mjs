/**
 * Static server for the built Digital Curriculum SPA.
 *
 * Replaces `serve -s dist`, which could not serve the iOS Universal Links
 * association file. `serve` rewrites every **extension-less** request path to
 * the SPA shell whether or not a real file sits there, and Apple requires
 * `/.well-known/apple-app-site-association` to have no extension — so iOS was
 * handed `index.html` instead of JSON and Universal Links failed silently.
 * (Android was unaffected: `assetlinks.json` has an extension.) See
 * `docs/mobile-app-links.md` for the measurements and the config-only fixes
 * that were tried and do not work.
 *
 * The ordering below is the whole point: real files are served first, and the
 * SPA fallback only catches what is genuinely missing.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "..", "dist");
const INDEX = path.join(DIST, "index.html");
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = express();

// Trust Railway's proxy so req.protocol/ip reflect the original request.
app.set("trust proxy", true);
// The stock header advertises the framework and buys nothing.
app.disable("x-powered-by");

/**
 * Apple's file, served explicitly.
 *
 * It has no extension, so `express.static` would send it as
 * `application/octet-stream`; iOS requires `application/json`. Declared before
 * the static middleware so this content type always wins. iOS also refuses
 * redirects for this file, so it must be served directly at this exact path.
 */
app.get("/.well-known/apple-app-site-association", (_req, res, next) => {
  res.type("application/json");
  // `dotfiles: "allow"` again, and not redundantly: res.sendFile enforces its
  // own dotfile policy independently of the static middleware below, and
  // defaults to refusing any path containing a dot-segment. Without it this
  // route 404s on `.well-known` and the request falls through to the SPA
  // shell — the original bug, reproduced one layer down.
  res.sendFile(
    path.join(DIST, ".well-known", "apple-app-site-association"),
    { dotfiles: "allow" },
    (err) => {
      if (err) next(err);
    },
  );
});

/**
 * Real files, including dotfile paths.
 *
 * `dotfiles: "allow"` is load-bearing. Express defaults to `"ignore"`, which
 * treats anything under `/.well-known/` as missing and would drop both link
 * verification files into the SPA fallback below — reintroducing the exact bug
 * this file exists to fix.
 */
app.use(
  express.static(DIST, {
    dotfiles: "allow",
    // The SPA fallback owns missing paths; don't let static serve index.html
    // for a bare directory request and bypass it.
    index: false,
    extensions: false,
    redirect: false,
  }),
);

/**
 * SPA fallback — last, so it only sees requests no real file answered.
 *
 * Registered with `app.use` rather than `app.get("*")`: Express 5 runs
 * path-to-regexp v8, which rejects a bare `"*"` pattern outright.
 */
app.use((req, res) => {
  // A missing asset should 404 rather than resolve to an HTML page, which
  // surfaces as a confusing MIME-type error in the browser console.
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(405).type("text/plain").send("Method Not Allowed");
    return;
  }
  res.status(200).sendFile(INDEX);
});

app.listen(PORT, () => {
  console.log(`[serve-dist] serving ${DIST} on :${PORT}`);
});
