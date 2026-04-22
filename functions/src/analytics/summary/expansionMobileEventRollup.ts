/**
 * Phase 4 — roll up Expansion Network mobile events (`expansion_analytics_events`)
 * into `user_analytics_summary`, `daily_metrics`, per-group / matching / job summaries,
 * funnel + friction aggregates.
 */

import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { ANALYTICS_COLLECTIONS } from "../mortarAnalyticsContract";
import { previousUtcYyyyMmDd, utcYyyyMmDd } from "./phase4WebEventRollup";

function asProps(data: Record<string, unknown>): Record<string, unknown> {
  const p = data.properties;
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function readStr(props: Record<string, unknown>, key: string): string | null {
  const v = props[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function eventDayKey(data: Record<string, unknown>): string {
  const ing = data.ingested_at;
  if (ing instanceof Timestamp) return utcYyyyMmDd(ing.toDate());
  const ce = data.client_emitted_at;
  if (ce instanceof Timestamp) return utcYyyyMmDd(ce.toDate());
  return utcYyyyMmDd(new Date());
}

function mergeIncrementCount(target: Record<string, unknown>, key: string, delta = 1): void {
  const prevCounts =
    target.counts && typeof target.counts === "object" && !Array.isArray(target.counts)
      ? (target.counts as Record<string, unknown>)
      : {};
  target.counts = {
    ...prevCounts,
    [key]: FieldValue.increment(delta),
  };
}

function isFrictionEventName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("failed") ||
    n.includes("_error") ||
    n.includes("blocked") ||
    n.includes("denied") ||
    n.includes("not_found") ||
    n.includes("abandoned") ||
    n.includes("decode_failed") ||
    n.includes("stream_error") ||
    n.includes("send_failed")
  );
}

/** Per-event user counter keys under `user_analytics_summary.counts`. */
function userCounterDelta(eventName: string): Record<string, number> | null {
  switch (eventName) {
  case "feed_post_create_succeeded":
    return { total_posts_created: 1 };
  case "group_thread_comment_submitted":
    // Group thread replies (still roll into total_comments for legacy dashboards).
    return { total_comments: 1, total_group_thread_messages_sent: 1 };
  case "post_reply_submitted":
    return { total_comments: 1 };
  case "direct_chat_message_sent":
    return { total_messages_sent: 1 };
  case "group_join_succeeded_instant":
  case "group_join_pending_review":
    return { total_groups_joined: 1 };
  case "event_registered":
    return { total_events_registered: 1 };
  case "job_create_succeeded":
    return { total_jobs_created: 1 };
  case "skill_listing_create_succeeded":
    return { total_skills_created: 1 };
  case "matching_match_message_clicked":
    return { total_matches_messaged: 1 };
  case "matching_callable_started":
    return { total_matching_runs_started: 1 };
  case "matching_callable_succeeded":
    return { total_matching_runs_succeeded: 1 };
  default:
    return null;
  }
}

function dailyCounterDelta(eventName: string): Record<string, number> | null {
  const u = userCounterDelta(eventName);
  if (!u) return null;
  const out: Record<string, number> = {};
  if (u.total_posts_created) out.posts_created = 1;
  if (u.total_messages_sent) out.messages_sent = 1;
  if (u.total_jobs_created) out.jobs_created = 1;
  if (u.total_skills_created) out.skills_created = 1;
  if (u.total_events_registered) out.events_registered = 1;
  return Object.keys(out).length ? out : null;
}

function funnelIncrements(eventName: string): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const bump = (funnel: string, step: string) => {
    if (!out[funnel]) out[funnel] = {};
    out[funnel][step] = (out[funnel][step] ?? 0) + 1;
  };

  switch (eventName) {
  case "landing_screen_started":
  case "landing_claim_invite_clicked":
  case "landing_sign_in_clicked":
    bump("auth", eventName);
    break;
  case "auth_sign_in_succeeded":
  case "invite_code_validation_succeeded":
  case "invite_account_create_succeeded":
  case "session_initialize_backend_succeeded":
    bump("auth", eventName);
    break;
  case "onboarding_screen_started":
  case "onboarding_save_submitted":
  case "onboarding_completed":
  case "onboarding_save_failed":
  case "onboarding_abandoned":
    bump("onboarding", eventName);
    break;
  case "matching_screen_started":
  case "matching_start_clicked":
  case "matching_callable_started":
  case "matching_callable_succeeded":
  case "matching_callable_failed":
  case "matching_match_profile_opened":
  case "matching_match_message_clicked":
    bump("matching", eventName);
    break;
  case "explore_job_message_author_clicked":
  case "direct_chat_message_sent":
    bump("job_to_message", eventName);
    break;
  case "events_feed_event_tile_opened":
  case "event_register_clicked":
  case "event_registered":
  case "event_register_failed":
    bump("event_to_rsvp", eventName);
    break;
  default:
    break;
  }
  return out;
}

