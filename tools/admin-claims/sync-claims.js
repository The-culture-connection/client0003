/**
 * sync-claims.js — reconcile Auth custom claims `roles` with Firestore `users/{uid}.roles`.
 *
 * Why: the hardened Firestore rules and the admin callables authorize off the custom-claims
 * `roles` (request.auth.token.roles / customClaims.roles). When a user has a role in their
 * Firestore doc but not in custom claims (e.g. seeded account, or role changed in Firestore
 * only), the rules/callables deny them — which is what broke staging after the rules deploy.
 *
 * Source of truth = Firestore. This sets custom-claims `roles` to the user's Firestore roles
 * (array `roles` plus legacy string `role`), preserving any OTHER custom claims.
 *
 * Usage (run from repo root):
 *   node tools/admin-claims/sync-claims.js                 # dry-run, ALL users, report mismatches
 *   node tools/admin-claims/sync-claims.js --email a@b.com # dry-run, single account
 *   node tools/admin-claims/sync-claims.js --apply         # apply fixes to ALL mismatched users
 *   node tools/admin-claims/sync-claims.js --apply --staff-only  # only fix users whose Firestore roles include Admin/superAdmin
 *
 * Requires the stage service account JSON at repo root and firebase-admin (functions/node_modules).
 */

const path = require("path");
const admin = require(path.join(__dirname, "..", "..", "functions", "node_modules", "firebase-admin"));

const SERVICE_ACCOUNT = path.join(__dirname, "..", "..", "mortar-stage-firebase-adminsdk-fbsvc-c7748b6158.json");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const STAFF_ONLY = args.includes("--staff-only");
const emailIdx = args.indexOf("--email");
const ONLY_EMAIL = emailIdx >= 0 ? (args[emailIdx + 1] || "").trim().toLowerCase() : null;

const STAFF_ROLES = ["Admin", "superAdmin"];

admin.initializeApp({
  credential: admin.credential.cert(require(SERVICE_ACCOUNT)),
});

const db = admin.firestore();
const auth = admin.auth();

function firestoreRoles(data) {
  const out = new Set();
  if (Array.isArray(data.roles)) {
    for (const r of data.roles) if (typeof r === "string" && r.trim()) out.add(r.trim());
  }
  if (typeof data.role === "string" && data.role.trim()) out.add(data.role.trim());
  return Array.from(out);
}

function claimRoles(claims) {
  const raw = claims && claims.roles;
  if (Array.isArray(raw)) return raw.filter((r) => typeof r === "string");
  if (typeof raw === "string") return [raw];
  return [];
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

async function main() {
  console.log(`Project: mortar-stage | mode: ${APPLY ? "APPLY" : "DRY-RUN"}${STAFF_ONLY ? " | staff-only" : ""}${ONLY_EMAIL ? ` | email=${ONLY_EMAIL}` : ""}\n`);

  const snap = await db.collection("users").get();
  let scanned = 0;
  let mismatched = 0;
  let fixed = 0;
  let failed = 0;
  const mismatchSamples = [];

  for (const doc of snap.docs) {
    const uid = doc.id;
    const data = doc.data() || {};
    const fsRoles = firestoreRoles(data);

    if (STAFF_ONLY && !fsRoles.some((r) => STAFF_ROLES.includes(r))) continue;

    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (e) {
      // Firestore user doc with no matching Auth user — skip.
      continue;
    }

    if (ONLY_EMAIL && (userRecord.email || "").toLowerCase() !== ONLY_EMAIL) continue;
    scanned++;

    const cRoles = claimRoles(userRecord.customClaims);

    if (sameSet(fsRoles, cRoles)) continue;

    mismatched++;
    const line = `${userRecord.email || "(no email)"} [${uid}] firestore=[${fsRoles.join(", ")}] claims=[${cRoles.join(", ")}]`;
    if (mismatchSamples.length < 50) mismatchSamples.push(line);

    if (APPLY) {
      try {
        const nextClaims = { ...(userRecord.customClaims || {}), roles: fsRoles };
        await auth.setCustomUserClaims(uid, nextClaims);
        fixed++;
      } catch (e) {
        failed++;
        console.error(`  FAILED to set claims for ${uid}: ${e.message}`);
      }
    }
  }

  console.log(`Scanned users with Auth account: ${scanned}`);
  console.log(`Mismatched (firestore roles != claims roles): ${mismatched}`);
  console.log("\nSample mismatches:");
  for (const l of mismatchSamples) console.log("  " + l);
  if (APPLY) {
    console.log(`\nApplied: ${fixed} fixed, ${failed} failed.`);
    console.log("NOTE: affected users must refresh their ID token (sign out/in, or getIdToken(true)) for new claims to appear in request.auth.token.");
  } else {
    console.log("\nDRY-RUN only. Re-run with --apply to write claims.");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
