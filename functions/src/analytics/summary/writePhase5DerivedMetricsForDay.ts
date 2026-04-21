/**
 * Phase 5 — `derived_metrics/{YYYY-MM-DD}` (UTC): decision-oriented rates + funnel drop-offs
 * computed only from `daily_metrics/{date}` (summaries), not from raw event streams.
 */

import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function ratio(n: number, d: number): number | null {
  return d > 0 ? n / d : null;
}

function readCounts(d: Record<string, unknown>): Record<string, unknown> {
  const c = d.counts;
  return c && typeof c === "object" && !Array.isArray(c) ? (c as Record<string, unknown>) : {};
}

function pick(counts: Record<string, unknown>, key: string): number {
  return toNum(counts[key]);
}

/** Expansion mobile per-event tallies on `daily_metrics.counts` (`raw_event.<event_name>`). */
function raw(counts: Record<string, unknown>, eventName: string): number {
  return pick(counts, `raw_event.${eventName}`);
}

type Health = "CRITICAL" | "LOW" | "MODERATE" | "HEALTHY";

function rateHealth(rate: number | null, critical: number, low: number, good: number): Health {
  if (rate == null || Number.isNaN(rate)) return "MODERATE";
  if (rate < critical) return "CRITICAL";
  if (rate < low) return "LOW";
  if (rate < good) return "MODERATE";
  return "HEALTHY";
}

function insightOnboarding(rate: number | null, health: Health): { insight: string; action: string } {
  if (rate == null) {
    return { insight: "Not enough onboarding starts this UTC day to score conversion.", action: "Drive traffic into onboarding_screen_started." };
  }
  if (health === "CRITICAL" || health === "LOW") {
    return {
      insight: `Only ${(rate * 100).toFixed(0)}% of users who opened onboarding completed it this day.`,
      action: "Shorten steps, fix save failures, and revisit required fields vs abandon points.",
    };
  }
  return {
    insight: `${(rate * 100).toFixed(0)}% of onboarding sessions completed — on track.`,
    action: "Keep monitoring onboarding_save_failed and abandoned signals in friction_summary.",
  };
}

function insightMatchToMessage(rate: number | null, health: Health): { insight: string; action: string } {
  if (rate == null) {
    return { insight: "No matching successes or message clicks this day.", action: "Confirm matching_callable_succeeded is firing after profile completion." };
  }
  if (health === "CRITICAL" || health === "LOW") {
    return {
      insight: `Only ${(rate * 100).toFixed(0)}% of successful match runs led to a message click.`,
      action: "Improve match quality, profile depth, and post-match CTA copy.",
    };
  }
  return {
    insight: `${(rate * 100).toFixed(0)}% of match successes led to a conversation CTA click.`,
    action: "Maintain relevance signals and prompt first outreach after a good match.",
  };
}

function insightJobToMessage(rate: number | null, health: Health): { insight: string; action: string } {
  if (rate == null) {
    return { insight: "No job messages or job creates recorded this day.", action: "Verify job_create_succeeded logs entity_id for job_summary depth." };
  }
  if (health === "CRITICAL" || health === "LOW") {
    return {
      insight: `Job listing message rate is ${(rate * 100).toFixed(0)}% (author message clicks vs jobs created).`,
      action: "Improve job discoverability, author trust signals, and one-tap message affordance.",
    };
  }
  return {
    insight: `${(rate * 100).toFixed(0)}% of new jobs received an author message click the same day.`,
    action: "Keep testing explore_job_message_author_clicked coverage on listings.",
  };
}

function insightRsvp(rate: number | null, health: Health): { insight: string; action: string } {
  if (rate == null) {
    return { insight: "No RSVP clicks or completes this day.", action: "Promote events_feed_event_tile_opened → event_register_clicked funnel." };
  }
  if (health === "CRITICAL" || health === "LOW") {
    return {
      insight: `RSVP completion is ${(rate * 100).toFixed(0)}% of register clicks.`,
      action: "Reduce friction on event detail, calendar conflicts, and capacity messaging.",
    };
  }
  return {
    insight: `RSVP completion ${(rate * 100).toFixed(0)}% — healthy for this window.`,
    action: "Watch event_register_failed in friction_summary.",
  };
}

function insightGroupJoin(rate: number | null, health: Health): { insight: string; action: string } {
  if (rate == null) {
    return { insight: "No group join outcomes this day.", action: "Check group directory impressions vs join CTAs." };
  }
  if (health === "CRITICAL" || health === "LOW") {
    return {
      insight: `Group join success rate ${(rate * 100).toFixed(0)}% (instant + pending vs detail opens).`,
      action: "Tune visibility rules, approval copy, and search relevance for groups.",
    };
  }
  return {
    insight: `Group joins converting at ${(rate * 100).toFixed(0)}% of detail views.`,
    action: "Keep monitoring group_join_pending_review vs instant paths.",
  };
}

/**
 * Writes `derived_metrics/{dateUtc}` from `daily_metrics/{dateUtc}`.
 * Safe to call if daily doc is missing (no-op).
 */
