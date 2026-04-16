#!/usr/bin/env node
/**
 * Phase 5 emulator sanity check:
 * - writes representative analytics_events through ingestWebAnalytics
 * - verifies daily_metrics counter shape
 * - calls getPhase5DashboardMetrics and prints derived/funnel snapshot
 *
 * Run from repo root:
 * firebase emulators:exec --only functions,auth,firestore --project mortar-dev "node ./functions/scripts/phase5-emulator-check.mjs"
 */
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const FUNCTIONS_PORT = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  "mortar-dev";

if (!AUTH_HOST || !FS_HOST) {
  console.error("Need emulator env vars. Run via firebase emulators:exec.");
  process.exit(1);
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

function utcDateKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  const uid = "phase5_debug_admin_uid";
  try {
    await auth.getUser(uid);
  } catch {
    await auth.createUser({
      uid,
      email: "phase5-debug@example.test",
      emailVerified: true,
      password: "debug-pass-1",
    });
  }
  // Wait briefly in case onUserCreated trigger is still initializing the user doc.
  await new Promise((r) => setTimeout(r, 600));
  await auth.setCustomUserClaims(uid, { roles: ["Admin", "superAdmin"] });
  await db.collection("users").doc(uid).set(
    {
      email: "phase5-debug@example.test",
      roles: ["Admin", "superAdmin"],
      updated_at: new Date(),
    },
    { merge: true }
  );

  const idToken = await signInWithCustomTokenForEmulator(
    await auth.createCustomToken(uid, { purpose: "phase5_debug", roles: ["Admin", "superAdmin"] })
  );

  const events = [
    { event_name: "login_sign_up_succeeded", properties: { mode: "sign_up" } },
    { event_name: "onboarding_final_save_succeeded", properties: {} },
    { event_name: "course_detail_start_lesson_clicked", properties: { course_id: "course_1" } },
    { event_name: "lesson_course_completed", properties: { course_id: "course_1" } },
    { event_name: "lesson_quiz_passed", properties: { course_id: "course_1" } },
    { event_name: "discussion_create_submit_clicked", properties: { category: "General" } },
    { event_name: "shop_add_to_cart_clicked", properties: { item_id: "item_1" } },
    { event_name: "notification_item_clicked", properties: { notification_id: "n1" } },
    { event_name: "notification_mark_read_backend", properties: { notification_id: "n1" } },
  ];

  for (const ev of events) {
    const call = await invokeCallable("ingestWebAnalytics", idToken, {
      event_name: ev.event_name,
      properties: ev.properties,
      client: { platform: "web", locale: "en-US" },
      session_id: "phase5_debug_session",
      screen_session_id: "phase5_debug_screen",
      route_path: "/admin",
      screen_name: "admin_analytics",
      client_timestamp_ms: Date.now(),
    });
    if (!call.res.ok) {
      throw new Error(`ingestWebAnalytics failed for ${ev.event_name}: ${JSON.stringify(call.json)}`);
    }
  }

  // Give Firestore onCreate triggers time to materialize rollups.
  await new Promise((r) => setTimeout(r, 2200));

  const today = utcDateKey();
  const dmSnap = await db.collection("daily_metrics").doc(today).get();
  const dm = dmSnap.data() || {};
  const nestedCounts = dm.counts || {};
  const flatCountKeys = Object.keys(dm).filter((k) => k.startsWith("counts."));

  console.log("\n=== daily_metrics doc check ===");
  console.log("date:", today);
  console.log("dau:", dm.dau, "total_web_events:", dm.total_web_events);
  console.log("nested counts keys:", Object.keys(nestedCounts));
  console.log("flat counts keys:", flatCountKeys);
  console.log("sample counts:", {
    signups: nestedCounts.signups,
    onboarding_completions: nestedCounts.onboarding_completions,
    lessons_started: nestedCounts.lessons_started,
    lessons_completed: nestedCounts.lessons_completed,
    quizzes_passed: nestedCounts.quizzes_passed,
    discussions_created: nestedCounts.discussions_created,
    cart_add_to_cart: nestedCounts.cart_add_to_cart,
    notification_item_clicked: nestedCounts.notification_item_clicked,
  });

  const phase5 = await invokeCallable("getPhase5DashboardMetrics", idToken, { days: 7 });
  console.log("\n=== getPhase5DashboardMetrics ===");
  console.log("http", phase5.res.status, "url", phase5.url);
  if (!phase5.res.ok) {
    console.log(JSON.stringify(phase5.json, null, 2));
    throw new Error("Phase5 callable failed");
  }
  const snapshot = phase5.json?.result?.snapshot;
  console.log(
    JSON.stringify(
      {
        derived: snapshot?.derived,
        funnels: snapshot?.funnels,
        totals: snapshot?.totals,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error("\nPHASE5 EMULATOR CHECK FAILED");
  console.error(e);
  process.exit(1);
});

