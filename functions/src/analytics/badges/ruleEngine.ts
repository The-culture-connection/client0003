/**
 * Shared threshold-rule engine.
 *
 * Extracted from `analyticsBadgeEvaluator` so analytics badges and conference
 * missions evaluate through *one* implementation rather than two drifting
 * copies. Both read numeric counters from `user_analytics_summary.counts` and
 * award into `user_badges/{uid}/awarded/{awardId}`; they differ only in which
 * collection holds the definitions, which doc holds progress, and how the
 * notification reads.
 */

import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";

export type RuleOperator = "gte" | "gt" | "lte" | "lt" | "eq";
/** v1: only `all_time` (reads `user_analytics_summary.counts`). */
export type RuleTimeframe = "all_time";

/** A single condition in a multi-condition rule (v2). */
export interface RuleCondition {
  metric_key: string;
  operator: RuleOperator;
  threshold: number;
  timeframe?: RuleTimeframe;
}

export interface ThresholdRule {
  /** v1 — single condition (backwards-compatible) */
  metric_key?: string;
  operator?: RuleOperator;
  threshold?: number;
  timeframe?: RuleTimeframe;
  /** v2 — multi-condition: all must pass (AND) or any must pass (OR) */
  conditions?: RuleCondition[];
  logic?: "AND" | "OR";
}

export type AwardMode = "one_time" | "repeatable";

export interface RuleDefRow {
  id: string;
  display_name: string;
  active: boolean;
  award_mode: AwardMode;
  rule: ThresholdRule;
  /**
   * Id written under `user_badges/{uid}/awarded/`. Missions set this to the
   * badge they grant, so a completed mission shows up on the normal badge wall;
   * badges leave it undefined and award under their own id.
   */
  award_id?: string;
}

const ALLOWED_OPS = new Set<string>(["gte", "gt", "lte", "lt", "eq"]);

