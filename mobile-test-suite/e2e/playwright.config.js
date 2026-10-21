import {readFileSync, existsSync} from "node:fs";
import {defineConfig, devices} from "@playwright/test";

// Local runs read ./.env (git-ignored); CI passes the same names as env vars.
if (existsSync(new URL("./.env", import.meta.url))) {
  for (const line of readFileSync(new URL("./.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const baseURL = process.env.SUITE_URL || "https://mortar-mobile-test-suite.up.railway.app";
const password = process.env.SUITE_PASSWORD;

export default defineConfig({
  testDir: "./tests",
  // Every test signs in as the same QA account and resets it, so they must
  // not overlap.
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: {timeout: 20_000},
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", {open: "never"}]] : [["list"]],
  use: {
    baseURL,
    httpCredentials: password ? {username: "qa", password} : undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {name: "iphone", use: {...devices["iPhone 13"], browserName: "chromium"}},
  ],
});
