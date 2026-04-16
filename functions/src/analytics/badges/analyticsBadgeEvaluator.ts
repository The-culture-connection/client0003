/**
 * Phase 6 — analytics-driven badges from `user_analytics_summary` + `badge_definitions`.
 * Writes `user_badges/{uid}/awarded/{badgeId}` and `badge_progress/{uid}` (Functions only).
 */

import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";

export type BadgeRuleOperator = "gte" | "gt" | "lte" | "lt" | "eq";
/** v1: only `all_time` (reads `user_analytics_summary.counts`). */
export type BadgeRuleTimeframe = "all_time";

export interface BadgePhase6Rule {
  metric_key: string;
  operator: BadgeRuleOperator;
  threshold: number;
  timeframe: BadgeRuleTimeframe;
}

function readCounts(summary: Record<string, unknown>): Record<string, number> {
  const c = summary.counts;
  if (!c || typeof c !== "object" || Array.isArray(c)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

function readMetric(summary: Record<string, unknown>, metricKey: string): number {
  const counts = readCounts(summary);
  if (counts[metricKey] != null) return counts[metricKey]!;
  const flat = summary[`counts.${metricKey}`];
  if (typeof flat === "number" && Number.isFinite(flat)) return flat;
  return 0;
}

function satisfiesOnce(metric: number, op: BadgeRuleOperator, threshold: number): boolean {
  switch (op) {
  case "gte":
    return metric >= threshold;
  case "gt":
    return metric > threshold;
  case "lte":
    return metric <= threshold;
  case "lt":
    return metric < threshold;
  case "eq":
    return metric === threshold;
  default:
    return false;
  }
}

/**
 * How many "award units" the current metric supports.
 * - one_time: 0 or 1
 * - repeatable: for `gte` with positive threshold, floor(metric/threshold); other ops fall back to 0/1
 */
function targetAwardUnits(
  awardMode: "one_time" | "repeatable",
  op: BadgeRuleOperator,
  metric: number,
  threshold: number
): number {
  if (!Number.isFinite(metric) || !Number.isFinite(threshold)) return 0;
  if (awardMode === "one_time") {
    return satisfiesOnce(metric, op, threshold) ? 1 : 0;
  }
  if (threshold <= 0) return 0;
  if (op === "gte") {
    return Math.floor(metric / threshold);
  }
  if (op === "gt") {
    return Math.max(0, Math.floor((metric - 1) / threshold));
  }
  return satisfiesOnce(metric, op, threshold) ? 1 : 0;
}

interface BadgeDefRow {
  id: string;
  active: boolean;
  award_mode: "one_time" | "repeatable";
  rule: BadgePhase6Rule;
}

function parseBadgeDef(id: string, data: Record<string, unknown>): BadgeDefRow | null {
  const active = data.active !== false;
  const rule = data.rule;
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    return null;
  }
  const r = rule as Record<string, unknown>;
  const metric_key = typeof r.metric_key === "string" ? r.metric_key.trim() : "";
  const operator = r.operator as BadgeRuleOperator;
  const threshold = typeof r.threshold === "number" ? r.threshold : Number.NaN;
  const timeframe = (r.timeframe as BadgeRuleTimeframe) || "all_time";
  if (!metric_key || !Number.isFinite(threshold)) return null;
  const allowedOp = ["gte", "gt", "lte", "lt", "eq"].includes(operator);
  if (!allowedOp) return null;
  if (timeframe !== "all_time") {
    logger.warn("analyticsBadgeEvaluator: unsupported timeframe (skipping badge)", { id, timeframe });
    return null;
  }
  const award_mode = data.award_mode === "repeatable" ? "repeatable" : "one_time";
  return { id, active, award_mode, rule: { metric_key, operator, threshold, timeframe } };
}

/**
 * Run after `user_analytics_summary/{uid}` is updated. Idempotent: only increases `times_awarded`.
 */
export async function evaluateAnalyticsBadgesForUser(
  db: Firestore,
  uid: string,
  summaryData: Record<string, unknown>
): Promise<void> {
  const defsSnap = await db.collection("badge_definitions").get();
  const defs: BadgeDefRow[] = [];
  for (const doc of defsSnap.docs) {
    const row = parseBadgeDef(doc.id, doc.data() as Record<string, unknown>);
    if (row?.active) defs.push(row);
  }
  if (defs.length === 0) return;

  const awardedRefs = defs.map((d) =>
    db.collection(ANALYTICS_COLLECTIONS.USER_BADGE_AWARDS).doc(uid).collection("awarded").doc(d.id)
  );
  const awardedSnaps = await db.getAll(...awardedRefs);

  const batch = db.batch();
  const newEarnedIds: string[] = [];
  const progressByBadge: Record<string, { metric_key: string; metric_value: number; times_awarded: number }> = {};

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const metric = readMetric(summaryData, def.rule.metric_key);
    const target = Math.max(
      0,
      targetAwardUnits(def.award_mode, def.rule.operator, metric, def.rule.threshold)
    );
    const snap = awardedSnaps[i]!;
    const prev = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const prevTimes = typeof prev.times_awarded === "number" && prev.times_awarded >= 0 ? prev.times_awarded : 0;
    const nextTimes =
      def.award_mode === "one_time" ? Math.min(1, Math.max(prevTimes, target)) : Math.max(prevTimes, target);

    progressByBadge[def.id] = {
      metric_key: def.rule.metric_key,
      metric_value: metric,
      times_awarded: nextTimes,
    };

    if (nextTimes === prevTimes) {
      continue;
    }

    const awardedRef = awardedRefs[i]!;
    const firstAt = prev.first_awarded_at instanceof Timestamp ? prev.first_awarded_at : Timestamp.now();
    batch.set(
      awardedRef,
      {
        schema_version: 1,
        badge_id: def.id,
        times_awarded: nextTimes,
        first_awarded_at: prevTimes === 0 ? Timestamp.now() : firstAt,
        last_awarded_at: Timestamp.now(),
        last_metric_value: metric,
        award_mode: def.award_mode,
        rule_snapshot: def.rule,
      },
      { merge: true }
    );

    if (def.award_mode === "one_time" && prevTimes === 0 && nextTimes >= 1) {
      newEarnedIds.push(def.id);
    }
  }

  const progressRef = db.collection(ANALYTICS_COLLECTIONS.BADGE_PROGRESS).doc(uid);
  batch.set(
    progressRef,
    {
      schema_version: 1,
      user_id: uid,
      updated_at: FieldValue.serverTimestamp(),
      by_badge: progressByBadge,
    },
    { merge: true }
  );

  if (newEarnedIds.length > 0) {
    const userRef = db.collection("users").doc(uid);
    batch.set(
      userRef,
      { badges: { earned: FieldValue.arrayUnion(...newEarnedIds) } },
      { merge: true }
    );
  }

  await batch.commit();
}