export function readCounts(summary: Record<string, unknown>): Record<string, number> {
  const c = summary.counts;
  if (!c || typeof c !== "object" || Array.isArray(c)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export function readMetric(summary: Record<string, unknown>, metricKey: string): number {
  const counts = readCounts(summary);
  if (counts[metricKey] != null) return counts[metricKey]!;
  const flat = summary[`counts.${metricKey}`];
  if (typeof flat === "number" && Number.isFinite(flat)) return flat;
  return 0;
}

export function satisfiesOnce(metric: number, op: RuleOperator, threshold: number): boolean {
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
 * - repeatable: for `gte` with positive threshold, floor(metric/threshold)
 */
export function targetAwardUnits(
  awardMode: AwardMode,
  op: RuleOperator,
  metric: number,
  threshold: number
): number {
  if (!Number.isFinite(metric) || !Number.isFinite(threshold)) return 0;
  if (awardMode === "one_time") {
    return satisfiesOnce(metric, op, threshold) ? 1 : 0;
  }
  if (threshold <= 0) return 0;
  if (op === "gte") return Math.floor(metric / threshold);
  if (op === "gt") return Math.max(0, Math.floor((metric - 1) / threshold));
  return satisfiesOnce(metric, op, threshold) ? 1 : 0;
}

function parseCondition(c: Record<string, unknown>): RuleCondition | null {
  const metric_key = typeof c.metric_key === "string" ? c.metric_key.trim() : "";
  const operator = c.operator as RuleOperator;
  const threshold = typeof c.threshold === "number" ? c.threshold : Number.NaN;
  if (!metric_key || !Number.isFinite(threshold) || !ALLOWED_OPS.has(operator)) return null;
  return { metric_key, operator, threshold, timeframe: "all_time" };
}

/**
 * Parses a definition doc into a [RuleDefRow].
 *
 * Returns null when there is no usable rule — which is deliberately how a
 * presentation-only `badge_definitions` doc (one that exists purely so a
 * mission's badge can render on the badge wall) stays invisible to the badge
 * evaluator.
 */
export function parseRuleDefinition(
  id: string,
  data: Record<string, unknown>,
  opts?: { nameKeys?: string[]; awardIdKey?: string }
): RuleDefRow | null {
  const active = data.active !== false;
  const rule = data.rule;
  if (!rule || typeof rule !== "object" || Array.isArray(rule)) return null;
  const r = rule as Record<string, unknown>;
  const award_mode: AwardMode = data.award_mode === "repeatable" ? "repeatable" : "one_time";

  const nameKeys = opts?.nameKeys ?? ["name", "title"];
  let rawName = id;
  for (const key of nameKeys) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) {
      rawName = v.trim();
      break;
    }
  }

  const awardIdRaw = opts?.awardIdKey ? data[opts.awardIdKey] : undefined;
  const award_id =
    typeof awardIdRaw === "string" && awardIdRaw.trim() ? awardIdRaw.trim() : undefined;

  // v2: multi-condition
  if (Array.isArray(r.conditions) && r.conditions.length > 0) {
    const conditions: RuleCondition[] = [];
    for (const c of r.conditions) {
      if (!c || typeof c !== "object") continue;
      const parsed = parseCondition(c as Record<string, unknown>);
      if (parsed) conditions.push(parsed);
    }
    if (conditions.length === 0) return null;
    const logic: "AND" | "OR" = r.logic === "OR" ? "OR" : "AND";
    return { id, display_name: rawName, active, award_mode, rule: { conditions, logic }, award_id };
  }

  // v1: single condition
  const metric_key = typeof r.metric_key === "string" ? r.metric_key.trim() : "";
  const operator = r.operator as RuleOperator;
  const threshold = typeof r.threshold === "number" ? r.threshold : Number.NaN;
  const timeframe = (r.timeframe as RuleTimeframe) || "all_time";
  if (!metric_key || !Number.isFinite(threshold) || !ALLOWED_OPS.has(operator)) return null;
  if (timeframe !== "all_time") {
    logger.warn("ruleEngine: unsupported timeframe (skipping definition)", { id, timeframe });
    return null;
  }
  return {
    id,
    display_name: rawName,
    active,
    award_mode,
    rule: { metric_key, operator, threshold, timeframe },
    award_id,
  };
}

/** Metric state for one definition, used for progress display. */
export interface DefinitionEvaluation {
  target_units: number;
  primary_metric_key: string;
  primary_metric_value: number;
  /** Threshold behind the primary metric — the denominator of a progress bar. */
  primary_threshold: number;
}

export function evaluateDefinition(
  def: RuleDefRow,
  summaryData: Record<string, unknown>
): DefinitionEvaluation {
  const rule = def.rule;
  if (rule.conditions && rule.conditions.length > 0) {
    const logic = rule.logic ?? "AND";
    const units = rule.conditions.map((cond) =>
      targetAwardUnits(def.award_mode, cond.operator, readMetric(summaryData, cond.metric_key), cond.threshold)
    );
    // AND: the weakest condition gates; OR: the strongest carries.
    const target = Math.max(0, logic === "OR" ? Math.max(...units) : Math.min(...units));
    const first = rule.conditions[0]!;
    return {
      target_units: target,
      primary_metric_key: first.metric_key,
      primary_metric_value: readMetric(summaryData, first.metric_key),
      primary_threshold: first.threshold,
    };
  }
  const metric_key = rule.metric_key ?? "";
  const metric = readMetric(summaryData, metric_key);
  return {
    target_units: Math.max(0, targetAwardUnits(def.award_mode, rule.operator!, metric, rule.threshold!)),
    primary_metric_key: metric_key,
    primary_metric_value: metric,
    primary_threshold: rule.threshold ?? 0,
  };
}

export interface EvaluateOptions {
  /** Doc id under `badge_progress` style collection, e.g. "badge_progress". */
  progressCollection: string;
  /** `users/{uid}/notifications.type`. */
  notificationType: string;
  /** Builds the notification copy for a newly-granted award. */
  buildNotification: (args: {
    displayName: string;
    awardMode: AwardMode;
    delta: number;
  }) => { title: string; body: string };
  /**
   * Whether a first-time award should be appended to `users/{uid}.badges.earned`
   * (what the in-app badge wall reads).
   */
  addToEarnedBadges: boolean;
}

/**
 * Awards and progress for a set of definitions. Idempotent — `times_awarded`
 * only ever increases, so re-running on the same summary is a no-op.
 */
export async function evaluateDefinitions(
  db: Firestore,
  uid: string,
  summaryData: Record<string, unknown>,
  defs: RuleDefRow[],
  opts: EvaluateOptions
): Promise<void> {
  if (defs.length === 0) return;

  const awardIds = defs.map((d) => d.award_id ?? d.id);
  const awardedRefs = awardIds.map((awardId) =>
    db.collection(ANALYTICS_COLLECTIONS.USER_BADGE_AWARDS).doc(uid).collection("awarded").doc(awardId)
  );
  const awardedSnaps = await db.getAll(...awardedRefs);

  const batch = db.batch();
  const newEarnedIds: string[] = [];
  const progressByDef: Record<
    string,
    {
      metric_key: string;
      metric_value: number;
      threshold: number;
      times_awarded: number;
      completed: boolean;
      award_id: string;
    }
  > = {};

  for (let i = 0; i < defs.length; i++) {
    const def = defs[i]!;
    const evaluation = evaluateDefinition(def, summaryData);

    const snap = awardedSnaps[i]!;
    const prev = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const prevTimes =
      typeof prev.times_awarded === "number" && prev.times_awarded >= 0 ? prev.times_awarded : 0;
    const nextTimes =
      def.award_mode === "one_time"
        ? Math.min(1, Math.max(prevTimes, evaluation.target_units))
        : Math.max(prevTimes, evaluation.target_units);

    progressByDef[def.id] = {
      metric_key: evaluation.primary_metric_key,
      metric_value: evaluation.primary_metric_value,
      threshold: evaluation.primary_threshold,
      times_awarded: nextTimes,
      completed: nextTimes > 0,
      award_id: awardIds[i]!,
    };

    if (nextTimes === prevTimes) continue;

    const delta = nextTimes - prevTimes;
    if (delta > 0) {
      const { title, body } = opts.buildNotification({
        displayName: def.display_name,
        awardMode: def.award_mode,
        delta,
      });
      const notifRef = db.collection("users").doc(uid).collection("notifications").doc();
      batch.set(notifRef, {
        userId: uid,
        type: opts.notificationType,
        title,
        body,
        read: false,
        badgeId: awardIds[i]!,
        badgeAwardDelta: delta,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    const firstAt = prev.first_awarded_at instanceof Timestamp ? prev.first_awarded_at : Timestamp.now();
    batch.set(
      awardedRefs[i]!,
      {
        schema_version: 1,
        badge_id: awardIds[i]!,
        source_definition_id: def.id,
        times_awarded: nextTimes,
        first_awarded_at: prevTimes === 0 ? Timestamp.now() : firstAt,
        last_awarded_at: Timestamp.now(),
        last_metric_value: evaluation.primary_metric_value,
        award_mode: def.award_mode,
        rule_snapshot: def.rule,
      },
      { merge: true }
    );

    if (def.award_mode === "one_time" && prevTimes === 0 && nextTimes >= 1) {
      newEarnedIds.push(awardIds[i]!);
    }
  }

  batch.set(
    db.collection(opts.progressCollection).doc(uid),
    {
      schema_version: 1,
      user_id: uid,
      updated_at: FieldValue.serverTimestamp(),
      by_badge: progressByDef,
    },
    { merge: true }
  );

  if (opts.addToEarnedBadges && newEarnedIds.length > 0) {
    batch.set(
      db.collection("users").doc(uid),
      { badges: { earned: FieldValue.arrayUnion(...newEarnedIds) } },
      { merge: true }
    );
  }

  await batch.commit();
}
