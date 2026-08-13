/**
 * Conference Center: networking zone (Tinder-style discovery + mutual match).
 *
 *   conferences/{id}/networkingProfiles/{uid}                 — discoverable snapshot + toggle
 *   conferences/{id}/networkingProfiles/{uid}/swipes/{target} — one per person you swiped
 *   conferences/{id}/matches/{pairId}                         — created on a mutual like
 *
 * Attendees are auto-enrolled (discoverable on) the first time they open the
 * screen via `ensureNetworkingProfile`; the gear toggle flips `enabled`. A chat
 * only opens when BOTH swipe right: `recordConferenceSwipe` detects the reciprocal
 * like server-side (swipes are owner-read-only, so neither client can see it) and
 * seeds a DM with an icebreaker. All writes go through these callables; the
 * Admin SDK bypasses rules, so the collections are `write: if false` for clients.
 *
 * Patterns copied from `conferenceTickets.ts` (callable options, attendee
 * precondition, transactions) and `dm_repository.dart` (thread id + DM shape).
 */
import { getApps, initializeApp } from "firebase-admin/app";
import {
  DocumentData,
  DocumentReference,
  FieldValue,
  getFirestore,
} from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { callableCorsAllowlist } from "./callableCorsAllowlist";

if (getApps().length === 0) {
  initializeApp();
}
const db = getFirestore();

const defaultCallableOptions = {
  invoker: "public" as const,
  cors: callableCorsAllowlist,
};

const CONFERENCES = "conferences";
const ATTENDEES = "attendees";
const USERS = "users";
const NETWORKING_PROFILES = "networkingProfiles";
const SWIPES = "swipes";
const MATCHES = "matches";
const DM_THREADS = "dm_threads";
const MESSAGES = "messages";

function conferenceRef(conferenceId: string): DocumentReference {
  return db.collection(CONFERENCES).doc(conferenceId);
}

async function assertConferenceExists(conferenceId: string): Promise<DocumentData> {
  const snap = await conferenceRef(conferenceId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Conference not found.");
  }
  return snap.data()!;
}

/** Deterministic 1:1 pair id (lexicographic `a_b`) — mirrors `dmThreadIdForUsers`. */
function pairId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function sortedPair(a: string, b: string): string[] {
  return a < b ? [a, b] : [b, a];
}

