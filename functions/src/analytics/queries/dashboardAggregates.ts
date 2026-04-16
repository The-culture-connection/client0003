/**
 * Read-side helpers for admin dashboards and reporting callables.
 * Uses Admin SDK only — not callable from the browser directly.
 */

import type {Firestore} from "firebase-admin/firestore";
import {ANALYTICS_COLLECTIONS} from "../mortarAnalyticsContract";

/** Count all canonical raw events for a user (Admin SDK; use in reporting callables). */
export async function countRawEventsForUser(db: Firestore, userId: string): Promise<number> {
  const q = await db
    .collection(ANALYTICS_COLLECTIONS.RAW_EVENTS)
    .where("user_id", "==", userId)
    .count()
    .get();
  return q.data().count;
}

type NumericMap = Record<string, number>;

interface DailyMetricsDoc {
  date_utc?: string;
  dau?: number;
  total_web_events?: number;
  counts?: Record<string, unknown>;
}

export interface Phase5DerivedMetrics {
  onboarding_completion_rate: number | null;
  lesson_completion_rate: number | null;
  quiz_pass_rate: number | null;
  engagement_rate: number | null;
  churn_risk_indicators: {
    dormant_users_7d: number;
    low_streak_users: number;
    churn_risk_ratio: number | null;
  };
}

export interface Phase5Funnels {
  login_to_onboarding_to_dashboard: {
    login: number;
    onboarding_completed: number;
    dashboard_active: number;
    login_to_onboarding_rate: number | null;
    onboarding_to_dashboard_rate: number | null;
  };
  dashboard_to_curriculum_to_lesson: {
    dashboard: number;
    curriculum_engaged: number;
    lesson_started: number;
    dashboard_to_curriculum_rate: number | null;
    curriculum_to_lesson_rate: number | null;
  };
  lesson_to_completion: {
    lesson_started: number;
    lesson_completed: number;
    completion_rate: number | null;
  };
  community_to_engagement: {
    community_visits: number;
    engagements: number;
    engagement_rate: number | null;
  };
  shop_to_add_to_cart: {
    shop_visits: number;
    add_to_cart: number;
    add_to_cart_rate: number | null;
  };
}

export interface Phase5DashboardSnapshot {
  window_days: number;
  start_date_utc: string;
  end_date_utc: string;
  totals: {
    dau_sum: number;
    total_web_events: number;
    counts: NumericMap;
  };
  derived: Phase5DerivedMetrics;
  funnels: Phase5Funnels;
}

function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

function toNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function pickCount(counts: NumericMap, key: string): number {
  return toNumber(counts[key]);
}

async function loadDailyMetricsWindow(db: Firestore, days: number): Promise<DailyMetricsDoc[]> {
  const end = new Date();
  const start = new Date(end.getTime());
  start.setUTCDate(start.getUTCDate() - Math.max(1, days) + 1);

  const q = await db
    .collection(ANALYTICS_COLLECTIONS.DAILY_METRICS)
    .where("date_utc", ">=", utcDateKey(start))
    .where("date_utc", "<=", utcDateKey(end))
    .orderBy("date_utc", "asc")
    .get();
  return q.docs.map((d) => d.data() as DailyMetricsDoc);
}

function aggregateDailyMetrics(docs: DailyMetricsDoc[]): {dau_sum: number; total_web_events: number; counts: NumericMap} {
  const counts: NumericMap = {};
  let dau = 0;
  let total = 0;
  for (const d of docs) {
    dau += toNumber(d.dau);
    total += toNumber(d.total_web_events);
    const c = (d.counts ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(c)) {
      counts[k] = (counts[k] ?? 0) + toNumber(v);
    }
  }
  return {dau_sum: dau, total_web_events: total, counts};
}

async function computeChurnRisk(db: Firestore): Promise<Phase5DerivedMetrics["churn_risk_indicators"]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [summarySnap, dormantSnap, lowStreakSnap] = await Promise.all([
    db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY).count().get(),
    db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY)
      .where("last_active_at", "<", sevenDaysAgo)
      .count()
      .get(),
    db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY)
      .where("streak_days", "<=", 1)
      .count()
      .get(),
  ]);
  const totalUsers = summarySnap.data().count;
  const dormant = dormantSnap.data().count;
  const lowStreak = lowStreakSnap.data().count;
  return {
    dormant_users_7d: dormant,
    low_streak_users: lowStreak,
    churn_risk_ratio: ratio(dormant + lowStreak, totalUsers * 2),
  };
}

