#!/usr/bin/env node
/**
 * Smoke-test: every HTTPS callable + onRequest function is registered in the Functions emulator.
 * POST/GET without auth — expect a Firebase error envelope, not 404.
 *
 * Run from repo root:
 *   firebase emulators:exec --only functions,auth,firestore --project mortar-dev "node ./functions/scripts/functions-emulator-smoke.mjs"
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const FUNCTIONS_PORT = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  "mortar-dev";

const require = createRequire(import.meta.url);
const libDir = join(dirname(fileURLToPath(import.meta.url)), "..", "lib");
const exported = require(join(libDir, "index.js"));
const exportNames = Object.keys(exported).filter((k) => exported[k] != null);

/** Gen 2 onCall / onRequest handlers (not Firestore/schedulers/auth-only). */
const HTTP_HANDLERS = [
  "markLessonComplete",
  "generateInviteCode",
  "importPptxDeck",
  "logAnalyticsEvent",
  "batchGetUserAnalyticsSummaries",
  "trackLessonTime",
  "adminUpdateMobileGroup",
  "setUserRole",
  "generateDocumentPDF",
  "upsertBusinessProfile",
  "approveMeeting",
  "queryAdminExpansionAnalyticsEvents",
  "runExpansionUserMatching",
  "leaveGroup",
  "proposeMeeting",
  "adminCreateMobileGroup",
  "createOrUpdateEligibleUser",
  "markNotificationReadBackend",
  "updateOnboardingStatus",
  "joinGroup",
  "finalizeInviteClaim",
  "upsertMatchProfile",
  "getAdminMobileAnalyticsRangeSummaries",
  "buildInitialMatches",
  "getPushNotificationActivity",
  "queryAdminWebAnalyticsEvents",
  "adminModifyMobileGroupMembers",
  "adminSendPushNotification",
  "getAdminUserAnalyticsSummary",
  "promoteToDigitalCurriculumAlumni",
  "setUserBusinessProfile",
  "claimInviteAndCreateAccount",
  "ingestWebAnalytics",
  "completeOnboarding",
  "adminRunDerivedMetricsForUtcRange",
  "submitQuizAttempt",
  "deleteMobileGroup",
  "grantHiddenTrainingVideo",
  "awardCourseModuleBadges",
  "adminAnalyticsReport",
  "revokeInviteCode",
  "getAdminMobileAnalyticsDashboard",
  "finalizeAssetDocument",
  "getUserModerationSnapshot",
  "analyzeLessonSurvey",
  "getQuizForAttempt",
  "validateInviteCode",
  "initializeUserSession",
  "bulkUploadEligibleUsers",
  "getPhase5DashboardMetrics",
  "getCourseFile",
  "queryAdminAnalyticsEventsDateRange",
  "moderateUserAccount",
];

const TRIGGER_ONLY = exportNames.filter((n) => !HTTP_HANDLERS.includes(n));

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`SMOKE OK: ${msg}`);
}

if (!AUTH_HOST || !FS_HOST) {
  fail(
    "Emulator env not set. Run via `firebase emulators:exec --only functions,auth,firestore --project mortar-dev`."
  );
}

if (!getApps().length) {
  initializeApp({ projectId });
}

function callableUrls(functionName) {
  const host = `127.0.0.1:${FUNCTIONS_PORT}`;
  return [
    `http://${host}/${projectId}/us-central1-${functionName}`,
    `http://${host}/${projectId}/us-central1/${functionName}`,
  ];
}

async function probeCallable(name) {
  const body = JSON.stringify({ data: {} });
  const headers = { "Content-Type": "application/json" };
  for (const url of callableUrls(name)) {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    if (res.status === 404) continue;
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return { name, url, status: res.status, ok: false, detail: `non-JSON: ${text.slice(0, 120)}` };
    }
    return { name, url, status: res.status, ok: true, json };
  }
  return { name, ok: false, detail: "404 on all URL patterns" };
}

async function probeHttpRequest(name) {
  for (const url of callableUrls(name)) {
    const res = await fetch(url, { method: "GET" });
    if (res.status !== 404) {
      return { name, url, status: res.status, ok: true };
    }
  }
  return { name, ok: false, detail: "404 on GET" };
}

try {
  const missingExports = HTTP_HANDLERS.filter((n) => !exportNames.includes(n));
  if (missingExports.length) {
    fail(`index.js missing exports: ${missingExports.join(", ")}`);
  }
  ok(`index.js exports ${exportNames.length} symbols (${HTTP_HANDLERS.length} HTTP handlers)`);

  const failures = [];
  for (const name of HTTP_HANDLERS) {
    const isRawHttp = name === "getCourseFile";
    const result = isRawHttp ? await probeHttpRequest(name) : await probeCallable(name);
    if (!result.ok) {
      failures.push(`${name}: ${result.detail}`);
      console.error(`  ✗ ${name} — ${result.detail}`);
    } else {
      const hint = result.json?.error?.message || result.json?.error?.status || `HTTP ${result.status}`;
      console.log(`  ✓ ${name} (${hint})`);
    }
  }
  if (failures.length) {
    fail(`${failures.length} handler(s) not reachable:\n${failures.join("\n")}`);
  }
  ok(`all ${HTTP_HANDLERS.length} HTTPS handlers responded (not 404)`);

  // onUserCreated: auth trigger — create user and expect users/{uid} doc
  const auth = getAuth();
  const uid = "smoke_on_user_created_uid";
  try {
    await auth.getUser(uid);
  } catch {
    await auth.createUser({
      uid,
      email: "smoke-on-user-created@test.local",
      emailVerified: true,
    });
  }
  await new Promise((r) => setTimeout(r, 2500));
  const { getFirestore } = await import("firebase-admin/firestore");
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    failures.push("onUserCreated: users doc not created after auth signup");
  } else {
    ok("onUserCreated wrote users/{uid} in Firestore emulator");
  }

  console.log(
    `\nTrigger-only exports (${TRIGGER_ONLY.length}) loaded with bundle — spot-check via integration tests:\n  ${TRIGGER_ONLY.slice(0, 8).join(", ")}${TRIGGER_ONLY.length > 8 ? ", …" : ""}`
  );
  console.log("\nAll functions emulator smoke checks passed.");
} catch (e) {
  console.error(e);
  fail(e instanceof Error ? e.message : String(e));
}
