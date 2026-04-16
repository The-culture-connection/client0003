#!/usr/bin/env node
/**
 * Unit test layer (no emulators): contract file readable, TypeScript shape, compiled Zod
 * matches `logAnalyticsEvent` inbound validation (malformed → reject, valid mock → accept).
 */
import {readFileSync, existsSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {spawnSync} from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contractPath = join(root, "src", "analytics", "mortarAnalyticsContract.ts");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

// 1) Schema file exists and is readable
if (!existsSync(contractPath)) {
  fail(`missing contract file: ${contractPath}`);
}
const src = readFileSync(contractPath, "utf8");
if (!src.includes("ANALYTICS_EVENTS") || !src.includes("CLIENT_INGESTIBLE_EVENT_NAMES")) {
  fail("contract file does not look like the analytics schema");
}
ok(`schema file exists and is readable (${contractPath})`);

// 2) TypeScript: positive file must compile; negative must not
function resolveTscJs() {
  const candidates = [
    join(root, "node_modules", "typescript", "lib", "tsc.js"),
    join(root, "..", "node_modules", "typescript", "lib", "tsc.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const tscJs = resolveTscJs();
if (!tscJs) {
  fail("Could not find typescript/lib/tsc.js (run npm install at repo root or in functions/)");
}

const baseArgs = [
  "--noEmit",
  "--strict",
  "--module",
  "commonjs",
  "--moduleResolution",
  "node",
  "--esModuleInterop",
  "--target",
  "ES2022",
  "--skipLibCheck",
];

const pos = join(root, "scripts", "analytics-typecheck-positive.ts");
const neg = join(root, "scripts", "analytics-typecheck-negative.ts");

const posRun = spawnSync(process.execPath, [tscJs, ...baseArgs, pos], {
  cwd: root,
  encoding: "utf8",
});
if (posRun.status !== 0) {
  console.error(posRun.stdout, posRun.stderr);
  fail("TypeScript: valid LogAnalyticsEventRequest should typecheck");
}
ok("TypeScript enforces shape (valid assignment typechecks)");

const negRun = spawnSync(process.execPath, [tscJs, ...baseArgs, neg], {
  cwd: root,
  encoding: "utf8",
});
if (negRun.status === 0) {
  fail("TypeScript: invalid event_name should NOT typecheck (expected tsc error)");
}
ok("TypeScript rejects invalid event_name (tsc failed as expected)");

// 3–4) Zod (compiled) — same validator as logAnalyticsEvent callable
const schemaUrl = pathToFileURL(join(root, "lib", "analytics", "inboundAnalyticsPayload.js")).href;
const {logAnalyticsEventInboundSchema} = await import(schemaUrl);

const validPayload = {
  event_name: "page_view",
  properties: {route: "/mock"},
  client: {platform: "web", locale: "en-US"},
  session_id: "12345678",
};

const good = logAnalyticsEventInboundSchema.safeParse(validPayload);
if (!good.success) {
  console.error(good.error?.flatten());
  fail(`valid mock event should parse: ${good.error?.message}`);
}
ok("Zod accepts valid mock event (matches callable validation)");

const malformedCases = [
  {label: "missing client", data: {event_name: "page_view"}},
  {label: "camelCase event_name", data: {event_name: "badCamel", client: {platform: "web"}}},
  {label: "unknown snake event", data: {event_name: "unknown_event_xyz", client: {platform: "web"}}},
  {label: "extra top-level field", data: {...validPayload, extra_field: 1}},
  {label: "nested properties object", data: {event_name: "page_view", client: {platform: "web"}, properties: {nested: {a: 1}}}},
];

for (const {label, data} of malformedCases) {
  const bad = logAnalyticsEventInboundSchema.safeParse(data);
  if (bad.success) {
    fail(`malformed case should reject: "${label}"`);
  }
}
ok(`Zod rejects ${malformedCases.length} malformed payload categories`);

console.log("\nAll analytics phase checks passed.");