function computeDerivedMetrics(totals: {dau_sum: number; total_web_events: number; counts: NumericMap}, churn: Phase5DerivedMetrics["churn_risk_indicators"]): Phase5DerivedMetrics {
  const signups = pickCount(totals.counts, "signups");
  const onboardingCompletions = pickCount(totals.counts, "onboarding_completions");
  const lessonsStarted = pickCount(totals.counts, "lessons_started");
  const lessonsCompleted = pickCount(totals.counts, "lessons_completed");
  const quizzesPassed = pickCount(totals.counts, "quizzes_passed");
  const quizzesFailed = pickCount(totals.counts, "quizzes_failed");
  const engagements =
    pickCount(totals.counts, "discussions_created") +
    pickCount(totals.counts, "discussion_replies") +
    pickCount(totals.counts, "dms_sent") +
    pickCount(totals.counts, "groups_joined") +
    pickCount(totals.counts, "event_registrations") +
    pickCount(totals.counts, "notification_item_clicked");

  return {
    onboarding_completion_rate: ratio(onboardingCompletions, signups),
    lesson_completion_rate: ratio(lessonsCompleted, lessonsStarted),
    quiz_pass_rate: ratio(quizzesPassed, quizzesPassed + quizzesFailed),
    engagement_rate: ratio(engagements, totals.dau_sum),
    churn_risk_indicators: churn,
  };
}

function computeFunnels(totals: {dau_sum: number; counts: NumericMap}): Phase5Funnels {
  const c = totals.counts;
  const login = pickCount(c, "signups");
  const onboarding = pickCount(c, "onboarding_completions");
  const dashboard = totals.dau_sum;

  const curriculumEngaged =
    pickCount(c, "lessons_started") +
    pickCount(c, "curriculum_continue_clicked");
  const lessonStarted = pickCount(c, "lessons_started");
  const lessonCompleted = pickCount(c, "lessons_completed");

  const communityVisits =
    pickCount(c, "discussions_search_changed") +
    pickCount(c, "discussion_category_selected");
  const communityEngagements =
    pickCount(c, "discussions_created") +
    pickCount(c, "discussion_replies") +
    pickCount(c, "dms_sent") +
    pickCount(c, "groups_joined") +
    pickCount(c, "notification_item_clicked");

  const shopVisits = pickCount(c, "shop_filter_changed") + pickCount(c, "shop_size_changed");
  const addToCart = pickCount(c, "cart_add_to_cart");

  return {
    login_to_onboarding_to_dashboard: {
      login,
      onboarding_completed: onboarding,
      dashboard_active: dashboard,
      login_to_onboarding_rate: ratio(onboarding, login),
      onboarding_to_dashboard_rate: ratio(dashboard, onboarding),
    },
    dashboard_to_curriculum_to_lesson: {
      dashboard,
      curriculum_engaged: curriculumEngaged,
      lesson_started: lessonStarted,
      dashboard_to_curriculum_rate: ratio(curriculumEngaged, dashboard),
      curriculum_to_lesson_rate: ratio(lessonStarted, curriculumEngaged),
    },
    lesson_to_completion: {
      lesson_started: lessonStarted,
      lesson_completed: lessonCompleted,
      completion_rate: ratio(lessonCompleted, lessonStarted),
    },
    community_to_engagement: {
      community_visits: communityVisits,
      engagements: communityEngagements,
      engagement_rate: ratio(communityEngagements, communityVisits),
    },
    shop_to_add_to_cart: {
      shop_visits: shopVisits,
      add_to_cart: addToCart,
      add_to_cart_rate: ratio(addToCart, shopVisits),
    },
  };
}

export async function buildPhase5DashboardSnapshot(db: Firestore, days: number): Promise<Phase5DashboardSnapshot> {
  const windowDays = Math.max(1, Math.min(90, Math.floor(days)));
  const docs = await loadDailyMetricsWindow(db, windowDays);
  const totals = aggregateDailyMetrics(docs);
  const churn = await computeChurnRisk(db);
  const derived = computeDerivedMetrics(totals, churn);
  const funnels = computeFunnels(totals);

  const end = new Date();
  const start = new Date(end.getTime());
  start.setUTCDate(start.getUTCDate() - windowDays + 1);

  return {
    window_days: windowDays,
    start_date_utc: utcDateKey(start),
    end_date_utc: utcDateKey(end),
    totals,
    derived,
    funnels,
  };
}
