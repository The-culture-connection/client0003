/**
 * Admin-only: read Phase-4 mobile summary docs (daily_metrics, funnels, friction) for the dashboard tab.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";
import { previousUtcYyyyMmDd, utcYyyyMmDd } from "../analytics/summary/phase4WebEventRollup";
import { serializeFirestoreValue } from "./adminAnalyticsSerialize";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const schema = z.object({}).strict();

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

export const getAdminMobileAnalyticsDashboard = onCall(
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

    const todayKey = utcYyyyMmDd(new Date());
    const yesterdayKey = previousUtcYyyyMmDd(todayKey);

    const [todaySnap, yesterdaySnap, derivedTodaySnap, derivedYesterdaySnap] = await Promise.all([
      db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(todayKey).get(),
      db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(yesterdayKey).get(),
      db.collection(ANALYTICS_COLLECTIONS.DERIVED_METRICS).doc(todayKey).get(),
      db.collection(ANALYTICS_COLLECTIONS.DERIVED_METRICS).doc(yesterdayKey).get(),
    ]);

    const funnelIds = ["auth", "onboarding", "matching", "job_to_message", "event_to_rsvp"] as const;
    const funnelSnaps = await Promise.all(
      funnelIds.map((id) => db.collection(ANALYTICS_COLLECTIONS.FUNNEL_SUMMARY).doc(id).get())
    );

    const frictionSnap = await db.collection(ANALYTICS_COLLECTIONS.FRICTION_SUMMARY).limit(500).get();

    const funnels: Record<string, unknown> = {};
    funnelIds.forEach((id, i) => {
      funnels[id] = funnelSnaps[i].exists ? serializeFirestoreValue(funnelSnaps[i].data()) : null;
    });

    const friction = frictionSnap.docs.map((d) => ({
      id: d.id,
      ...(serializeFirestoreValue(d.data()) as Record<string, unknown>),
    }));

    return {
      success: true,
      date_utc_today: todayKey,
      date_utc_yesterday: yesterdayKey,
      daily_metrics_today: todaySnap.exists ? serializeFirestoreValue(todaySnap.data()) : null,
      daily_metrics_yesterday: yesterdaySnap.exists ? serializeFirestoreValue(yesterdaySnap.data()) : null,
      derived_metrics_today: derivedTodaySnap.exists ? serializeFirestoreValue(derivedTodaySnap.data()) : null,
      derived_metrics_yesterday: derivedYesterdaySnap.exists
        ? serializeFirestoreValue(derivedYesterdaySnap.data())
        : null,
      funnel_summary: funnels,
      friction_summary: friction,
      notes: {
        funnel_and_friction:
          "Funnel and friction documents are cumulative since they were first written (not reset per day). Use daily_metrics_by_date from getAdminMobileAnalyticsRangeSummaries for per-day rollups.",
        derived_metrics:
          "Phase 5 `derived_metrics/{date}` is written by the nightly job from `daily_metrics` only (UTC yesterday after 01:30 UTC). Today's row may be empty until the scheduler runs.",
      },
    };
  }
);
