/**
 * Admin-only: manually run Phase 4 (`daily_metrics.derived`) + Phase 5 (`derived_metrics`)
 * writers for each UTC day in an inclusive range (same logic as the nightly scheduler).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";
import { utcYyyyMmDd, writePhase4DerivedMetricsForDay } from "../analytics/summary/phase4WebEventRollup";
import { writePhase5DerivedMetricsForDay } from "../analytics/summary/writePhase5DerivedMetricsForDay";

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

export const adminRunDerivedMetricsForUtcRange = onCall(
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

    const phase4_ran: string[] = [];
    const phase5_ran: string[] = [];
    const skipped_no_daily_metrics: string[] = [];

    for (const day of dayKeys) {
      const dailySnap = await db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(day).get();
      if (!dailySnap.exists) {
        skipped_no_daily_metrics.push(day);
        continue;
      }
      await writePhase4DerivedMetricsForDay(db, day);
      phase4_ran.push(day);
      await writePhase5DerivedMetricsForDay(db, day);
      phase5_ran.push(day);
    }

    return {
      success: true,
      start_date_utc,
      end_date_utc,
      days_requested: dayKeys.length,
      phase4_derived_days: phase4_ran,
      phase5_derived_metrics_days: phase5_ran,
      skipped_no_daily_metrics,
    };
  }
);
