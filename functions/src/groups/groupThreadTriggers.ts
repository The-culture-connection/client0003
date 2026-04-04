/**
 * Denormalized scores, reply counts, group activity snippets, gamification counters, badges.
 * Runs for curriculum `Groups` and mobile-only `groups_mobile`.
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import {
  onDocumentCreated,
  onDocumentWritten,
  type FirestoreEvent,
  type Change,
  type DocumentSnapshot as FnDocumentSnapshot,
} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

export const GROUPS_COLLECTION = "Groups";
export const GROUPS_MOBILE_COLLECTION = "groups_mobile";

function voteDelta(
  before: DocumentSnapshot | undefined,
  after: DocumentSnapshot | undefined
): number {
  const prev = before?.exists ? (before.data()?.value as number | undefined) : undefined;
  const next = after?.exists ? (after.data()?.value as number | undefined) : undefined;
  const p = typeof prev === "number" ? prev : 0;
  const n = typeof next === "number" ? next : 0;
  if (!after?.exists) {
    return -p;
  }
  return n - p;
}

function snippetFrom(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

async function incrementUserCounter(
  uid: string,
  field: "posts_created" | "comments_created"
): Promise<void> {
  const ref = db.collection("users").doc(uid);
  await ref.set(
    {
      [`gamification.counters.${field}`]: FieldValue.increment(1),
      "gamification.version": 1,
    },
    {merge: true}
  );
}

async function maybeAwardBadges(uid: string): Promise<void> {
  const userSnap = await db.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return;
  }
  const u = userSnap.data()!;
  const earned = new Set<string>(
    Array.isArray(u.badges?.earned) ? (u.badges.earned as string[]) : []
  );
  const counters = (u.gamification?.counters as Record<string, number>) || {};
  const posts = counters.posts_created ?? 0;
  const comments = counters.comments_created ?? 0;

  const defs = await db.collection("badge_definitions").get();
  for (const doc of defs.docs) {
    const id = doc.id;
    if (earned.has(id)) {
      continue;
    }
    const criteria = doc.data()?.criteria as
      | {min_posts_created?: number; min_comments_created?: number}
      | undefined;
    if (!criteria) {
      continue;
    }
    let ok = true;
    if (criteria.min_posts_created != null && posts < criteria.min_posts_created) {
      ok = false;
    }
    if (criteria.min_comments_created != null && comments < criteria.min_comments_created) {
      ok = false;
    }
    if (!ok) {
      continue;
    }
    await db
      .collection("users")
      .doc(uid)
      .update({"badges.earned": FieldValue.arrayUnion(id)});
    earned.add(id);
  }
}

async function onThreadVoteWriteImpl(
  collection: string,
  event: FirestoreEvent<Change<FnDocumentSnapshot> | undefined>
): Promise<void> {
  const delta = voteDelta(event.data?.before, event.data?.after);
  if (delta === 0) {
    return;
  }
  const {groupId, threadId} = event.params;
  const threadRef = db.collection(collection).doc(groupId).collection("threads").doc(threadId);
  try {
    await threadRef.update({score: FieldValue.increment(delta)});
  } catch (e) {
    logger.error("onThreadVoteWrite", {collection, groupId, threadId, delta, e});
  }
}

async function onCommentVoteWriteImpl(
  collection: string,
  event: FirestoreEvent<Change<FnDocumentSnapshot> | undefined>
): Promise<void> {
  const delta = voteDelta(event.data?.before, event.data?.after);
  if (delta === 0) {
    return;
  }
  const {groupId, threadId, commentId} = event.params;
  const commentRef = db
    .collection(collection)
    .doc(groupId)
    .collection("threads")
    .doc(threadId)
    .collection("comments")
    .doc(commentId);
  try {
    await commentRef.update({score: FieldValue.increment(delta)});
    const threadRef = db.collection(collection).doc(groupId).collection("threads").doc(threadId);
    await threadRef.update({helpful_score: FieldValue.increment(delta)});
  } catch (e) {
    logger.error("onCommentVoteWrite", {collection, groupId, threadId, commentId, delta, e});
  }
}

async function onThreadCreatedImpl(
  collection: string,
  event: FirestoreEvent<FnDocumentSnapshot | undefined>
): Promise<void> {
  const {groupId, threadId} = event.params;
  const data = event.data?.data();
  if (!data) {
    return;
  }
  const authorId = data.author_id as string | undefined;
  const body = (data.body as string) || "";
  const authorName = (data.author_name as string) || "Someone";

  const threadRef = db.collection(collection).doc(groupId).collection("threads").doc(threadId);
  const groupRef = db.collection(collection).doc(groupId);

  try {
    await threadRef.set(
      {
        score: 0,
        helpful_score: 0,
        reply_count: 0,
      },
      {merge: true}
    );
  } catch (e) {
    logger.warn("onThreadCreated merge defaults", e);
  }

  const snippet = `${authorName} posted: ${snippetFrom(body)}`;
  try {
    await groupRef.set(
      {
        threadCount: FieldValue.increment(1),
        lastActivitySnippet: snippet,
        lastActivityAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
  } catch (e) {
    logger.error("onThreadCreated group update", e);
  }

  if (authorId) {
    try {
      await incrementUserCounter(authorId, "posts_created");
      await maybeAwardBadges(authorId);
    } catch (e) {
      logger.error("onThreadCreated user counters", e);
    }
  }
}

async function onCommentCreatedImpl(
  collection: string,
  event: FirestoreEvent<FnDocumentSnapshot | undefined>
): Promise<void> {
  const {groupId, threadId} = event.params;
  const data = event.data?.data();
  if (!data) {
    return;
  }
  const authorId = data.author_id as string | undefined;
  const body = (data.body as string) || "";
  const authorName = (data.author_name as string) || "Someone";

  const threadRef = db.collection(collection).doc(groupId).collection("threads").doc(threadId);
  const groupRef = db.collection(collection).doc(groupId);

  const snippet = `${authorName} commented: ${snippetFrom(body)}`;

  try {
    await threadRef.set(
      {
        reply_count: FieldValue.increment(1),
        last_comment_at: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    await groupRef.set(
      {
        lastActivitySnippet: snippet,
        lastActivityAt: FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
  } catch (e) {
    logger.error("onCommentCreated", e);
  }

  if (authorId) {
    try {
      await incrementUserCounter(authorId, "comments_created");
      await maybeAwardBadges(authorId);
    } catch (e) {
      logger.error("onCommentCreated user counters", e);
    }
  }

  const snap = event.data;
  if (snap) {
    try {
      await snap.ref.set({score: 0}, {merge: true});
    } catch (e) {
      logger.warn("onCommentCreated comment score init", e);
    }
  }
}

async function onGroupDocMemberChangeImpl(
  collection: string,
  event: FirestoreEvent<Change<FnDocumentSnapshot> | undefined>
): Promise<void> {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!after) {
    return;
  }
  const mAfter = Array.isArray(after.GroupMembers) ? (after.GroupMembers as string[]).length : 0;
  const mBefore = Array.isArray(before?.GroupMembers) ? (before.GroupMembers as string[]).length : 0;
  if (mAfter === mBefore) {
    return;
  }
  const {groupId} = event.params;
  try {
    await db.collection(collection).doc(groupId).update({memberCount: mAfter});
  } catch (e) {
    logger.warn("onGroupMemberListChange memberCount", e);
  }
}

// --- Curriculum `Groups` ---
export const onGroupThreadVoteWrite = onDocumentWritten(
  {region: "us-central1", document: "Groups/{groupId}/threads/{threadId}/votes/{voterId}"},
  (e) => onThreadVoteWriteImpl(GROUPS_COLLECTION, e)
);

export const onGroupCommentVoteWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "Groups/{groupId}/threads/{threadId}/comments/{commentId}/votes/{voterId}",
  },
  (e) => onCommentVoteWriteImpl(GROUPS_COLLECTION, e)
);

export const onGroupThreadCreated = onDocumentCreated(
  {region: "us-central1", document: "Groups/{groupId}/threads/{threadId}"},
  (e) => onThreadCreatedImpl(GROUPS_COLLECTION, e)
);

export const onGroupCommentCreated = onDocumentCreated(
  {region: "us-central1", document: "Groups/{groupId}/threads/{threadId}/comments/{commentId}"},
  (e) => onCommentCreatedImpl(GROUPS_COLLECTION, e)
);

export const onGroupMemberListChange = onDocumentWritten(
  {region: "us-central1", document: "Groups/{groupId}"},
  (e) => onGroupDocMemberChangeImpl(GROUPS_COLLECTION, e)
);

// --- Mobile `groups_mobile` ---
export const onMobileGroupThreadVoteWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "groups_mobile/{groupId}/threads/{threadId}/votes/{voterId}",
  },
  (e) => onThreadVoteWriteImpl(GROUPS_MOBILE_COLLECTION, e)
);

export const onMobileGroupCommentVoteWrite = onDocumentWritten(
  {
    region: "us-central1",
    document: "groups_mobile/{groupId}/threads/{threadId}/comments/{commentId}/votes/{voterId}",
  },
  (e) => onCommentVoteWriteImpl(GROUPS_MOBILE_COLLECTION, e)
);

export const onMobileGroupThreadCreated = onDocumentCreated(
  {region: "us-central1", document: "groups_mobile/{groupId}/threads/{threadId}"},
  (e) => onThreadCreatedImpl(GROUPS_MOBILE_COLLECTION, e)
);

export const onMobileGroupCommentCreated = onDocumentCreated(
  {
    region: "us-central1",
    document: "groups_mobile/{groupId}/threads/{threadId}/comments/{commentId}",
  },
  (e) => onCommentCreatedImpl(GROUPS_MOBILE_COLLECTION, e)
);

export const onMobileGroupMemberListChange = onDocumentWritten(
  {region: "us-central1", document: "groups_mobile/{groupId}"},
  (e) => onGroupDocMemberChangeImpl(GROUPS_MOBILE_COLLECTION, e)
);
