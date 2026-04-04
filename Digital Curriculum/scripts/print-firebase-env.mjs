#!/usr/bin/env node
/**
 * Runs before `vite build` via npm `prebuild`.
 * Prints which Firebase project the client bundle will use (same rules as src/app/lib/firebase.ts).
 * Railway / Nixpacks always shows this in build logs — no dependency on Vite plugin hooks.
 */

const apiKey = process.env.VITE_FIREBASE_API_KEY
const pid = process.env.VITE_FIREBASE_PROJECT_ID
const appId = process.env.VITE_FIREBASE_APP_ID
const envVar = process.env.VITE_FIREBASE_ENV

let resolved
let label

if (pid?.trim() && apiKey?.trim() && appId?.trim()) {
  resolved = pid.trim()
  label = "explicit VITE_FIREBASE_* (apiKey + projectId + appId set)"
} else {
  const v = (envVar || "dev").toLowerCase().trim()
  if (v === "stage" || v === "staging") {
    resolved = "mortar-stage"
    label = "preset stage (VITE_FIREBASE_ENV=stage|staging)"
  } else if (v === "prod" || v === "production") {
    resolved = pid?.trim() || "mortar-9d29d"
    label = "preset prod (VITE_FIREBASE_ENV=prod|production)"
  } else {
    resolved = "mortar-dev"
    label = "preset dev (VITE_FIREBASE_ENV unset or dev)"
  }
}

const lines = [
  "",
  "MORTAR_FIREBASE_BUILD_TARGET_START",
  `VITE_FIREBASE_ENV=${JSON.stringify(envVar ?? "(not set)")}`,
  `VITE_FIREBASE_PROJECT_ID=${JSON.stringify(pid ?? "(not set)")}`,
  `BUNDLED_FIREBASE_PROJECT_ID=${resolved}`,
  `RESOLUTION=${label}`,
  "MORTAR_FIREBASE_BUILD_TARGET_END",
  "",
]

process.stdout.write(lines.join("\n"))