function strField(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

/** Build the discoverable snapshot from a `users/{uid}` doc (curriculum shape). */
function buildSnapshot(uid: string, u: DocumentData | undefined): Record<string, unknown> {
  const first = strField(u?.first_name) || strField(u?.firstName);
  const last = strField(u?.last_name) || strField(u?.lastName);
  const composed = `${first} ${last}`.trim();
  const displayName =
    composed || strField(u?.display_name) || strField(u?.displayName) || strField(u?.name) || "Member";

  const city = strField(u?.city);
  const state = strField(u?.state);
  const location = city && state ? `${city}, ${state}` : city || state;

  return {
    uid,
    displayName,
    profession: strField(u?.profession),
    industry: strField(u?.tribe) || strField(u?.industry),
    location,
    photoUrl: strField(u?.photo_url) || strField(u?.photoUrl),
    offers: strList(u?.confident_skills),
    seeks: strList(u?.desired_skills),
    goals: strList(u?.business_goals),
    bio: strField(u?.bio),
  };
}

/** Throws `failed-precondition` unless the caller holds a ticket for the conference. */
async function assertAttendee(conferenceId: string, uid: string): Promise<void> {
  const attSnap = await conferenceRef(conferenceId).collection(ATTENDEES).doc(uid).get();
  if (!attSnap.exists) {
    throw new HttpsError("failed-precondition", "You need a ticket to network at this conference.");
  }
}

/** Throws `failed-precondition` unless the caller holds a ticket for the conference. */
async function assertAttendeeTx(
  tx: FirebaseFirestore.Transaction,
  conferenceId: string,
  uid: string,
): Promise<void> {
  const attSnap = await tx.get(conferenceRef(conferenceId).collection(ATTENDEES).doc(uid));
  if (!attSnap.exists) {
    throw new HttpsError("failed-precondition", "You need a ticket to network at this conference.");
  }
}

/**
 * Auto-enroll entry point (called on every screen open). Creates the networking
 * profile from `users/{uid}` with `enabled: true` the first time; afterward only
 * refreshes the snapshot fields and NEVER overrides `enabled` (so a prior opt-out
 * survives).
 */
export const ensureNetworkingProfile = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  await assertConferenceExists(conferenceId);

  const profileRef = conferenceRef(conferenceId).collection(NETWORKING_PROFILES).doc(uid);

  const result = await db.runTransaction(async (tx) => {
    await assertAttendeeTx(tx, conferenceId, uid);
    const [profileSnap, userSnap] = await Promise.all([
      tx.get(profileRef),
      tx.get(db.collection(USERS).doc(uid)),
    ]);
    const snapshot = buildSnapshot(uid, userSnap.data());

    if (!profileSnap.exists) {
      tx.set(profileRef, {
        ...snapshot,
        enabled: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { enabled: true, profile: { ...snapshot, enabled: true } };
    }
    // Refresh the snapshot; leave `enabled` untouched.
    tx.set(profileRef, { ...snapshot, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const enabled = profileSnap.data()?.enabled !== false;
    return { enabled, profile: { ...snapshot, enabled } };
  });

  return { ok: true, ...result };
});

/** Flip discoverability (the gear toggle). */
export const setNetworkingEnabled = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  if (typeof request.data?.enabled !== "boolean") {
    throw new HttpsError("invalid-argument", "enabled (boolean) is required.");
  }
  const enabled = request.data.enabled as boolean;
  await assertConferenceExists(conferenceId);

  const profileRef = conferenceRef(conferenceId).collection(NETWORKING_PROFILES).doc(uid);
  await db.runTransaction(async (tx) => {
    await assertAttendeeTx(tx, conferenceId, uid);
    tx.set(profileRef, { enabled, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { ok: true, enabled };
});

/**
 * Record a swipe. On a mutual `like`, create the match and seed a DM with an
 * icebreaker (only if no thread exists yet — never clobber a real conversation).
 */
export const recordConferenceSwipe = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const targetUid = (request.data?.targetUid as string | undefined)?.trim();
  const direction = (request.data?.direction as string | undefined)?.trim();
  const reason = strField(request.data?.reason) || null;
  const rawIce = strField(request.data?.icebreaker);
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");
  if (targetUid === uid) throw new HttpsError("invalid-argument", "You can't swipe on yourself.");
  if (direction !== "like" && direction !== "pass") {
    throw new HttpsError("invalid-argument", "direction must be 'like' or 'pass'.");
  }
  await assertConferenceExists(conferenceId);

  const cRef = conferenceRef(conferenceId);
  const mySwipeRef = cRef.collection(NETWORKING_PROFILES).doc(uid).collection(SWIPES).doc(targetUid);
  const targetProfileRef = cRef.collection(NETWORKING_PROFILES).doc(targetUid);
  const theirSwipeRef = targetProfileRef.collection(SWIPES).doc(uid);
  const threadId = pairId(uid, targetUid);
  const matchRef = cRef.collection(MATCHES).doc(threadId);
  const threadRef = db.collection(DM_THREADS).doc(threadId);

  const swipeData = {
    direction,
    at: FieldValue.serverTimestamp(),
    ...(reason ? { reason } : {}),
  };

  const lcFirst = (s: string): string => (s ? `${s.charAt(0).toLowerCase()}${s.slice(1)}` : s);

  const outcome = await db.runTransaction(async (tx) => {
    await assertAttendeeTx(tx, conferenceId, uid);

    if (direction !== "like") {
      tx.set(mySwipeRef, swipeData, { merge: true });
      return { matched: false as const };
    }

    // --- reads (all before writes) ---
    const [targetSnap, theirSwipeSnap] = await Promise.all([tx.get(targetProfileRef), tx.get(theirSwipeRef)]);
    // Demo bots (seeded, `isDemoBot: true`) always like back — so a single tester
    // can experience the full match → chat flow without a second person.
    const isDemoBot = targetSnap.data()?.isDemoBot === true;
    const theyLiked = theirSwipeSnap.exists && theirSwipeSnap.data()?.direction === "like";
    const willMatch = isDemoBot || theyLiked;
    if (!willMatch) {
      tx.set(mySwipeRef, swipeData, { merge: true });
      return { matched: false as const };
    }
    const [matchSnap, threadSnap] = await Promise.all([tx.get(matchRef), tx.get(threadRef)]);

    const matchReason = reason || strField(theirSwipeSnap.data()?.reason) || null;

    // For a demo bot the icebreaker arrives FROM the bot so the chat feels alive;
    // otherwise it's the swiper's own opener.
    const senderId = isDemoBot ? targetUid : uid;
    const icebreaker = isDemoBot
      ? (matchReason
          ? `Hey! So glad we matched — ${lcFirst(matchReason)}. What are you working on?`
          : "Hey! Great to match — what brings you to the conference?")
      : (rawIce.slice(0, 500) ||
          (matchReason
            ? `Hi! We just matched — ${lcFirst(matchReason)}. Would love to connect.`
            : "Hi! We just matched at the conference — what are you hoping to get out of it?"));

    // --- writes ---
    tx.set(mySwipeRef, swipeData, { merge: true });
    if (isDemoBot && !theirSwipeSnap.exists) {
      // Record the bot's reciprocal like so match/undo state stays consistent.
      tx.set(theirSwipeRef, {
        direction: "like",
        at: FieldValue.serverTimestamp(),
        ...(matchReason ? { reason: matchReason } : {}),
      });
    }
    if (!matchSnap.exists) {
      tx.set(matchRef, {
        users: sortedPair(uid, targetUid),
        reason: matchReason,
        dmThreadId: threadId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    if (!threadSnap.exists) {
      const preview = icebreaker.length > 120 ? `${icebreaker.slice(0, 120)}…` : icebreaker;
      tx.set(threadRef, {
        participant_ids: sortedPair(uid, targetUid),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        last_preview: preview,
        last_sender_id: senderId,
      });
      tx.set(threadRef.collection(MESSAGES).doc(), {
        sender_id: senderId,
        text: icebreaker,
        created_at: FieldValue.serverTimestamp(),
      });
    }
    return { matched: true as const, threadId, reason: matchReason };
  });

  return { ok: true, targetUid, ...outcome };
});

/**
 * People who liked the caller but whom the caller has not swiped on yet — the
 * "waiting on you" list behind the My Connections screen.
 *
 * Swipes live under the *swiper's* profile and are owner-read-only, so a client
 * has no way to learn about an inbound like on its own; this callable is the
 * only door. Revealing the like does not reveal a conversation — the caller
 * still has to like back before `recordConferenceSwipe` opens the DM, so the
 * "a chat only opens when you both connect" rule is untouched.
 *
 * Reads the caller's swipe doc under every discoverable profile in one batched
 * `getAll` rather than a collection-group query: the swipe docs written so far
 * carry no `targetUid` field to index on, and a conference-sized fan-out does
 * not need one.
 */
const INBOUND_LIKE_SCAN_LIMIT = 1000;
const GET_ALL_CHUNK = 250;

export const listConferenceInboundLikes = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  await assertConferenceExists(conferenceId);
  await assertAttendee(conferenceId, uid);

  const profilesCol = conferenceRef(conferenceId).collection(NETWORKING_PROFILES);

  // Only people who are still discoverable: someone who liked you and then
  // switched networking off has withdrawn from the zone, and surfacing them
  // would hand out a contact they just took back.
  const [profilesSnap, mySwipesSnap] = await Promise.all([
    profilesCol.where("enabled", "==", true).limit(INBOUND_LIKE_SCAN_LIMIT).get(),
    profilesCol.doc(uid).collection(SWIPES).get(),
  ]);

  const alreadySwiped = new Set(mySwipesSnap.docs.map((d) => d.id));
  const others = profilesSnap.docs.filter((d) => d.id !== uid && !alreadySwiped.has(d.id));
  if (others.length === 0) return { ok: true, likes: [] };

  const byUid = new Map(others.map((d) => [d.id, d]));
  const refs = others.map((d) => d.ref.collection(SWIPES).doc(uid));

  const swipeDocs: FirebaseFirestore.DocumentSnapshot[] = [];
  for (let i = 0; i < refs.length; i += GET_ALL_CHUNK) {
    swipeDocs.push(...(await db.getAll(...refs.slice(i, i + GET_ALL_CHUNK))));
  }

  const likes = swipeDocs
    .filter((s) => s.exists && s.data()?.direction === "like")
    .map((s) => {
      // `.../networkingProfiles/{fromUid}/swipes/{uid}` — the liker is the
      // grandparent doc id.
      const fromUid = s.ref.parent.parent!.id;
      const profile = byUid.get(fromUid);
      const at = s.data()?.at;
      return {
        uid: fromUid,
        reason: strField(s.data()?.reason) || null,
        at: at?.toMillis?.() ?? null,
        profile: { ...(profile?.data() ?? {}), uid: fromUid },
      };
    })
    // Newest interest first; undated (pre-timestamp) rows sink to the bottom.
    .sort((a, b) => (b.at ?? 0) - (a.at ?? 0));

  return { ok: true, likes };
});

/** Undo the last swipe on a target — only if it hasn't already produced a match. */
export const undoConferenceSwipe = onCall(defaultCallableOptions, async (request) => {
  if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const uid = request.auth.uid;
  const conferenceId = (request.data?.conferenceId as string | undefined)?.trim();
  const targetUid = (request.data?.targetUid as string | undefined)?.trim();
  if (!conferenceId) throw new HttpsError("invalid-argument", "conferenceId is required.");
  if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required.");
  await assertConferenceExists(conferenceId);

  const cRef = conferenceRef(conferenceId);
  const mySwipeRef = cRef.collection(NETWORKING_PROFILES).doc(uid).collection(SWIPES).doc(targetUid);
  const matchRef = cRef.collection(MATCHES).doc(pairId(uid, targetUid));

  await db.runTransaction(async (tx) => {
    await assertAttendeeTx(tx, conferenceId, uid);
    const matchSnap = await tx.get(matchRef);
    if (matchSnap.exists) {
      throw new HttpsError("failed-precondition", "You already matched — that can't be undone.");
    }
    tx.delete(mySwipeRef);
  });
  return { ok: true };
});
