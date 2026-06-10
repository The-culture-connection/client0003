/**
 * Authenticated client for Thinkific's INTERNAL course-player API.
 *
 * The public REST API (thinkific-client.js) returns only content metadata — no
 * HTML bodies, no quiz/survey questions. The learner web app, however, is a SPA
 * backed by an internal JSON API at /api/course_player/v2/* which DOES return
 * full content. That API authenticates with the browser session cookie.
 *
 * This is unofficial/undocumented and may change — it's used here only for a
 * one-time migration of your own course content.
 *
 * Auth: set THINKIFIC_COOKIE in tools/thinkific-migrate/.env to the full Cookie
 * header copied from a logged-in admin browser session (see README → "Capturing
 * a session cookie"). THINKIFIC_SUBDOMAIN is reused from .env.
 *
 * Uses global fetch (Node 22). No dependencies.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const REQUEST_SPACING_MS = 300;

function requireEnv(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing ${name}. Set it in tools/thinkific-migrate/.env ` +
        `(see README → "Capturing a session cookie").`
    );
  }
  return v.trim();
}

class ThinkificPlayer {
  constructor(opts = {}) {
    this.subdomain = opts.subdomain || requireEnv("THINKIFIC_SUBDOMAIN");
    this.cookie = opts.cookie || requireEnv("THINKIFIC_COOKIE");
    this.base = `https://${this.subdomain}.thinkific.com`;
  }

  _headers() {
    return {
      Cookie: this.cookie,
      Accept: "application/json, text/plain, */*",
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: `${this.base}/`,
    };
  }

  /** Raw GET against the school domain. `pathname` begins with "/". */
  async get(pathname, attempt = 0) {
    const res = await fetch(this.base + pathname, {
      headers: this._headers(),
      redirect: "manual",
    });

    // A 30x to /users/sign_in means the cookie is missing/expired.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") || "";
      if (/sign_in/.test(loc)) {
        throw new Error(
          `Not authenticated (redirected to sign-in) for ${pathname}. ` +
            `Your THINKIFIC_COOKIE is missing or expired — recapture it.`
        );
      }
    }
    if (res.status === 429 && attempt < 6) {
      await sleep(2 ** attempt * 1000);
      return this.get(pathname, attempt + 1);
    }
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `Player GET ${pathname} -> ${res.status} ${res.statusText}\n${text.slice(0, 300)}`
      );
    }
    const ctype = res.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Player GET ${pathname} returned non-JSON body.`);
      }
    }
    // Not JSON — likely the SPA HTML shell (wrong endpoint). Return raw for inspection.
    return { __nonJson: true, status: res.status, length: text.length, body: text };
  }

  /** Content detail via the internal course-player API. */
  content(contentId) {
    return this.get(`/api/course_player/v2/contents/${contentId}`);
  }
}

module.exports = { ThinkificPlayer, REQUEST_SPACING_MS, sleep };
