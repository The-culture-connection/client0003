#!/usr/bin/env node
/**
 * Integration layer: real HTTPS callable round-trip against the Functions + Auth + Firestore emulators.
 *
 * Run from repo root (where firebase.json lives):
 *   firebase emulators:exec --only functions,auth,firestore --project mortar-dev "node ./functions/scripts/analytics-callable-integration.mjs"
 *
 * Or: npm run test:analytics:integration
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";

const FUNCTIONS_PORT = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "";
const FS_HOST = process.env.FIRESTORE_EMULATOR_HOST || "";

function fail(msg) {
  console.error(`INTEGRATION FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`INTEGRATION OK: ${msg}`);
}

if (!AUTH_HOST || !FS_HOST) {
  fail(
    "Emulator env not set (expected FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST). " +
      "Run via `firebase emulators:exec ...` from the repo root, or `npm run test:analytics:integration`."
  );
}

const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  "mortar-dev";

const testUid = "analytics_integration_uid_v1";

if (!getApps().length) {
  initializeApp({projectId});
}

const auth = getAuth();
const db = getFirestore();

async function signInWithCustomTokenForEmulator(customToken) {
  const apiKey = "demo-api-key";
  const url = `http://${AUTH_HOST.replace("localhost", "127.0.0.1")}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({token: customToken, returnSecureToken: true}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`Auth emulator signInWithCustomToken HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  if (!json.idToken) {
    fail(`Auth emulator response missing idToken: ${JSON.stringify(json)}`);
  }
  return json.idToken;
}

function callableUrls(functionName) {
  const host = `127.0.0.1:${FUNCTIONS_PORT}`;
  return [
    `http://${host}/${projectId}/us-central1-${functionName}`,
    `http://${host}/${projectId}/us-central1/${functionName}`,
  ];
}

async function invokeCallable(functionName, idToken, data) {
  const body = JSON.stringify({data});
  const headers = {
    "Content-Type": "application/json",
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  let lastErr = null;
  for (const url of callableUrls(functionName)) {
    const res = await fetch(url, {method: "POST", headers, body});
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      lastErr = new Error(`Non-JSON (${url}) HTTP ${res.status}: ${text.slice(0, 400)}`);
      continue;
    }
    if (res.status === 404) {
      lastErr = new Error(`404 from ${url}`);
      continue;
    }
    return {res, json, url};
  }
  throw lastErr || new Error("invokeCallable: no URL succeeded");
}

try {
  try {
    await auth.getUser(testUid);
  } catch {
    await auth.createUser({
      uid: testUid,
      email: "analytics-integration@example.test",
      emailVerified: true,
      password: "integration-test-1",
    });
  }

  const customToken = await auth.createCustomToken(testUid, {purpose: "analytics_integration"});
  const idToken = await signInWithCustomTokenForEmulator(customToken);
  ok("obtained ID token via Auth emulator (custom token exchange)");

  const validPayload = {
    event_name: "page_view",
    properties: {route: "/integration-test"},
    client: {platform: "web", locale: "en-US"},
    session_id: "12345678",
  };

  const good = await invokeCallable("logAnalyticsEvent", idToken, validPayload);
  if (!good.res.ok) {
    fail(`valid callable HTTP ${good.res.status} from ${good.url}: ${JSON.stringify(good.json)}`);
  }
  if (good.json?.error) {
    fail(`valid callable returned error envelope: ${JSON.stringify(good.json)}`);
  }
  const result = good.json?.result;
  if (!result?.success || !result?.event_id) {
    fail(`unexpected success shape: ${JSON.stringify(good.json)}`);
  }
  ok(`callable accepted valid event (event_id=${result.event_id})`);

  const doc = await db.collection("analytics_raw_events").doc(result.event_id).get();
  if (!doc.exists) {
    fail(`Firestore missing analytics_raw_events/${result.event_id}`);
  }
  const d = doc.data();
  if (d?.event_name !== "page_view" || d?.user_id !== testUid) {
    fail(`raw event doc mismatch: ${JSON.stringify(d)}`);
  }
  ok("Firestore emulator contains canonical raw event document");

  const badMissingClient = await invokeCallable("logAnalyticsEvent", idToken, {
    event_name: "page_view",
  });
  if (badMissingClient.res.ok && !badMissingClient.json?.error) {
    fail("expected callable to reject payload missing client");
  }
  ok("callable rejected malformed payload (missing client)");

  const badUnknownEvent = await invokeCallable("logAnalyticsEvent", idToken, {
    event_name: "totally_unknown_event_name",
    client: {platform: "web"},
  });
  if (badUnknownEvent.res.ok && !badUnknownEvent.json?.error) {
    fail("expected callable to reject unknown event_name");
  }
  ok("callable rejected unknown event_name");

  const badCamel = await invokeCallable("logAnalyticsEvent", idToken, {
    event_name: "BadCamelCase",
    client: {platform: "web"},
  });
  if (badCamel.res.ok && !badCamel.json?.error) {
    fail("expected callable to reject non-snake_case event_name");
  }
  ok("callable rejected non-snake_case event_name");

  const webPayloadAuthed = {
    event_name: "screen_session_started",
    properties: {screen_name: "integration_screen"},
    client: {platform: "web", locale: "en-US"},
    session_id: "12345678ab",
    screen_session_id: "87654321cd",
    route_path: "/integration",
    screen_name: "integration_screen",
    client_timestamp_ms: Date.now(),
  };
  const webGood = await invokeCallable("ingestWebAnalytics", idToken, webPayloadAuthed);
  if (!webGood.res.ok) {
    fail(`ingestWebAnalytics authed HTTP ${webGood.res.status}: ${JSON.stringify(webGood.json)}`);
  }
  const webResult = webGood.json?.result;
  if (!webResult?.success || !webResult?.event_id) {
    fail(`ingestWebAnalytics unexpected shape: ${JSON.stringify(webGood.json)}`);
  }
  const webDoc = await db.collection("analytics_events").doc(webResult.event_id).get();
  if (!webDoc.exists) {
    fail(`Firestore missing analytics_events/${webResult.event_id}`);
  }
  const wd = webDoc.data();
  if (wd?.schema_version !== 2 || wd?.event_name !== "screen_session_started" || wd?.user_id !== testUid) {
    fail(`analytics_events doc mismatch: ${JSON.stringify(wd)}`);
  }
  ok("ingestWebAnalytics (authed) wrote normalized analytics_events document");

  const webAnon = await invokeCallable("ingestWebAnalytics", null, {
    event_name: "login_submit_attempted",
    properties: {mode: "sign_in"},
    client: {platform: "web"},
    session_id: "12345678ab",
  });
  if (!webAnon.res.ok) {
    fail(`ingestWebAnalytics anon HTTP ${webAnon.res.status}: ${JSON.stringify(webAnon.json)}`);
  }
  const anonId = webAnon.json?.result?.event_id;
  if (!anonId) {
    fail("ingestWebAnalytics anon missing event_id");
  }
  const anonDoc = await db.collection("analytics_events").doc(anonId).get();
  if (!anonDoc.exists || anonDoc.data()?.user_id != null) {
    fail(`expected anonymous web event doc, got: ${JSON.stringify(anonDoc.data())}`);
  }
  ok("ingestWebAnalytics (anonymous allowlist) accepted login_submit_attempted");

  const webRejectAnon = await invokeCallable("ingestWebAnalytics", null, {
    event_name: "shop_add_to_cart_clicked",
    properties: {},
    client: {platform: "web"},
    session_id: "12345678ab",
  });
  if (webRejectAnon.res.ok && !webRejectAnon.json?.error) {
    fail("expected ingestWebAnalytics to reject unauthenticated non-allowlisted event");
  }
  ok("ingestWebAnalytics rejected unauthenticated disallowed event");

  console.log("\nAll analytics callable integration checks passed.");
} catch (e) {
  console.error(e);
  fail(e instanceof Error ? e.message : String(e));
}
