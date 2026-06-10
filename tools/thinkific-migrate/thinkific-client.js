/**
 * Minimal Thinkific Public API (v1) client.
 *
 * Auth — two supported methods (the client auto-detects from env):
 *   1. API Access Token (Bearer) — newer. Send:
 *        Authorization: Bearer <token>
 *        X-Auth-Subdomain: <subdomain>
 *      Set THINKIFIC_API_TOKEN (+ optionally THINKIFIC_SUBDOMAIN; if omitted it
 *      is decoded from the token's JWT payload).
 *   2. Legacy API key — send:
 *        X-Auth-API-Key: <key>
 *        X-Auth-Subdomain: <subdomain>
 *      Set THINKIFIC_API_KEY + THINKIFIC_SUBDOMAIN.
 *
 * Where to get them: Thinkific Admin → Settings → Code & Analytics → API.
 *
 * Docs: https://developers.thinkific.com/api/api-documentation/
 *
 * Uses the global `fetch` (Node 18+; this repo runs Node 22). No dependencies.
 */

const BASE_URL = "https://api.thinkific.com/api/public/v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Small delay between requests to stay under Thinkific's burst rate limit. */
const REQUEST_SPACING_MS = 250;

/** Decode the `subdomain` claim from a Thinkific API access token (JWT). */
function subdomainFromToken(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    return JSON.parse(json).subdomain || null;
  } catch {
    return null;
  }
}

class ThinkificClient {
  constructor(opts = {}) {
    this.token = opts.token || process.env.THINKIFIC_API_TOKEN || null;
    this.apiKey = opts.apiKey || process.env.THINKIFIC_API_KEY || null;
    this.subdomain =
      opts.subdomain ||
      process.env.THINKIFIC_SUBDOMAIN ||
      (this.token ? subdomainFromToken(this.token) : null);

    if (!this.token && !this.apiKey) {
      throw new Error(
        "Missing Thinkific credentials. Set THINKIFIC_API_TOKEN (Bearer) or " +
          "THINKIFIC_API_KEY in tools/thinkific-migrate/.env (copy .env.example)."
      );
    }
    if (!this.subdomain) {
      throw new Error(
        "Missing THINKIFIC_SUBDOMAIN (and could not decode it from the token). " +
          "Set it in tools/thinkific-migrate/.env."
      );
    }
  }

  _headers() {
    const h = {
      "X-Auth-Subdomain": this.subdomain,
      "Content-Type": "application/json",
    };
    if (this.token) h["Authorization"] = `Bearer ${this.token}`;
    else h["X-Auth-API-Key"] = this.apiKey;
    return h;
  }

  async _get(pathname, params = {}, attempt = 0) {
    const url = new URL(BASE_URL + pathname);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
    const res = await fetch(url, { headers: this._headers() });

    // Thinkific rate-limits API bursts; honor Retry-After and back off.
    if (res.status === 429 && attempt < 6) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt) * 1000;
      await sleep(waitMs);
      return this._get(pathname, params, attempt + 1);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Thinkific GET ${pathname} -> ${res.status} ${res.statusText}\n${body}`
      );
    }
    return res.json();
  }

  /** Follow pagination and return all `items` across pages. */
  async _getAll(pathname, params = {}) {
    const items = [];
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await this._get(pathname, { ...params, page, limit: 100 });
      if (Array.isArray(data.items)) items.push(...data.items);
      const pag = data.meta && data.meta.pagination;
      if (!pag || !pag.next_page) break;
      page = pag.next_page;
    }
    return items;
  }

  listCourses() {
    return this._getAll("/courses");
  }

  getCourse(courseId) {
    return this._get(`/courses/${courseId}`);
  }

  getChapter(chapterId) {
    return this._get(`/chapters/${chapterId}`);
  }

  getContent(contentId) {
    return this._get(`/contents/${contentId}`);
  }

  /**
   * Fetch a course and expand its chapters + each chapter's contents into a
   * single tree, ready to map onto MORTAR modules/lessons.
   */
  async getCourseTree(courseId) {
    const course = await this.getCourse(courseId);
    const chapterIds = course.chapter_ids || [];
    const chapters = [];
    for (const cid of chapterIds) {
      await sleep(REQUEST_SPACING_MS);
      const chapter = await this.getChapter(cid);
      const contentIds = chapter.content_ids || [];
      const contents = [];
      for (const ctid of contentIds) {
        await sleep(REQUEST_SPACING_MS);
        contents.push(await this.getContent(ctid));
      }
      chapters.push({ ...chapter, contents });
    }
    return { ...course, chapters };
  }
}

/** Load tools/thinkific-migrate/.env into process.env (no dotenv dependency). */
function loadDotEnv(dir = __dirname) {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(dir, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8").replace(/^﻿/, "");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

module.exports = { ThinkificClient, loadDotEnv, BASE_URL };
