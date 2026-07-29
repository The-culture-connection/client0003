/**
 * Shared audience lookups for conference push notifications.
 *
 * Conference notifications must never go to the whole user base — an attendee
 * list is the correct audience for anything happening inside an event.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Self-sufficient rather than relying on an importer having initialised first:
// `pushNotifications.ts` now imports this module, and ES module evaluation would
// otherwise run this file before that one's initializeApp() call.
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

/** Cap on a single conference's audience, mirroring the platform-wide limit. */
const MAX_AUDIENCE = 2500;

/**
 * Everyone with a redeemed ticket for [conferenceId].
 *
 * `conferences/{id}/attendees/{uid}` is written server-side on redemption, so
 * its doc ids are exactly the people who are in.
 */
export async function conferenceAttendeeUids(conferenceId: string): Promise<string[]> {
  const snap = await db
    .collection("conferences")
    .doc(conferenceId)
    .collection("attendees")
    .limit(MAX_AUDIENCE)
    .get();
  return snap.docs.map((d) => d.id);
}

/**
 * Attendees who RSVP'd to a session (`registered_users` on the session doc).
 *
 * Returns an empty list when the session has no RSVPs, so callers can skip
 * sending rather than falling back to a broader audience.
 */
export async function sessionRsvpUids(
  conferenceId: string,
  sessionId: string
): Promise<string[]> {
  const doc = await db
    .collection("conferences")
    .doc(conferenceId)
    .collection("sessions")
    .doc(sessionId)
    .get();
  const list = doc.data()?.registered_users;
  if (!Array.isArray(list)) return [];
  return list.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

/** Display name for a conference, for push copy. */
export async function conferenceName(conferenceId: string): Promise<string> {
  const doc = await db.collection("conferences").doc(conferenceId).get();
  const n = doc.data()?.name;
  return typeof n === "string" && n.trim() ? n.trim() : "the conference";
}

/**
 * Coarse per-minute throttle for chatty sources (session chat, community hub).
 *
 * A busy thread would otherwise fire a push per message. Bucketing the dedupe
 * key to the minute means at most one push per source per minute, which the
 * caller passes through `dedupeKey`.
 */
export function minuteBucket(atMs: number = Date.now()): string {
  return String(Math.floor(atMs / 60000));
}
