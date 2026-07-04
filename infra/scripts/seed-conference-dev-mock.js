/**
 * Seed a single placeholder `conferences/{conferenceId}` doc (status: 'active') so the
 * Mortarverse chooser and Conference app (Lobby/Schedule/Map) have real data to render
 * against during Phase 1 development. No Auth users, no ticket/entitlement data — that
 * arrives in Phase 2.
 *
 * Prerequisites (pick one):
 *   - `--credentials path/to/serviceAccount.json`, or
 *   - `GOOGLE_APPLICATION_CREDENTIALS`, or
 *   - `gcloud auth application-default login`
 *
 * From monorepo root, with a service account JSON:
 *   PowerShell:
 *     $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\mortar-dev-adminsdk.json"
 *     npm.cmd run seed:dev:conference-mock
 *   Or call node directly:
 *     node infra/scripts/seed-conference-dev-mock.js --project mortar-dev --credentials "C:\\path\\to\\file.json"
 *
 * Optional: SEED_DRY_RUN=1 or --dry-run (no credentials required for dry run)
 */

const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const DEFAULT_PROJECT = "mortar-dev";
const DRY_RUN = process.env.SEED_DRY_RUN === "1" || process.argv.includes("--dry-run");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const PROJECT_ID =
  argValue("--project") || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT;
const CONFERENCE_ID = argValue("--conference-id") || "conference-dev-placeholder";

function initFirebaseAdmin() {
  if (admin.apps.length) return;
  const keyPath = argValue("--credentials") || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    if (DRY_RUN) {
      admin.initializeApp({ projectId: PROJECT_ID });
      return;
    }
    console.error(`
No service account JSON found. Do one of:

  1) $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\mortar-dev-adminsdk.json"; npm.cmd run seed:dev:conference-mock
  2) node infra/scripts/seed-conference-dev-mock.js --project mortar-dev --credentials "C:\\path\\to\\file.json"
  3) gcloud auth application-default login
`);
    process.exit(1);
  }
  admin.initializeApp({
    credential: admin.credential.cert(require(require("path").resolve(keyPath))),
    projectId: PROJECT_ID,
  });
}

async function main() {
  initFirebaseAdmin();

  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

  const conferenceDoc = {
    name: "Mortar Summit 2026 (Placeholder)",
    description: "Placeholder conference seeded for local Phase 1 development.",
    status: "active",
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    expiresAt: Timestamp.fromDate(expiresAt),
    timezone: "America/New_York",
    location: "TBD",
    heroImageUrl: null,
    mapImageUrl: null,
    attendeeCount: 128,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const sessionDocs = [
    {
      id: "opening-keynote",
      title: "Opening Keynote",
      description: "Kicking off the summit.",
      speakerNames: ["Jordan Reyes"],
      startTime: Timestamp.fromDate(new Date(startDate.getTime() + 9 * 60 * 60 * 1000)),
      endTime: Timestamp.fromDate(new Date(startDate.getTime() + 10 * 60 * 60 * 1000)),
      roomLabel: "Main Hall",
    },
    {
      id: "networking-101",
      title: "Networking 101",
      description: "How to make the most of the conference.",
      speakerNames: ["Sam Patel"],
      startTime: Timestamp.fromDate(new Date(startDate.getTime() + 11 * 60 * 60 * 1000)),
      endTime: Timestamp.fromDate(new Date(startDate.getTime() + 12 * 60 * 60 * 1000)),
      roomLabel: "Room B",
    },
  ];

  console.log(`${DRY_RUN ? "[dry run] " : ""}Project: ${PROJECT_ID}`);
  console.log(`${DRY_RUN ? "[dry run] " : ""}Seeding conferences/${CONFERENCE_ID}`);

  if (DRY_RUN) {
    console.log(JSON.stringify(conferenceDoc, null, 2));
    console.log(JSON.stringify(sessionDocs, null, 2));
    return;
  }

  const db = admin.firestore();
  await db.collection("conferences").doc(CONFERENCE_ID).set(conferenceDoc, { merge: true });
  for (const session of sessionDocs) {
    const { id, ...data } = session;
    await db.collection("conferences").doc(CONFERENCE_ID).collection("sessions").doc(id).set(data, { merge: true });
  }

  console.log(`Done. conferences/${CONFERENCE_ID} is ready with ${sessionDocs.length} sessions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