function resolveGroupId(eventName: string, props: Record<string, unknown>, entityId: string | null): string | null {
  const gid = readStr(props, "group_id");
  if (gid) return gid;
  if (!entityId) return null;
  if (
    eventName.startsWith("group_") ||
    eventName.startsWith("group_thread") ||
    eventName === "group_detail_started"
  ) {
    return entityId;
  }
  return null;
}

/**
 * Apply all Phase-4 rollups for one new `expansion_analytics_events` document.
 */
export async function applyExpansionMobileRollupsForEvent(
  db: Firestore,
  eventId: string,
  data: Record<string, unknown>
): Promise<void> {
  const uid = typeof data.user_id === "string" && data.user_id.length > 0 ? data.user_id : null;
  const eventName = typeof data.event_name === "string" ? data.event_name : "";
  if (!eventName) {
    logger.warn("expansionMobileRollup: missing event_name", { eventId });
    return;
  }

  const props = asProps(data);
  const entityId = readStr(props, "entity_id");
  const groupId = resolveGroupId(eventName, props, entityId);

  const todayKey = eventDayKey(data);
  const yesterdayKey = previousUtcYyyyMmDd(todayKey);

  const userRef = uid ? db.collection(ANALYTICS_COLLECTIONS.USER_ANALYTICS_SUMMARY).doc(uid) : null;
  const dailyRef = db.collection(ANALYTICS_COLLECTIONS.DAILY_METRICS).doc(todayKey);

  const uc = userCounterDelta(eventName);
  const dc = dailyCounterDelta(eventName);
  const funnels = funnelIncrements(eventName);

  await db.runTransaction(async (tx) => {
    let firstTouchToday = false;

    if (userRef) {
      const snap = await tx.get(userRef);
      const prev = snap.exists ? (snap.data() as Record<string, unknown>) : {};
      const lastAct = typeof prev.last_activity_utc_date === "string" ? prev.last_activity_utc_date : undefined;
      firstTouchToday = lastAct !== todayKey;

      const userPatch: Record<string, unknown> = {
        schema_version: 1,
        user_id: uid,
        updated_at: FieldValue.serverTimestamp(),
        last_active_at: FieldValue.serverTimestamp(),
        expansion_mobile_last_event_at: FieldValue.serverTimestamp(),
        expansion_mobile_last_event_name: eventName,
      };

      if (firstTouchToday) {
        const prevStreak = typeof prev.streak_days === "number" ? prev.streak_days : 0;
        const prevBest = typeof prev.best_streak_days === "number" ? prev.best_streak_days : 0;
        const newStreak = lastAct === yesterdayKey ? prevStreak + 1 : 1;
        const newBest = Math.max(prevBest, newStreak);
        userPatch.last_activity_utc_date = todayKey;
        userPatch.streak_days = newStreak;
        userPatch.best_streak_days = newBest;
      }

      if (uc) {
        for (const [k, v] of Object.entries(uc)) {
          mergeIncrementCount(userPatch, k, v);
        }
      }

      if (eventName === "onboarding_completed") {
        if (!prev.onboarding_completed_at) {
          userPatch.onboarding_completed_at = FieldValue.serverTimestamp();
          mergeIncrementCount(userPatch, "onboarding_completed", 1);
        }
      }

      if (eventName === "direct_chat_message_sent" && !prev.expansion_first_direct_message_at) {
        userPatch.expansion_first_direct_message_at = FieldValue.serverTimestamp();
      }
      if (eventName === "matching_match_message_clicked" && !prev.expansion_first_match_message_click_at) {
        userPatch.expansion_first_match_message_click_at = FieldValue.serverTimestamp();
      }

      tx.set(userRef, userPatch, { merge: true });
    }

    const dailyPatch: Record<string, unknown> = {
      schema_version: 1,
      date_utc: todayKey,
      updated_at: FieldValue.serverTimestamp(),
      total_expansion_mobile_events: FieldValue.increment(1),
    };

    mergeIncrementCount(dailyPatch, `raw_event.${eventName}`, 1);

    if (uid && firstTouchToday) {
      dailyPatch.dau = FieldValue.increment(1);
    }

    if (eventName === "invite_account_create_succeeded") {
      mergeIncrementCount(dailyPatch, "new_users", 1);
    }

    if (dc) {
      for (const [k, v] of Object.entries(dc)) {
        mergeIncrementCount(dailyPatch, k, v);
      }
    }

    tx.set(dailyRef, dailyPatch, { merge: true });

    for (const [funnel, steps] of Object.entries(funnels)) {
      const ref = db.collection(ANALYTICS_COLLECTIONS.FUNNEL_SUMMARY).doc(funnel);
      const fp: Record<string, unknown> = {
        schema_version: 1,
        funnel,
        updated_at: FieldValue.serverTimestamp(),
      };
      for (const [step, n] of Object.entries(steps)) {
        mergeIncrementCount(fp, step, n);
      }
      tx.set(ref, fp, { merge: true });
    }

    if (isFrictionEventName(eventName)) {
      const fr = db.collection(ANALYTICS_COLLECTIONS.FRICTION_SUMMARY).doc(eventName);
      tx.set(
        fr,
        {
          schema_version: 1,
          event_name: eventName,
          updated_at: FieldValue.serverTimestamp(),
          total: FieldValue.increment(1),
        },
        { merge: true }
      );
    }

    if (groupId) {
      const cref = db.collection(ANALYTICS_COLLECTIONS.COMMUNITY_SUMMARY).doc(groupId);
      const cp: Record<string, unknown> = {
        schema_version: 1,
        group_id: groupId,
        updated_at: FieldValue.serverTimestamp(),
      };
      mergeIncrementCount(cp, `events.${eventName}`, 1);
      tx.set(cref, cp, { merge: true });
    }

    if (uid && eventName.startsWith("matching_")) {
      const mref = db.collection(ANALYTICS_COLLECTIONS.MATCHING_SUMMARY).doc(uid);
      const mp: Record<string, unknown> = {
        schema_version: 1,
        user_id: uid,
        updated_at: FieldValue.serverTimestamp(),
      };
      mergeIncrementCount(mp, eventName, 1);
      tx.set(mref, mp, { merge: true });
    }

    const jobId =
      eventName === "job_create_succeeded" || eventName === "explore_job_message_author_clicked"
        ? entityId
        : null;
    if (jobId) {
      const jref = db.collection(ANALYTICS_COLLECTIONS.JOB_SUMMARY).doc(jobId);
      const jp: Record<string, unknown> = {
        schema_version: 1,
        job_id: jobId,
        updated_at: FieldValue.serverTimestamp(),
      };
      mergeIncrementCount(jp, eventName, 1);
      tx.set(jref, jp, { merge: true });
    }
  });
}
