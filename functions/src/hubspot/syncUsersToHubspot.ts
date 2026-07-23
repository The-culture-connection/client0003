/**
 * Nightly Firestore -> HubSpot contact sync (plan §3.1).
 *
 * Strategy: full-scan upsert. Streams the whole `users` collection in pages,
 * maps each doc (contactMapper), chunks into batches of 100, and upserts by
 * email. Self-healing: a missed night is fixed by the next run. Revisit with
 * an `updated_at` watermark only if the user count grows past ~50k.
 *
 * Runs at 03:00 UTC — after scheduledPhase4DerivedMetrics (01:30 UTC) so any
 * future engagement properties are fresh when Phase 3 lands.
 *
 * Status doc: `integration_state/hubspot_sync`.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {
  HUBSPOT_BATCH_LIMIT,
  HUBSPOT_PRIVATE_APP_TOKEN,
  HubspotContactInput,
  batchUpsertContacts,
} from "./hubspotClient";
import {mapUserToHubspotContact} from "./contactMapper";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const PAGE_SIZE = 300;
const STATUS_DOC_PATH = "integration_state/hubspot_sync";

export type HubspotSyncOptions = {
  /** When true, map and count everything but make no HubSpot calls. */
  dryRun?: boolean;
  /** Cap the number of user docs scanned (testing small slices). */
  limit?: number;
  /** Recorded on the status doc: "scheduled" | "callable". */
  trigger?: string;
};

export type HubspotSyncResult = {
  dryRun: boolean;
  scanned: number;
  mapped: number;
  skippedNoEmail: number;
  batches: number;
  upserted: number;
  failedBatches: number;
  unknownRoles: string[];
  /** First few mapped payloads — returned on dry runs for inspection. */
  samplePayloads?: HubspotContactInput[];
};

/**
 * Core sync routine, shared by the scheduled function and the admin callable.
 */
export async function runHubspotUserSync(
  options: HubspotSyncOptions = {}
): Promise<HubspotSyncResult> {
  const dryRun = options.dryRun === true;
  const scanLimit = options.limit && options.limit > 0 ? options.limit : Infinity;

  const result: HubspotSyncResult = {
    dryRun,
    scanned: 0,
    mapped: 0,
    skippedNoEmail: 0,
    batches: 0,
    upserted: 0,
    failedBatches: 0,
    unknownRoles: [],
  };
  const samples: HubspotContactInput[] = [];
  const unknownRoleSet = new Set<string>();

  let pending: HubspotContactInput[] = [];

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    result.batches++;
    if (dryRun) {
      result.upserted += batch.length;
      return;
    }
    const res = await batchUpsertContacts(batch);
    if (res.ok) {
      result.upserted += res.upserted;
    } else {
      result.failedBatches++;
    }
  };

  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (result.scanned < scanLimit) {
    let query = db
      .collection("users")
      .orderBy("__name__")
      .limit(Math.min(PAGE_SIZE, scanLimit - result.scanned));
    if (lastDoc) query = query.startAfter(lastDoc);

    // eslint-disable-next-line no-await-in-loop
    const page = await query.get();
    if (page.empty) break;
    lastDoc = page.docs[page.docs.length - 1];

    for (const docSnap of page.docs) {
      result.scanned++;
      const mappedUser = mapUserToHubspotContact(docSnap.id, docSnap.data());
      if (!mappedUser) {
        result.skippedNoEmail++;
        continue;
      }
      result.mapped++;
      mappedUser.unknownRoles.forEach((r) => unknownRoleSet.add(r));
      if (samples.length < 3) samples.push(mappedUser.input);
      pending.push(mappedUser.input);
      if (pending.length >= HUBSPOT_BATCH_LIMIT) {
        // eslint-disable-next-line no-await-in-loop
        await flush();
      }
    }

    if (page.size < PAGE_SIZE) break;
  }
  await flush();

  result.unknownRoles = Array.from(unknownRoleSet);
  if (dryRun) result.samplePayloads = samples;

  if (result.unknownRoles.length > 0) {
    logger.warn("HubSpot sync: roles with no HubSpot option (add options in HubSpot + mapper)", {
      unknownRoles: result.unknownRoles,
    });
  }

  try {
    await db.doc(STATUS_DOC_PATH).set(
      {
        last_run_at: FieldValue.serverTimestamp(),
        ...(result.failedBatches === 0 && !dryRun ?
          {last_success_at: FieldValue.serverTimestamp()} :
          {}),
        trigger: options.trigger ?? "unknown",
        dry_run: dryRun,
        scanned: result.scanned,
        mapped: result.mapped,
        skipped_no_email: result.skippedNoEmail,
        batches: result.batches,
        upserted: result.upserted,
        failed_batches: result.failedBatches,
        unknown_roles: result.unknownRoles,
      },
      {merge: true}
    );
  } catch (e) {
    logger.warn("HubSpot sync status doc write failed", {
      error: e instanceof Error ? e.message : String(e),
    });
  }

  logger.info("HubSpot user sync finished", {
    dryRun,
    scanned: result.scanned,
    mapped: result.mapped,
    skippedNoEmail: result.skippedNoEmail,
    batches: result.batches,
    upserted: result.upserted,
    failedBatches: result.failedBatches,
  });

  return result;
}

export const syncUsersToHubspot = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Etc/UTC",
    region: "us-central1",
    maxInstances: 1,
    timeoutSeconds: 540,
    memory: "256MiB",
    secrets: [HUBSPOT_PRIVATE_APP_TOKEN],
  },
  async () => {
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      logger.info("Skipping scheduled HubSpot sync in emulator");
      return;
    }
    await runHubspotUserSync({trigger: "scheduled"});
  }
);
