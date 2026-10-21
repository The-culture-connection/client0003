/**
 * Conference — smart matching among one conference's attendees.
 *
 * Callable: `runConferenceUserMatching({ conferenceId })`
 *
 * Same scoring as the Networking Hall (`runExpansionUserMatching`, via
 * `../matching/matchScoring`), but the pool is the ticket holders of a single
 * conference rather than every member with network access, so conference-only
 * accounts can match too.
 *
 * Pool rules:
 * - The caller must hold a ticket (`conferences/{cid}/attendees/{uid}`).
 * - Candidates are other attendees with at least some matching data (skills or
 *   business goals). Attendees with only the minimal onboarding profile still
 *   take part — they match on goals alone, which is why the app warns callers
 *   with an incomplete profile that results may be less accurate.
 * - Attendees who switched discoverability off in the Networking Zone
 *   (`networkingProfiles/{uid}.enabled == false`) are never suggested.
 *
 * Unlike the Networking Hall, people the caller already has a DM with are NOT
 * excluded: at an event, "who here should I find?" includes people you know.
 *
 * Writes: `users/{uid}/conference_matches/{conferenceId}_{matchedUserId}`, each
 * carrying `conferenceId`. A run replaces only that conference's rows.
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, type DocumentReference} from "firebase-admin/firestore";
import {z} from "zod";
import * as logger from "firebase-functions/logger";
import {
  ALGORITHM_VERSION,
  TOP_N,
  asStringArray,
  matchDocFields,
  rankMatches,
  toMatchCandidate,
  type MatchCandidate,
} from "../matching/matchScoring";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

const MAX_ATTENDEES = 5000;
const GET_ALL_CHUNK = 300;

const requestSchema = z.object({
  conferenceId: z.string().trim().min(1),
});

function hasMatchingData(c: MatchCandidate): boolean {
  return c.confident.length > 0 || c.desired.length > 0 || c.goals.length > 0;
}

async function clearConferenceMatches(uid: string, conferenceId: string): Promise<void> {
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("conference_matches")
    .where("conferenceId", "==", conferenceId)
    .get();
  let batch = db.batch();
  let n = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    n++;
    if (n >= 450) {
      await batch.commit();
      batch = db.batch();
      n = 0;
    }
  }
  if (n > 0) await batch.commit();
}

export const runConferenceUserMatching = onCall({invoker: "public"}, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const parsed = requestSchema.safeParse(request.data || {});
  if (!parsed.success) {
    throw new HttpsError("invalid-argument", "conferenceId is required.");
  }
  const {conferenceId} = parsed.data;
  const confRef = db.collection("conferences").doc(conferenceId);

  const [confSnap, callerAttendee] = await Promise.all([
    confRef.get(),
    confRef.collection("attendees").doc(callerUid).get(),
  ]);
  if (!confSnap.exists) {
    throw new HttpsError("not-found", "Conference not found.");
  }
  if (!callerAttendee.exists) {
    throw new HttpsError(
      "failed-precondition",
      "You need a ticket to this conference to see your matches."
    );
  }

  const [attendeeSnap, hiddenSnap] = await Promise.all([
    confRef.collection("attendees").select().limit(MAX_ATTENDEES + 1).get(),
    confRef.collection("networkingProfiles").where("enabled", "==", false).select().get(),
  ]);
  if (attendeeSnap.size > MAX_ATTENDEES) {
    throw new HttpsError(
      "failed-precondition",
      `Too many attendees (${attendeeSnap.size}). Cap is ${MAX_ATTENDEES}.`
    );
  }
  const hidden = new Set(hiddenSnap.docs.map((d) => d.id));

  const userRefs: DocumentReference[] = attendeeSnap.docs.map((d) =>
    db.collection("users").doc(d.id)
  );
  const pool: MatchCandidate[] = [];
  let caller: MatchCandidate | null = null;
  for (let i = 0; i < userRefs.length; i += GET_ALL_CHUNK) {
    const docs = await db.getAll(...userRefs.slice(i, i + GET_ALL_CHUNK));
    for (const doc of docs) {
      if (!doc.exists) continue;
      const c = toMatchCandidate(doc.id, doc.data()!);
      if (doc.id === callerUid) caller = c;
      if (hasMatchingData(c)) pool.push(c);
    }
  }
  if (!caller) {
    throw new HttpsError("failed-precondition", "Finish onboarding to see your matches.");
  }

  const top = rankMatches(caller, pool, (b) => hidden.has(b.uid), TOP_N);
  await clearConferenceMatches(callerUid, conferenceId);

  const baseRef = db.collection("users").doc(callerUid).collection("conference_matches");
  const batch = db.batch();
  for (const row of top) {
    batch.set(baseRef.doc(`${conferenceId}_${row.b.uid}`), {
      ...matchDocFields(row.b.uid, row.score),
      conferenceId,
    });
  }
  if (top.length > 0) await batch.commit();

  const d = caller.data;
  logger.info(
    `runConferenceUserMatching: conference=${conferenceId} pool=${pool.length} wrote=${top.length}`
  );

  return {
    success: true,
    conferenceId,
    attendeeCount: attendeeSnap.size,
    eligibleAttendeeCount: pool.length,
    matchDocumentsWritten: top.length,
    callerHasSkills:
      asStringArray(d.confident_skills).length > 0 || asStringArray(d.desired_skills).length > 0,
    algorithmVersion: ALGORITHM_VERSION,
  };
});
