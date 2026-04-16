#!/usr/bin/env node
/**
 * Runs before `vite build` via npm `prebuild`, or inline before `vite build --mode X`.
 * Merges `.env`, `.env.<mode>`, `.env.<mode>.local` (later overrides earlier), matching Vite’s
 * layering for that mode, then prints which Firebase project the client bundle will use
 * (same rules as src/app/lib/firebase.ts).
 *
 * Positional mode: `node ./scripts/print-firebase-env.mjs staging`
 * Default mode when omitted: `production` (matches `vite build --mode production`).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/** @returns {Record<string, string>} */
function parseEnvFile(relPath) {
  const p = resolve(process.cwd(), relPath);
  if (!existsSync(p)) return {};
  const text = readFileSync(p, "utf8");
  /** @type {Record<string, string>} */
  const out = {};
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function loadModeEnv(mode) {
  const merged = {
    ...parseEnvFile(".env"),
    ...parseEnvFile(`.env.${mode}`),
    ...parseEnvFile(`.env.${mode}.local`),
  };
  for (const [key, val] of Object.entries(merged)) {
    if (val === "") continue;
    process.env[key] = val;
  }
}

const argMode = process.argv[2];
const mode =
  argMode && !argMode.startsWith("-")
    ? argMode.trim()
    : (process.env.VITE_BUILD_MODE || "production").trim();

loadModeEnv(mode);

const apiKey = process.env.VITE_FIREBASE_API_KEY;
const pid = process.env.VITE_FIREBASE_PROJECT_ID;
const appId = process.env.VITE_FIREBASE_APP_ID;
const envVar = process.env.VITE_FIREBASE_ENV;

let resolved;
let label;

if (pid?.trim() && apiKey?.trim() && appId?.trim()) {
  resolved = pid.trim();
  label = "explicit VITE_FIREBASE_* (apiKey + projectId + appId set)";
} else {
  const v = (envVar || "dev").toLowerCase().trim();
  if (v === "stage" || v === "staging") {
    resolved = "mortar-stage";
    label = "preset stage (VITE_FIREBASE_ENV=stage|staging)";
  } else if (v === "prod" || v === "production") {
    resolved = pid?.trim() || "mortar-9d29d";
    label = "preset prod (VITE_FIREBASE_ENV=prod|production)";
  } else {
    resolved = "mortar-dev";
    label = "preset dev (VITE_FIREBASE_ENV unset or dev)";
  }
}

const lines = [
  "",
  "MORTAR_FIREBASE_BUILD_TARGET_START",
  `VITE_MODE=${JSON.stringify(mode)}`,
  `VITE_FIREBASE_ENV=${JSON.stringify(envVar ?? "(not set)")}`,
  `VITE_FIREBASE_PROJECT_ID=${JSON.stringify(pid ?? "(not set)")}`,
  `BUNDLED_FIREBASE_PROJECT_ID=${resolved}`,
  `RESOLUTION=${label}`,
  "MORTAR_FIREBASE_BUILD_TARGET_END",
  "",
];

process.stdout.write(lines.join("\n"));
