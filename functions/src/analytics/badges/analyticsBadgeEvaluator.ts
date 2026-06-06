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

/** A single condition in a multi-condition badge rule (v2). */
export interface BadgeCondition {
  metric_key: string;
  operator: BadgeRuleOperator;
  threshold: number;
  timeframe?: BadgeRuleTimeframe;
}

export interface BadgePhase6Rule {
  /** v1 — single condition (backwards-compatible) */
  metric_key?: string;
  operator?: BadgeRuleOperator;
  threshold?: number;
  timeframe?: BadgeRuleTimeframe;
  /** v2 — multi-condition: all conditions must pass (AND) or any must pass (OR) */
  conditions?: BadgeCondition[];
  /** Logic for multi-condition rules. Defaults to "AND". */
  logic?: "AND" | "OR";
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
  /** From `badge_definitions.name` (or legacy `title`), else doc id. */
  display_name: string;
  active: boolean;
  award_mode: "one_time" | "repeatable";
  rule: BadgePhase6Rule;
}

const ALLOWED_OPS = new Set(["gte", "gt", "lte", "lt", "eq"]);

function parseCondition(c: Record<string, unknown>): BadgeCondition | null {
  const metric_key = typeof c.metric_key === "string" ? c.metric_key.trim() : "";
  const operator = c.operator as BadgeRuleOperator;
  const threshold = typeof c.threshold === "number" ? c.threshold : Number.NaN;
  if (!metric_key || !Number.isFinite(threshold) || !ALLOWED_OPS.has(operator)) return null;
  return { metric_key, operator, threshold, timeframe: "all_time" };
}

function parseBadgeDef(id: string, data: Record<string, unknown>): BadgeDefRow | null {
  const active = data.active !== false;
  const rule = data.rule;
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
    return null;
  }
  const r = rule as Record<string, unknown>;
  const award_mode = data.award_mode === "repeatable" ? "repeatable" : "one_time";
  const rawName =
    typeof data.name === "string" && data.name.trim()
      ? data.name.trim()
      : typeof data.title === "string" && data.title.trim()
        ? data.title.trim()
        : id;

  // v2: multi-condition rule
  if (Array.isArray(r.conditions) && r.conditions.length > 0) {
    const conditions: BadgeCondition[] = [];
    for (const c of r.conditions) {
      if (!c || typeof c !== "object") continue;
      const parsed = parseCondition(c as Record<string, unknown>);
      if (parsed) conditions.push(parsed);
    }
    if (conditions.length === 0) return null;
    const logic: "AND" | "OR" = r.logic === "OR" ? "OR" : "AND";
    return { id, display_name: rawName, active, award_mode, rule: { conditions, logic } };
  }

  // v1: single-condition rule (backwards-compatible)
  const metric_key = typeof r.metric_key === "string" ? r.metric_key.trim() : "";
  const operator = r.operator as BadgeRuleOperator;
  const threshold = typeof r.threshold === "number" ? r.threshold : Number.NaN;
  const timeframe = (r.timeframe as BadgeRuleTimeframe) || "all_time";
  if (!metric_key || !Number.isFinite(threshold) || !ALLOWED_OPS.has(operator)) return null;
  if (timeframe !== "all_time") {
    logger.warn("analyticsBadgeEvaluator: unsupported timeframe (skipping badge)", { id, timeframe });
    return null;
  }
  return { id, display_name: rawName, active, award_mode, rule: { metric_key, operator, threshold, timeframe } };
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
    const rule = def.rule;

    let target: number;
    let primaryMetricKey: string;
    let primaryMetricValue: number;

    if (rule.conditions && rule.conditions.length > 0) {
      // v2: multi-condition evaluation
      const logic = rule.logic ?? "AND";
      const conditionUnits = rule.conditions.map((cond) => {
        const m = readMetric(summaryData, cond.metric_key);
        return targetAwardUnits(def.award_mode, cond.operator, m, cond.threshold);
      });
      // AND: minimum units across all conditions; OR: maximum
      target = Math.max(0, logic === "OR" ? Math.max(...conditionUnits) : Math.min(...conditionUnits));
      // Use the first condition's metric as the primary for progress display
      primaryMetricKey = rule.conditions[0]!.metric_key;
      primaryMetricValue = readMetric(summaryData, primaryMetricKey);
    } else {
      // v1: single-condition
      const metric_key = rule.metric_key ?? "";
      const metric = readMetric(summaryData, metric_key);
      target = Math.max(0, targetAwardUnits(def.award_mode, rule.operator!, metric, rule.threshold!));
      primaryMetricKey = metric_key;
      primaryMetricValue = metric;
    }

    const snap = awardedSnaps[i]!;
    const prev = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const prevTimes = typeof prev.times_awarded === "number" && prev.times_awarded >= 0 ? prev.times_awarded : 0;
    const nextTimes =
      def.award_mode === "one_time" ? Math.min(1, Math.max(prevTimes, target)) : Math.max(prevTimes, target);

    progressByBadge[def.id] = {
      metric_key: primaryMetricKey,
      metric_value: primaryMetricValue,
      times_awarded: nextTimes,
    };

    if (nextTimes === prevTimes) {
      continue;
    }

    const awardDelta = nextTimes - prevTimes;
    if (awardDelta > 0) {
      const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
      const label = def.display_name;
      const title =
        def.award_mode === "repeatable" && awardDelta > 1
          ? `${label} — ×${awardDelta} new tiers`
          : def.award_mode === "repeatable"
            ? `New tier: ${label}`
            : `Badge earned: ${label}`;
      const body =
        def.award_mode === "repeatable" && awardDelta > 1
          ? `You advanced “${label}” by ${awardDelta} tiers. Open your badges from the header (click your email) to see details.`
          : def.award_mode === "repeatable"
            ? `You reached another tier for “${label}”.`
            : `You earned the “${label}” badge.`;
      batch.set(notifRef, {
        userId: uid,
        type: "badge_earned",
        title,
        body,
        read: false,
        badgeId: def.id,
        badgeAwardDelta: awardDelta,
        createdAt: FieldValue.serverTimestamp(),
      });
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
        last_metric_value: primaryMetricValue,
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
