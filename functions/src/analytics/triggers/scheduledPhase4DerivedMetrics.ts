/**
 * Phase 4 — nightly derived metrics on `daily_metrics/{YYYY-MM-DD}` (UTC).
 * Heavy rollups (cart abandonment, latency histograms) should extend this job, not the hot path trigger.
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { utcYyyyMmDd, writePhase4DerivedMetricsForDay } from "../summary/phase4WebEventRollup";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

function previousUtcDateString(today: Date): string {
  const d = new Date(today.getTime());
  d.setUTCDate(d.getUTCDate() - 1);
  return utcYyyyMmDd(d);
}

/** 01:30 UTC — after midnight so the prior UTC day is complete. */
export const scheduledPhase4DerivedMetrics = onSchedule(
  {
    schedule: "30 1 * * *",
    timeZone: "Etc/UTC",
    region: "us-central1",
  },
  async () => {
    const yesterdayKey = previousUtcDateString(new Date());
    try {
      await writePhase4DerivedMetricsForDay(db, yesterdayKey);
      logger.info("scheduledPhase4DerivedMetrics: wrote derived for", { yesterdayKey });
    } catch (err) {
      logger.error("scheduledPhase4DerivedMetrics failed", { err, yesterdayKey });
    }
  }
);
