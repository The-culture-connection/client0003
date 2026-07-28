/**
 * Admin-only: per-attendee activity rollup for one conference.
 *
 * Backs the "Attendee activity" table in ConferencesPanel — one row per user
 * rather than an undifferentiated stream of events. Aggregation runs here
 * (in memory, over a bounded scan) instead of via a Firestore trigger, so there
 * is no rollup collection to keep in sync and the numbers are always live.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { callableCorsAllowlist } from "../callableCorsAllowlist";
import { ANALYTICS_COLLECTIONS } from "../analytics/mortarAnalyticsContract";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

/**
 * Hard ceiling on documents scanned per call. A conference that exceeds this
 * returns `truncated: true` so the UI can say so rather than quietly under-report.
 */
const MAX_SCAN = 20_000;
const PAGE = 1_000;

const schema = z.object({
  conference_id: z.string().min(1),
});

function normalizeRoles(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((r): r is string => typeof r === "string")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 0);
}

async function assertAnalyticsAdmin(uid: string): Promise<void> {
  const [userRecord, userDoc] = await Promise.all([
    auth.getUser(uid),
    db.collection("users").doc(uid).get(),
  ]);
  const claimRoles = normalizeRoles(userRecord.customClaims?.roles);
  const docRoles = normalizeRoles(userDoc.data()?.roles);
  const merged = new Set<string>([...claimRoles, ...docRoles]);
  if (!merged.has("admin") && !merged.has("superadmin")) {
    throw new HttpsError("permission-denied", "Admin or superAdmin only");
  }
}

type Row = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  total_events: number;
  event_counts: Record<string, number>;
  first_seen_ms: number | null;
  last_seen_ms: number | null;
  session_ids: Set<string>;
};

/**
 * Turns Firestore's FAILED_PRECONDITION (code 9) into a readable error.
 *
 * These queries need composite indexes on `expansion_analytics_events`. Right
 * after `firebase deploy --only firestore:indexes` the index exists but is still
 * building, and the raw gRPC error would otherwise surface in the browser as a
 * bare 500 with no explanation.
 */
function rethrowAsHttpsError(e: unknown): never {
  const code = (e as { code?: unknown })?.code;
  const details = (e as { details?: unknown })?.details;
  if (code === 9) {
    const msg = typeof details === "string" ? details : "A required Firestore index is missing.";
    throw new HttpsError(
      "failed-precondition",
      msg.includes("currently building")
        ? "The Firestore index for conference analytics is still building — retry in a few minutes."
        : `Missing Firestore index for conference analytics. ${msg}`
    );
  }
  throw new HttpsError(
    "internal",
    e instanceof Error ? e.message : "Failed to load conference activity."
  );
}

function displayNameFrom(data: FirebaseFirestore.DocumentData | undefined): string | null {
  if (!data) return null;
  const first = typeof data.first_name === "string" ? data.first_name.trim() : "";
  const last = typeof data.last_name === "string" ? data.last_name.trim() : "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  const display = data.display_name;
  return typeof display === "string" && display.trim() ? display.trim() : null;
}

export const getAdminConferenceUserActivity = onCall(
  { region: "us-central1", cors: callableCorsAllowlist },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }
    const parsed = schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", parsed.error.message);
    }

    const tokenRoles = normalizeRoles(request.auth?.token?.roles);
    if (!tokenRoles.includes("admin") && !tokenRoles.includes("superadmin")) {
      await assertAnalyticsAdmin(callerUid);
    }

    const conferenceId = parsed.data.conference_id;
    const byUser = new Map<string, Row>();

    let scanned = 0;
    let truncated = false;
    let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;

    // Ordered by ingested_at so paging is stable while new events arrive.
    while (scanned < MAX_SCAN) {
      let q = db
        .collection(ANALYTICS_COLLECTIONS.EXPANSION_ANALYTICS_EVENTS)
        .where("conference_id", "==", conferenceId)
        .orderBy("ingested_at", "asc")
        .limit(PAGE);
      if (cursor) q = q.startAfter(cursor);

      let snap: FirebaseFirestore.QuerySnapshot;
      try {
        snap = await q.get();
      } catch (e) {
        rethrowAsHttpsError(e);
      }
      if (snap.empty) break;

      for (const doc of snap.docs) {
        const d = doc.data();
        const uid = typeof d.user_id === "string" ? d.user_id : null;
        // Signed-out events carry no user, so they cannot be attributed.
        if (!uid) continue;

        const name = typeof d.event_name === "string" ? d.event_name : "unknown";
        const ts = d.ingested_at instanceof Timestamp ? d.ingested_at.toMillis() : null;

        let row = byUser.get(uid);
        if (!row) {
          row = {
            user_id: uid,
            email: null,
            display_name: null,
            total_events: 0,
            event_counts: {},
            first_seen_ms: null,
            last_seen_ms: null,
            session_ids: new Set<string>(),
          };
          byUser.set(uid, row);
        }
        row.total_events += 1;
        row.event_counts[name] = (row.event_counts[name] ?? 0) + 1;
        if (ts != null) {
          if (row.first_seen_ms == null || ts < row.first_seen_ms) row.first_seen_ms = ts;
          if (row.last_seen_ms == null || ts > row.last_seen_ms) row.last_seen_ms = ts;
        }
        if (typeof d.session_id === "string") row.session_ids.add(d.session_id);
      }

      scanned += snap.docs.length;
      cursor = snap.docs[snap.docs.length - 1];
      if (snap.docs.length < PAGE) break;
      if (scanned >= MAX_SCAN) truncated = true;
    }

    // Attach identity. Chunked into 10s because Firestore `in` queries cap there.
    const uids = [...byUser.keys()];
    for (let i = 0; i < uids.length; i += 10) {
      const chunk = uids.slice(i, i + 10);
      const snaps = await db.getAll(...chunk.map((u) => db.collection("users").doc(u)));
      for (const s of snaps) {
        const row = byUser.get(s.id);
        if (!row) continue;
        const data = s.data();
        const email = data?.email;
        row.email = typeof email === "string" && email.trim() ? email.trim() : null;
        row.display_name = displayNameFrom(data);
      }
    }

    const users = [...byUser.values()]
      .map((r) => ({
        user_id: r.user_id,
        email: r.email,
        display_name: r.display_name,
        total_events: r.total_events,
        event_counts: r.event_counts,
        distinct_event_types: Object.keys(r.event_counts).length,
        session_count: r.session_ids.size,
        first_seen_ms: r.first_seen_ms,
        last_seen_ms: r.last_seen_ms,
        first_seen_iso: r.first_seen_ms ? new Date(r.first_seen_ms).toISOString() : null,
        last_seen_iso: r.last_seen_ms ? new Date(r.last_seen_ms).toISOString() : null,
      }))
      .sort((a, b) => b.total_events - a.total_events);

    return {
      success: true,
      conference_id: conferenceId,
      users,
      scanned_events: scanned,
      truncated,
      max_scan: MAX_SCAN,
    };
  }
);
