#!/usr/bin/env node
/**
 * Phase 6 badge system — emulator check:
 * - Seeds `badge_definitions` with `rule` (one-time + repeatable).
 * - Sends `lesson_course_completed` via `ingestWebAnalytics` so Phase 4 rollups update `user_analytics_summary`.
 * - Asserts `onUserAnalyticsSummaryWritten` materialized `user_badges/{uid}/awarded/*` and `badge_progress/{uid}`.
 *
 * From repo root:
 *   firebase emulators:exec --only functions,auth,firestore --project mortar-dev "node ./functions/scripts/phase6-badge-emulator-check.mjs"
 *
 * Or: npm run test:analytics:phase6
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FUNCTIONS_PORT = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  "mortar-dev";

const BADGE_ONE = "emulator_phase6_one_lesson";
const BADGE_REPEAT = "emulator_phase6_every_two_lessons";

function fail(msg) {
  console.error(`PHASE6 BADGE CHECK FAIL: ${msg}`);
  process.exit(1);
}

if (!AUTH_HOST || !FS_HOST) {
  fail(
    "Run via firebase emulators:exec (need FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST)."
  );
}

if (!getApps().length) {
  initializeApp({ projectId });
}
const auth = getAuth();
const db = getFirestore();

function callableUrls(functionName) {
  const host = `127.0.0.1:${FUNCTIONS_PORT}`;
  return [
    `http://${host}/${projectId}/us-central1-${functionName}`,
    `http://${host}/${projectId}/us-central1/${functionName}`,
  ];
}

async function signInWithCustomTokenForEmulator(customToken) {
  const apiKey = "demo-api-key";
  const url = `http://${AUTH_HOST.replace("localhost", "127.0.0.1")}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok || !json.idToken) {
    throw new Error(`Auth sign-in failed ${res.status}: ${JSON.stringify(json)}`);
  }
  return json.idToken;
}

async function invokeCallable(functionName, idToken, data) {
  const body = JSON.stringify({ data });
  const headers = { "Content-Type": "application/json" };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  let lastErr = null;
  for (const url of callableUrls(functionName)) {
    const res = await fetch(url, { method: "POST", headers, body });
    const text = await res.text();
    let json = {};
    try {
      json = JSON.parse(text);
    } catch {
      lastErr = new Error(`Non-JSON from ${url}: ${text.slice(0, 200)}`);
      continue;
    }
    if (res.status === 404) {
      lastErr = new Error(`404 from ${url}`);
      continue;
    }
    return { res, json, url };
  }
  throw lastErr || new Error("No callable URL succeeded");
}

async function ingestLessonCompleted(idToken, courseId) {
  const call = await invokeCallable("ingestWebAnalytics", idToken, {
    event_name: "lesson_course_completed",
    properties: { course_id: courseId },
    client: { platform: "web", locale: "en-US" },
    session_id: "phase6_badge_session",
    screen_session_id: "phase6_badge_screen",
    route_path: "/learn",
    screen_name: "lesson_player",
    client_timestamp_ms: Date.now(),
  });
  if (!call.res.ok) {
    fail(`ingestWebAnalytics: ${JSON.stringify(call.json)}`);
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const uid = `phase6_badge_${Date.now()}`;
  console.log("Test uid:", uid);

  await auth.createUser({
    uid,
    email: `${uid}@example.test`,
    emailVerified: true,
    password: "phase6-badge-test-1",
  });
  await sleep(400);
  await auth.setCustomUserClaims(uid, { roles: ["Admin"] });
  await db.collection("users").doc(uid).set(
    {
      email: `${uid}@example.test`,
      roles: ["admin"],
      badges: { earned: [], visible: [] },
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  /** Staff-seeded definitions (same shape as production Console). */
  await db
    .collection("badge_definitions")
    .doc(BADGE_ONE)
    .set(
      {
        name: "Emulator — first lesson completion",
        description: "Complete at least one lesson (all-time).",
        display_order: 1,
        tier: "test",
        active: true,
        award_mode: "one_time",
        rule: {
          metric_key: "lessons_completed",
          operator: "gte",
          threshold: 1,
          timeframe: "all_time",
        },
      },
      { merge: true }
    );

  await db
    .collection("badge_definitions")
    .doc(BADGE_REPEAT)
    .set(
      {
        name: "Emulator — every 2 completions",
        description: "Repeatable: floor(lessons_completed / 2) awards.",
        display_order: 2,
        tier: "test",
        active: true,
        award_mode: "repeatable",
        rule: {
          metric_key: "lessons_completed",
          operator: "gte",
          threshold: 2,
          timeframe: "all_time",
        },
      },
      { merge: true }
    );

  const idToken = await signInWithCustomTokenForEmulator(
    await auth.createCustomToken(uid, { purpose: "phase6_badge", roles: ["Admin"] })
  );

  console.log("\n--- Ingest 1x lesson_course_completed (expect one-time badge) ---");
  await ingestLessonCompleted(idToken, "emulator_course_1");
  await sleep(3500);

  const sum1 = (await db.collection("user_analytics_summary").doc(uid).get()).data() || {};
  const c1 = sum1.counts || {};
  const lessons1 = typeof c1.lessons_completed === "number" ? c1.lessons_completed : 0;
  console.log("user_analytics_summary.lessons_completed:", lessons1);
  if (lessons1 < 1) {
    fail(`Expected lessons_completed >= 1, got ${lessons1}`);
  }

  const oneDoc = await db.collection("user_badges").doc(uid).collection("awarded").doc(BADGE_ONE).get();
  if (!oneDoc.exists) {
    fail(`Missing user_badges/${uid}/awarded/${BADGE_ONE}`);
  }
  const oneData = oneDoc.data();
  console.log(`${BADGE_ONE} awarded:`, oneData);
  if ((oneData?.times_awarded ?? 0) !== 1) {
    fail(`Expected times_awarded === 1 for ${BADGE_ONE}, got ${oneData?.times_awarded}`);
  }

  const userAfterOne = (await db.collection("users").doc(uid).get()).data() || {};
  const earned = Array.isArray(userAfterOne.badges?.earned) ? userAfterOne.badges.earned : [];
  if (!earned.includes(BADGE_ONE)) {
    fail(`users.badges.earned should include ${BADGE_ONE}, got ${JSON.stringify(earned)}`);
  }
  console.log("users.badges.earned includes one-time badge: OK");

  const rep0 = await db.collection("user_badges").doc(uid).collection("awarded").doc(BADGE_REPEAT).get();
  const rep0Times = rep0.exists ? rep0.data()?.times_awarded ?? 0 : 0;
  if (rep0Times !== 0) {
    fail(`Repeatable badge should be 0 awards after 1 completion, got ${rep0Times}`);
  }
  console.log(`${BADGE_REPEAT} times_awarded after 1 completion: 0 OK`);

  console.log("\n--- Ingest 2nd lesson_course_completed (expect repeatable tier 1) ---");
  await ingestLessonCompleted(idToken, "emulator_course_1");
  await sleep(3500);

  const sum2 = (await db.collection("user_analytics_summary").doc(uid).get()).data() || {};
  const c2 = sum2.counts || {};
  const lessons2 = typeof c2.lessons_completed === "number" ? c2.lessons_completed : 0;
  if (lessons2 < 2) {
    fail(`Expected lessons_completed >= 2, got ${lessons2}`);
  }

  const rep1 = await db.collection("user_badges").doc(uid).collection("awarded").doc(BADGE_REPEAT).get();
  if (!rep1.exists) {
    fail(`Missing user_badges/${uid}/awarded/${BADGE_REPEAT} after 2 completions`);
  }
  const rep1Data = rep1.data();
  console.log(`${BADGE_REPEAT} awarded:`, rep1Data);
  if ((rep1Data?.times_awarded ?? 0) !== 1) {
    fail(`Expected repeatable times_awarded === 1 after 2 completions, got ${rep1Data?.times_awarded}`);
  }

  console.log("\n--- Ingest 3rd + 4th completions (expect repeatable tier 2) ---");
  await ingestLessonCompleted(idToken, "emulator_course_1");
  await ingestLessonCompleted(idToken, "emulator_course_1");
  await sleep(4000);

  const rep2 = await db.collection("user_badges").doc(uid).collection("awarded").doc(BADGE_REPEAT).get();
  const rep2Data = rep2.data();
  console.log(`${BADGE_REPEAT} after 4 completions:`, rep2Data);
  if ((rep2Data?.times_awarded ?? 0) !== 2) {
    fail(`Expected repeatable times_awarded === 2 after 4 completions, got ${rep2Data?.times_awarded}`);
  }

  const prog = (await db.collection("badge_progress").doc(uid).get()).data() || {};
  console.log("\n=== badge_progress.by_badge (excerpt) ===");
  console.log(JSON.stringify(prog.by_badge, null, 2));
  if (!prog.by_badge?.[BADGE_ONE] || !prog.by_badge?.[BADGE_REPEAT]) {
    fail("badge_progress.by_badge should include both badge ids");
  }

  console.log("\nPHASE6 BADGE EMULATOR CHECK: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
