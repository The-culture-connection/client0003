/**
 * Admin-only: `daily_metrics` for each UTC day in an inclusive range + current funnel & friction snapshots.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";
import { utcYyyyMmDd } from "../analytics/summary/phase4WebEventRollup";
import { serializeFirestoreValue } from "./adminAnalyticsSerialize";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const schema = z.object({
  start_date_utc: z.string().regex(dateRe),
  end_date_utc: z.string().regex(dateRe),
});

const MAX_RANGE_DAYS = 62;

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("admin") && !merged.has("superadmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

function parseUtcDay(s: string): Date {
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

function eachUtcYyyyMmDdInclusive(start: string, end: string): string[] {
  const a = parseUtcDay(start);
  const b = parseUtcDay(end);
  if (a.getTime() > b.getTime()) {
    throw new HttpsError("invalid-argument", "start_date_utc must be on or before end_date_utc");
  }
  const days = Math.floor((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days > MAX_RANGE_DAYS) {
    throw new HttpsError(
      "invalid-argument",
      `Date range too large (max ${MAX_RANGE_DAYS} UTC days inclusive)`
    );
  }
  const out: string[] = [];
  for (let cur = new Date(a.getTime()); cur.getTime() <= b.getTime(); cur.setUTCDate(cur.getUTCDate() + 1)) {
    out.push(utcYyyyMmDd(new Date(cur.getTime())));
  }
  return out;
}

export const getAdminMobileAnalyticsRangeSummaries = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    const tokenHasAdmin = tokenRoles.includes("admin") || tokenRoles.includes("superadmin");
    if (!tokenHasAdmin) {
      await assertAnalyticsAdmin(callerUid);
    }

    const { start_date_utc, end_date_utc } = parsed.data;
    const dayKeys = eachUtcYyyyMmDdInclusive(start_date_utc, end_date_utc);

    const dailySnaps = await Promise.all(
      dayKeys.map((k) => db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(k).get())
    );

    const daily_metrics_by_date: Record<string, unknown> = {};
    dayKeys.forEach((k, i) => {
      const s = dailySnaps[i];
      daily_metrics_by_date[k] = s.exists ? serializeFirestoreValue(s.data()) : null;
    });

    const funnelIds = ["auth", "onboarding", "matching", "job_to_message", "event_to_rsvp"] as const;
    const funnelSnaps = await Promise.all(
      funnelIds.map((id) => db.collection(ANALYTICS_COLLECTIONS.FUNNEL_SUMMARY).doc(id).get())
    );
    const funnel_summary: Record<string, unknown> = {};
    funnelIds.forEach((id, i) => {
      funnel_summary[id] = funnelSnaps[i].exists ? serializeFirestoreValue(funnelSnaps[i].data()) : null;
    });

    const frictionSnap = await db.collection(ANALYTICS_COLLECTIONS.FRICTION_SUMMARY).limit(500).get();
    const friction_summary = frictionSnap.docs.map((d) => ({
      id: d.id,
      ...(serializeFirestoreValue(d.data()) as Record<string, unknown>),
    }));

    return {
      success: true,
      start_date_utc,
      end_date_utc,
      daily_metrics_by_date,
      funnel_summary,
      friction_summary,
      notes: {
        funnel_and_friction:
          "funnel_summary and friction_summary documents are cumulative counters (not sliced per calendar day). daily_metrics_by_date is one document per UTC day.",
      },
    };
  }
);
