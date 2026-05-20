#!/usr/bin/env node
/**
 * Email + graduation trigger smoke test against Firebase emulators (mortar-dev).
 *
 * Prerequisites:
 *   1. `cd functions && npm run build`
 *   2. Brevo key for real sends: create `functions/.secret.local` with:
 *        BREVO_API_KEY=xkeysib-...
 *      (file is gitignored via *.local)
 *
 * Run from repo root:
 *   npx firebase-tools@latest emulators:exec --only functions,auth,firestore --project mortar-dev "node ./functions/scripts/emulator-email-test.mjs"
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const FUNCTIONS_PORT = process.env.FUNCTIONS_EMULATOR_PORT || "5001";
const projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  process.env.FIREBASE_PROJECT_ID ||
  "mortar-dev";

const require = createRequire(import.meta.url);
const libDir = join(dirname(fileURLToPath(import.meta.url)), "..", "lib");
const exported = require(join(libDir, "index.js"));

const ADMIN_UID = "email_test_admin_uid";
const STUDENT_UID = "email_test_student_uid";
const TEST_EMAIL = process.env.EMAIL_TEST_TO || "email-smoke@test.local";

function fail(msg) {
  console.error(`\nEMAIL TEST FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

function callableUrl(name) {
  return `http://127.0.0.1:${FUNCTIONS_PORT}/${projectId}/us-central1/${name}`;
}

async function callCallable(name, data, idToken) {
  const res = await fetch(callableUrl(name), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { status: res.status, raw: text, error: { message: text.slice(0, 200) } };
  }
  return { status: res.status, json };
}

function hasBrevoSecretHint() {
  const localPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".secret.local");
  if (existsSync(localPath)) {
    const txt = readFileSync(localPath, "utf8");
    if (/BREVO_API_KEY\s*=\s*\S+/.test(txt)) return true;
  }
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

async function main() {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIRESTORE_EMULATOR_HOST) {
    fail("Run via firebase emulators:exec (auth + firestore + functions).");
  }

  const emailExports = [
    "adminSendTestBrevoEmail",
    "adminSendEventRegistrantEmail",
    "adminSendCustomAnnouncementEmail",
    "onGraduationApplicationEmail",
    "onUserAlumniAdmittedEmail",
    "scheduledCourseInactiveEmailNudges",
  ];

  console.log(`\nEmail emulator test — project ${projectId}\n`);

  for (const name of emailExports) {
    if (exported[name] == null) fail(`Missing export: ${name}`);
  }
  ok(`All ${emailExports.length} email-related exports loaded`);

  if (!hasBrevoSecretHint()) {
    warn(
      "No BREVO_API_KEY in functions/.secret.local or env — callables may skip/fail sends; triggers still run."
    );
  } else {
    ok("Brevo secret hint present (.secret.local or BREVO_API_KEY env)");
  }

  if (!getApps().length) initializeApp({ projectId });

  const auth = getAuth();
  const db = getFirestore();

  // Admin user for callables
  try {
    await auth.getUser(ADMIN_UID);
  } catch {
    await auth.createUser({
      uid: ADMIN_UID,
      email: "admin-email-test@test.local",
      emailVerified: true,
    });
  }
  // onUserCreated may assign default Student role — set Admin after trigger settles
  await new Promise((r) => setTimeout(r, 1500));
  await db.collection("users").doc(ADMIN_UID).set(
    {
      email: "admin-email-test@test.local",
      roles: ["Admin"],
      email_pref_admin_messages: true,
      email_pref_graduation_updates: true,
      email_pref_events: true,
      email_pref_course_nudges: true,
    },
    { merge: true }
  );

  const customToken = await auth.createCustomToken(ADMIN_UID);
  const signInRes = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const signInJson = await signInRes.json();
  const idToken = signInJson.idToken;
  if (!idToken) fail(`Could not sign in admin test user: ${JSON.stringify(signInJson)}`);
  ok("Admin test user authenticated against Auth emulator");

  // 1) Callable reachable
  const probe = await callCallable("adminSendTestBrevoEmail", {}, idToken);
  if (probe.status === 404) fail("adminSendTestBrevoEmail returned 404");
  if (probe.json?.error?.status === "PERMISSION_DENIED") {
    fail("adminSendTestBrevoEmail: admin user lacks Admin role (onUserCreated race?)");
  }
  ok(`adminSendTestBrevoEmail reachable (HTTP ${probe.status})`);

  // 2) Optional real send (template 8 = graduation_meeting_time_selected)
  if (hasBrevoSecretHint()) {
    const send = await callCallable(
      "adminSendTestBrevoEmail",
      {
        to: TEST_EMAIL,
        templateId: 8,
        params: { first_name: "Emulator", meeting_time: "5/20/2026 at 10:00" },
      },
      idToken
    );
    if (send.json?.error) {
      warn(`adminSendTestBrevoEmail send: ${send.json.error.message}`);
    } else if (send.json?.result?.ok) {
      ok(`adminSendTestBrevoEmail sent (messageId: ${send.json.result.messageId ?? "n/a"})`);
    } else {
      warn(`adminSendTestBrevoEmail response: ${JSON.stringify(send.json)}`);
    }
  }

  // 3) Graduation meeting-time trigger
  try {
    await auth.getUser(STUDENT_UID);
  } catch {
    await auth.createUser({
      uid: STUDENT_UID,
      email: TEST_EMAIL,
      emailVerified: true,
    });
  }
  await db.collection("users").doc(STUDENT_UID).set(
    {
      email: TEST_EMAIL,
      roles: ["Digital Curriculum Students"],
      email_pref_graduation_updates: true,
    },
    { merge: true }
  );

  const appRef = db.collection("GraduationApplications").doc("email_test_app_1");
  await appRef.set({
    userId: STUDENT_UID,
    userEmail: TEST_EMAIL,
    userName: "Emulator Student",
    status: "pending",
    availabilitySlots: [],
    createdAt: FieldValue.serverTimestamp(),
  });
  await new Promise((r) => setTimeout(r, 2000));

  await appRef.update({
    status: "accepted",
    selectedTime: "5/21/2026 at 14:00",
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: ADMIN_UID,
  });
  await new Promise((r) => setTimeout(r, 4000));

  const afterMeeting = await appRef.get();
  if (afterMeeting.data()?.brevo_email_meeting_sent_at) {
    ok("onGraduationApplicationEmail set brevo_email_meeting_sent_at (meeting-time email)");
  } else {
    warn("brevo_email_meeting_sent_at not set — check emulator logs for onGraduationApplicationEmail");
  }

  const activity = await db
    .collection("email_activity")
    .orderBy("created_at", "desc")
    .limit(3)
    .get()
    .catch(() => null);
  if (activity && !activity.empty) {
    ok(`email_activity has ${activity.size} recent row(s)`);
    activity.docs.forEach((d) => {
      const x = d.data();
      console.log(`      · ${x.status} template=${x.template_id} recipient=${x.recipient}`);
    });
  } else {
    warn("No email_activity rows yet (expected if Brevo key missing or send skipped)");
  }

  // 4) Alumni admitted trigger
  await db.collection("users").doc(STUDENT_UID).update({
    roles: ["Digital Curriculum Alumni"],
    updated_at: FieldValue.serverTimestamp(),
  });
  await new Promise((r) => setTimeout(r, 3000));
  const userAfter = await db.collection("users").doc(STUDENT_UID).get();
  if (userAfter.data()?.brevo_email_admitted_sent_at) {
    ok("onUserAlumniAdmittedEmail set brevo_email_admitted_sent_at");
  } else if (hasBrevoSecretHint()) {
    warn("Admit email trigger may have failed — check functions emulator logs");
  } else {
    ok("User roles updated (admit trigger needs BREVO_API_KEY to send)");
  }

  // 5) Reject trigger
  await appRef.update({
    status: "rejected",
    notes: "Emulator test rejection",
    reviewedAt: FieldValue.serverTimestamp(),
  });
  await new Promise((r) => setTimeout(r, 2500));
  const afterReject = await appRef.get();
  if (afterReject.data()?.brevo_email_rejected_sent_at) {
    ok("onGraduationApplicationEmail set brevo_email_rejected_sent_at");
  } else {
    warn("Reject email marker not set (may be expected without Brevo key)");
  }

  console.log("\nEmail emulator test finished. Inspect Emulator UI → Firestore → email_activity.\n");
}

main().catch((e) => {
  console.error(e);
  fail(e instanceof Error ? e.message : String(e));
});