export async function writePhase5DerivedMetricsForDay(db: Firestore, dateUtc: string): Promise<void> {
  const dailyRef = db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(dateUtc);
  const snap = await dailyRef.get();
  if (!snap.exists) return;

  const d = snap.data() as Record<string, unknown>;
  const counts = readCounts(d);
  const dau = toNum(d.dau);

  const onboardingStarted = raw(counts, "onboarding_screen_started");
  const onboardingCompleted = raw(counts, "onboarding_completed");
  const onboardingRate = ratio(onboardingCompleted, onboardingStarted);
  const onboardingHealth = rateHealth(onboardingRate, 0.15, 0.35, 0.55);
  const onboardingCopy = insightOnboarding(onboardingRate, onboardingHealth);

  const regClick = raw(counts, "event_register_clicked");
  const regDone = raw(counts, "event_registered");
  const rsvpRate = ratio(regDone, regClick);
  const rsvpHealth = rateHealth(rsvpRate, 0.2, 0.45, 0.65);
  const rsvpCopy = insightRsvp(rsvpRate, rsvpHealth);

  const groupDetail = raw(counts, "group_detail_started");
  const groupOk = raw(counts, "group_join_succeeded_instant") + raw(counts, "group_join_pending_review");
  const groupRate = ratio(groupOk, Math.max(groupDetail, 1));
  const groupHealth = rateHealth(groupRate, 0.1, 0.25, 0.45);
  const groupCopy = insightGroupJoin(groupRate, groupHealth);

  const jobsCreated = pick(counts, "jobs_created");
  const jobMsg = raw(counts, "explore_job_message_author_clicked");
  const jobRate = ratio(jobMsg, Math.max(jobsCreated, 1));
  const jobHealth = rateHealth(jobRate, 0.05, 0.15, 0.3);
  const jobCopy = insightJobToMessage(jobRate, jobHealth);

  const matchOk = raw(counts, "matching_callable_succeeded");
  const matchMsg = raw(counts, "matching_match_message_clicked");
  const matchRate = ratio(matchMsg, Math.max(matchOk, 1));
  const matchHealth = rateHealth(matchRate, 0.08, 0.18, 0.35);
  const matchCopy = insightMatchToMessage(matchRate, matchHealth);

  const posts = pick(counts, "posts_created");
  const messages = pick(counts, "messages_sent");
  const postsPerDau = ratio(posts, Math.max(dau, 1));
  const messagesPerDau = ratio(messages, Math.max(dau, 1));

  /** Web curriculum counters coexisting on the same `daily_metrics` doc. */
  const signups = pick(counts, "signups");
  const onboardingCompletionsWeb = pick(counts, "onboarding_completions");
  const webOnboardingRate = ratio(onboardingCompletionsWeb, Math.max(signups, 1));

  const matchingStarted = raw(counts, "matching_screen_started");
  const matchingCallableStarted = raw(counts, "matching_callable_started");
  const matchingCallableFailed = raw(counts, "matching_callable_failed");

  const funnelDropoffs = {
    expansion_onboarding: {
      onboarding_screen_started: onboardingStarted,
      onboarding_save_submitted: raw(counts, "onboarding_save_submitted"),
      onboarding_completed: onboardingCompleted,
      drop_started_to_completed: onboardingStarted > 0 ? 1 - (onboardingCompleted / onboardingStarted) : null,
    },
    expansion_matching: {
      matching_screen_started: matchingStarted,
      matching_callable_started: matchingCallableStarted,
      matching_callable_succeeded: matchOk,
      matching_match_message_clicked: matchMsg,
      drop_screen_to_message:
        matchingStarted > 0 ? 1 - matchMsg / matchingStarted : null,
      matching_callable_failed: matchingCallableFailed,
    },
    expansion_event_rsvp: {
      events_feed_event_tile_opened: raw(counts, "events_feed_event_tile_opened"),
      event_register_clicked: regClick,
      event_registered: regDone,
      drop_click_to_registered: regClick > 0 ? 1 - regDone / regClick : null,
    },
    expansion_job_to_message: {
      jobs_created: jobsCreated,
      explore_job_message_author_clicked: jobMsg,
    },
  };

  const derivedRef = db.collection(ANALYTICS_COLLECTIONS.DERIVED_METRICS).doc(dateUtc);
  await derivedRef.set(
    {
      schema_version: 1,
      date_utc: dateUtc,
      updated_at: FieldValue.serverTimestamp(),
      computed_from: "daily_metrics",
      inputs: {
        dau,
        total_expansion_mobile_events: toNum(d.total_expansion_mobile_events),
        total_web_events: toNum(d.total_web_events),
      },
      expansion_mobile: {
        onboarding_conversion_rate: onboardingRate,
        onboarding_status: onboardingHealth,
        onboarding_insight: onboardingCopy.insight,
        onboarding_action: onboardingCopy.action,
        event_rsvp_rate: rsvpRate,
        event_rsvp_status: rsvpHealth,
        event_rsvp_insight: rsvpCopy.insight,
        event_rsvp_action: rsvpCopy.action,
        group_join_rate: groupRate,
        group_join_status: groupHealth,
        group_join_insight: groupCopy.insight,
        group_join_action: groupCopy.action,
        job_to_message_rate: jobRate,
        job_to_message_status: jobHealth,
        job_to_message_insight: jobCopy.insight,
        job_to_message_action: jobCopy.action,
        match_to_message_rate: matchRate,
        match_to_message_status: matchHealth,
        match_to_message_insight: matchCopy.insight,
        match_to_message_action: matchCopy.action,
      },
      per_user_density: {
        posts_per_dau: postsPerDau,
        messages_per_dau: messagesPerDau,
        posts_created: posts,
        messages_sent: messages,
      },
      web_curriculum_blend: {
        /** Web-only style completion / signup ratio when those counters exist on the same day doc. */
        onboarding_completion_over_signups: webOnboardingRate,
      },
      funnel_dropoffs_daily: funnelDropoffs,
      time_to_first_signals: {
        note:
          "Per-user first-touch timestamps (e.g. expansion_first_direct_message_at) are maintained on user_analytics_summary for drill-down; aggregate latency histograms are not computed in this doc.",
      },
      derived_computed_at: Timestamp.now(),
    },
    { merge: true }
  );
}
