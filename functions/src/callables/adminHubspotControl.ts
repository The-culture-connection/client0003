/**
 * Admin-only: pause / resume the HubSpot contact sync, and on resume delete
 * selected contacts created while it was paused (e.g. test accounts).
 *
 * Actions (`{action}`):
 * - "status": pause state, last run, and — while paused — every user doc
 *   created since the pause started (`users.created_at >= paused_at`).
 * - "pause":  stops live syncs (`runHubspotUserSync` checks the flag).
 * - "resume": `{deleteUids: string[], syncNow?: boolean}`. Each selected user is
 *   excluded from HubSpot for good (`hubspot_sync_exclude: true`) and any
 *   existing HubSpot contact with their email is archived (restorable in
 *   HubSpot for 90 days). Their MORTAR account is NOT touched. Then the pause
 *   is cleared; `syncNow` runs a live sync straight away instead of waiting
 *   for the nightly 03:00 UTC run.
 *
 * State lives on `integration_state/hubspot_sync` next to the sync's own
 * status fields.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";
import {callableCorsAllowlist} from "../callableCorsAllowlist";
import {HUBSPOT_PRIVATE_APP_TOKEN, archiveContactByEmail} from "../hubspot/hubspotClient";
import {runHubspotUserSync} from "../hubspot/syncUsersToHubspot";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const STATUS_DOC_PATH = "integration_state/hubspot_sync";
const MAX_LISTED = 500;

async function assertCallerIsNetworkAdmin(uid: string): Promise<string> {
  const udoc = await db.collection("users").doc(uid).get();
  const roles: string[] = Array.isArray(udoc.data()?.roles) ? (udoc.data()?.roles as string[]) : [];
  const single = udoc.data()?.role as string | undefined;
  const all = single ? [single, ...roles] : roles;
  if (!all.some((r) => r === "Admin" || r === "superAdmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only.");
  }
  return String(udoc.data()?.email ?? "");
}

const requestSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("status")}),
  z.object({action: z.literal("pause")}),
  z.object({
    action: z.literal("resume"),
    deleteUids: z.array(z.string().min(1)).max(MAX_LISTED).default([]),
    syncNow: z.boolean().optional(),
  }),
]);

function iso(v: unknown): string | null {
  return v instanceof Timestamp ? v.toDate().toISOString() : null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export type PausedSignup = {
  uid: string;
  email: string;
  name: string;
  createdAt: string | null;
  alreadyExcluded: boolean;
};

async function listCreatedSince(pausedAt: Timestamp): Promise<PausedSignup[]> {
  const snap = await db
    .collection("users")
    .where("created_at", ">=", pausedAt)
    .orderBy("created_at", "desc")
    .limit(MAX_LISTED)
    .get();
  return snap.docs.map((d) => {
    const u = d.data();
    const name = `${str(u.first_name)} ${str(u.last_name)}`.trim() || str(u.display_name);
    return {
      uid: d.id,
      email: str(u.email).toLowerCase(),
      name,
      createdAt: iso(u.created_at),
      alreadyExcluded: u.hubspot_sync_exclude === true,
    };
  });
}

async function buildStatus() {
  const s = (await db.doc(STATUS_DOC_PATH).get()).data() ?? {};
  const paused = s.paused === true;
  const pausedAt = s.paused_at instanceof Timestamp ? s.paused_at : null;
  return {
    paused,
    pausedAt: iso(pausedAt),
    pausedBy: str(s.paused_by_email) || null,
    lastRunAt: iso(s.last_run_at),
    lastSuccessAt: iso(s.last_success_at),
    lastSkippedPausedAt: iso(s.last_skipped_paused_at),
    lastResume: s.last_resume ?? null,
    createdDuringPause: paused && pausedAt ? await listCreatedSince(pausedAt) : [],
  };
}

export const adminHubspotControl = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    timeoutSeconds: 540,
    secrets: [HUBSPOT_PRIVATE_APP_TOKEN],
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
    const adminEmail = await assertCallerIsNetworkAdmin(uid);

    const parsed = requestSchema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.issues.map((e) => e.message).join("; "));
    }
    const input = parsed.data;
    const statusRef = db.doc(STATUS_DOC_PATH);

    if (input.action === "status") return buildStatus();

    if (input.action === "pause") {
      const current = (await statusRef.get()).data();
      // Re-pausing keeps the original start, so the review list stays complete.
      if (current?.paused !== true) {
        await statusRef.set(
          {
            paused: true,
            paused_at: FieldValue.serverTimestamp(),
            paused_by_uid: uid,
            paused_by_email: adminEmail,
          },
          {merge: true}
        );
      }
      return buildStatus();
    }

    // resume
    const current = (await statusRef.get()).data() ?? {};
    if (current.paused !== true) {
      throw new HttpsError("failed-precondition", "HubSpot sync is not paused.");
    }
    const pausedAt = current.paused_at instanceof Timestamp ? current.paused_at : null;

    // Only accounts actually created during this pause may be deleted here.
    const eligible = new Map(
      (pausedAt ? await listCreatedSince(pausedAt) : []).map((r) => [r.uid, r])
    );
    const rejected = input.deleteUids.filter((id) => !eligible.has(id));
    if (rejected.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `${rejected.length} selected account(s) were not created during this pause.`
      );
    }

    const deletions: Array<{uid: string; email: string; hubspot: string; error?: string}> = [];
    for (const id of input.deleteUids) {
      const row = eligible.get(id)!;
      await db.collection("users").doc(id).set(
        {
          hubspot_sync_exclude: true,
          hubspot_sync_excluded_at: FieldValue.serverTimestamp(),
          hubspot_sync_excluded_by: adminEmail || uid,
          hubspot_sync_excluded_reason: "Deleted in HubSpot pause review",
        },
        {merge: true}
      );
      // Contacts created during the pause normally never reached HubSpot,
      // but an email that was already a contact (or a sync that ran just
      // before pausing) would — remove it.
      // eslint-disable-next-line no-await-in-loop
      const res = row.email ? await archiveContactByEmail(row.email) : null;
      deletions.push({
        uid: id,
        email: row.email,
        hubspot: res?.outcome ?? "no_email",
        ...(res?.errorMessage ? {error: res.errorMessage} : {}),
      });
    }

    await statusRef.set(
      {
        paused: false,
        paused_at: FieldValue.delete(),
        paused_by_uid: FieldValue.delete(),
        paused_by_email: FieldValue.delete(),
        last_resume: {
          resumed_at: new Date().toISOString(),
          resumed_by: adminEmail || uid,
          paused_from: iso(pausedAt),
          created_during_pause: eligible.size,
          deleted: deletions.length,
          kept: eligible.size - deletions.length,
        },
      },
      {merge: true}
    );

    const sync = input.syncNow ?
      await runHubspotUserSync({trigger: "resume"}) :
      null;

    return {
      ok: true,
      deletions,
      sync: sync ? {upserted: sync.upserted, failedBatches: sync.failedBatches} : null,
      status: await buildStatus(),
    };
  }
);
