/**
 * Staff-only callable: aggregate implicit survey responses into an intelligence report,
 * joined with analytics_events exposure counts for the same window.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import * as logger from "firebase-functions/logger";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const CONTEXT_TYPES = ["lesson", "quiz", "checkout", "navigation", "community", "general"] as const;

const requestSchema = z.object({
  context_type: z.enum(CONTEXT_TYPES).optional(),
  date_range: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "start must be YYYY-MM-DD"),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "end must be YYYY-MM-DD"),
  }),
  course_id: z.string().max(256).optional(),
});

function dateToMs(dateStr: string, endOfDay = false): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return endOfDay
    ? Date.UTC(y, m - 1, d, 23, 59, 59, 999)
    : Date.UTC(y, m - 1, d, 0, 0, 0, 0);
}

interface SentimentByDay {
  date: string;
  avg_sentiment: number | null;
  count: number;
}

export const getSurveyIntelligenceReport = onCall(
  {
    region: "us-central1",
    cors: callableCorsAllowlist,
    timeoutSeconds: 60,
  },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    // Staff-role check via custom claims
    const claims = request.auth?.token ?? {};
    const roles: string[] = Array.isArray(claims.roles)
      ? claims.roles
      : typeof claims.roles === "string"
        ? [claims.roles]
        : [];
    const isStaff = roles.some((r) => ["admin", "superAdmin", "staff"].includes(r));
    if (!isStaff) {
      throw new HttpsError("permission-denied", "Staff access required.");
    }

    const parsed = requestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError(
        "invalid-argument",
        parsed.error.issues.map((e) => e.message).join("; ")
      );
    }

    const { context_type, date_range, course_id } = parsed.data;
    const afterMs = dateToMs(date_range.start, false);
    const beforeMs = dateToMs(date_range.end, true);
    const afterTs = Timestamp.fromMillis(afterMs);
    const beforeTs = Timestamp.fromMillis(beforeMs);

    // Query survey_responses by date range only (avoids composite index requirement).
    // Context and course_id filtering is done in-memory after fetch.
    const baseQ = db
      .collection(ANALYTICS_COLLECTIONS.SURVEY_RESPONSES)
      .where("created_at", ">=", afterTs)
      .where("created_at", "<=", beforeTs)
      .limit(10_000);

    let snap;
    try {
      snap = await baseQ.get();
    } catch (err) {
      logger.error("getSurveyIntelligenceReport: query failed", err);
      throw new HttpsError("internal", "Failed to load survey responses. Check Firestore indexes.");
    }

    // Aggregate (counting only docs that pass in-memory filters)
    let response_count = 0;
    const reaction_breakdown: Record<string, number> = {};
    const confusion_signal_counts: Record<string, number> = {};
    const by_context: Record<string, { count: number; breakdown: Record<string, number> }> = {};
    const daily_sentiment: Record<string, { sum: number; count: number }> = {};
    let slider_sum = 0;
    let slider_count = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      const ctx = typeof d.context_type === "string" ? d.context_type : "general";

      // In-memory filter for context_type and course_id
      if (context_type && ctx !== context_type) continue;
      if (course_id) {
        const meta = d.metadata as Record<string, unknown> | undefined;
        if (meta?.course_id !== course_id) continue;
      }

      response_count++;
      const resp = d.response as { type?: string; value?: unknown; label?: string } | undefined;
      const label = typeof resp?.label === "string" ? resp.label : "unknown";
      const value = resp?.value;
      const triggerEvent = typeof d.trigger_event === "string" ? d.trigger_event : "";

      // Overall reaction breakdown
      reaction_breakdown[label] = (reaction_breakdown[label] ?? 0) + 1;

      // Confusion signals
      if (triggerEvent.includes("confusion") || triggerEvent.includes("confused")) {
        confusion_signal_counts[label] = (confusion_signal_counts[label] ?? 0) + 1;
      }

      // By context
      if (!by_context[ctx]) by_context[ctx] = { count: 0, breakdown: {} };
      by_context[ctx].count++;
      by_context[ctx].breakdown[label] = (by_context[ctx].breakdown[label] ?? 0) + 1;

      // Sentiment trend for slider type
      if (resp?.type === "slider" && typeof value === "number") {
        const createdAt = d.created_at as Timestamp | undefined;
        const dateKey = createdAt
          ? new Date(createdAt.toMillis()).toISOString().slice(0, 10)
          : "unknown";
        if (!daily_sentiment[dateKey]) daily_sentiment[dateKey] = { sum: 0, count: 0 };
        daily_sentiment[dateKey].sum += value;
        daily_sentiment[dateKey].count++;
        slider_sum += value;
        slider_count++;
      }
    }

    const sentiment_trend: SentimentByDay[] = Object.entries(daily_sentiment)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { sum, count }]) => ({
        date,
        avg_sentiment: count > 0 ? Math.round((sum / count) * 100) / 100 : null,
        count,
      }));

    const top_confusion_signals = Object.entries(confusion_signal_counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label_key, count]) => ({ label: label_key, count }));

    // Exposure count: query analytics_events by date range only, filter event_name in-memory
    // (avoids needing a composite index on created_at + event_name).
    const triggerEventSet = new Set([
      "implicit_feedback_shown",
      "lesson_abandonment_feedback_triggered",
      "quiz_confusion_feedback_triggered",
      "navigation_dead_end_feedback_triggered",
      "checkout_hesitation_feedback_triggered",
    ]);
    const contextTriggerMap: Record<string, Set<string>> = {
      lesson: new Set(["implicit_feedback_shown", "lesson_abandonment_feedback_triggered"]),
      quiz: new Set(["quiz_confusion_feedback_triggered"]),
      checkout: new Set(["checkout_hesitation_feedback_triggered"]),
      navigation: new Set(["navigation_dead_end_feedback_triggered"]),
      community: new Set(["implicit_feedback_shown"]),
      general: new Set(["implicit_feedback_shown"]),
    };
    const relevantTriggers = context_type ? (contextTriggerMap[context_type] ?? triggerEventSet) : triggerEventSet;

    let exposure_count = 0;
    try {
      const expSnap = await db
        .collection(ANALYTICS_COLLECTIONS.LEGACY_EVENTS)
        .where("created_at", ">=", afterTs)
        .where("created_at", "<=", beforeTs)
        .limit(50_000)
        .get();
      for (const d of expSnap.docs) {
        const eventName = d.data().event_name;
        if (typeof eventName === "string" && relevantTriggers.has(eventName)) {
          exposure_count++;
        }
      }
    } catch (err) {
      logger.warn("getSurveyIntelligenceReport: exposure query failed", err);
    }

    const participation_rate =
      exposure_count > 0 ? Math.round((response_count / exposure_count) * 10000) / 10000 : null;
    const avg_slider_sentiment =
      slider_count > 0 ? Math.round((slider_sum / slider_count) * 100) / 100 : null;

    return {
      response_count,
      exposure_count,
      participation_rate,
      avg_slider_sentiment,
      reaction_breakdown,
      sentiment_trend,
      top_confusion_signals,
      by_context,
      date_range,
      context_type: context_type ?? null,
      course_id: course_id ?? null,
    };
  }
);
