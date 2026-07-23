/**
 * Admin-only: run (or dry-run) the HubSpot contact sync on demand.
 *
 * Defaults to dryRun=true — pass {dryRun: false} explicitly to write to
 * HubSpot. Use {dryRun: true, limit: 10} to inspect mapped payloads before
 * the first live run; a full live call doubles as the one-time backfill.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {HUBSPOT_PRIVATE_APP_TOKEN} from "../hubspot/hubspotClient";
import {runHubspotUserSync} from "../hubspot/syncUsersToHubspot";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

async function assertCallerIsNetworkAdmin(uid: string): Promise<void> {
  const udoc = await db.collection("users").doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles) ? (udoc.data()?.roles as string[]) : [];
  const single = udoc.data()?.role as string | undefined;
  const all = single ? [single, ...roles] : roles;
  if (!all.some((r) => r === "Admin" || r === "superAdmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only.");
  }
}

const requestSchema = z.object({
  dryRun: z.boolean().optional(),
  limit: z.number().int().positive().max(100000).optional(),
});

export const adminRunHubspotSync = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    timeoutSeconds: 540,
    secrets: [HUBSPOT_PRIVATE_APP_TOKEN],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    await assertCallerIsNetworkAdmin(uid);

    const parsed = requestSchema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    // Safe by default: only {dryRun: false} performs live writes.
    const dryRun = parsed.data.dryRun !== false;

    const result = await runHubspotUserSync({
      dryRun,
      limit: parsed.data.limit,
      trigger: "callable",
    });

    return {ok: result.failedBatches === 0, ...result};
  }
);
