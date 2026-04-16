/**
 * Curriculum discussion threads — Firestore-backed (`discussion_threads` + `replies` subcollection).
 */
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  updateDoc,
  increment,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import type { DiscussionCategory } from "./discussionTypes";
export { DISCUSSION_CATEGORIES, type DiscussionCategory } from "./discussionTypes";
import type { Discussion, DiscussionReply } from "./discussionTypes";

export type { Discussion, DiscussionReply } from "./discussionTypes";

const COL = "discussion_threads";
const REPLIES = "replies";
const THREAD_LIKES = "thread_likes";
const REPLY_LIKES = "reply_likes";

const MIGRATION_LS_KEY = "mortar_discussions_migrated_to_firestore_v1";

function tsToDate(t: Timestamp | { toDate?: () => Date } | Date | undefined): Date {
  if (!t) return new Date();
  if (t instanceof Date) return t;
  if (typeof (t as Timestamp).toDate === "function") return (t as Timestamp).toDate();
  return new Date();
}

function replyFromDoc(
  d: { id: string; data: () => Record<string, unknown> },
  discussionId: string
): DiscussionReply {
  const x = d.data();
  const r: DiscussionReply = {
    id: d.id,
    discussionId,
    content: String(x.content ?? ""),
    author: String(x.author_uid ?? ""),
    authorName: x.author_label ? String(x.author_label) : undefined,
    isAnonymous: Boolean(x.is_anonymous),
    createdAt: tsToDate(x.created_at as Timestamp),
    updatedAt: tsToDate(x.updated_at as Timestamp),
    likes: Number(x.likes_count ?? 0),
    likedBy: [],
    replies: [],
  };
  if (x.parent_reply_id) r.parent_reply_id = String(x.parent_reply_id);
  return r;
}

/** Nest flat replies (parent_reply_id → tree under `replies`). */
function nestReplies(flat: DiscussionReply[]): DiscussionReply[] {
  const byParent = new Map<string | null, DiscussionReply[]>();
  for (const r of flat) {
    const p = (r as DiscussionReply & { parent_reply_id?: string }).parent_reply_id ?? null;
    const arr = byParent.get(p) ?? [];
    arr.push({ ...r, replies: [] });
    byParent.set(p, arr);
  }
  const attach = (parentId: string | null): DiscussionReply[] => {
    const children = byParent.get(parentId) ?? [];
    for (const c of children) {
      c.replies = attach(c.id);
    }
    return children;
  };
  return attach(null);
}

async function threadDocToDiscussion(threadId: string): Promise<Discussion> {
  const ref = doc(db, COL, threadId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Discussion not found");
  const t = snap.data()!;
  const repliesSnap = await getDocs(
    query(collection(db, COL, threadId, REPLIES), orderBy("created_at", "asc"))
  );
  const flat: DiscussionReply[] = repliesSnap.docs.map((d) => replyFromDoc(d, threadId));
  const tree = nestReplies(flat);

  const likes = Number(t.likes_count ?? 0);
  const likedBy: string[] = [];

  return {
    id: threadId,
    title: String(t.title ?? ""),
    category: t.category as Discussion["category"],
    content: String(t.content ?? ""),
    author: String(t.author_uid ?? ""),
    authorName: t.author_label ? String(t.author_label) : undefined,
    isAnonymous: Boolean(t.is_anonymous),
    createdAt: tsToDate(t.created_at as Timestamp),
    updatedAt: tsToDate(t.updated_at as Timestamp),
    likes,
    likedBy,
    replies: tree,
    views: Number(t.view_count ?? 0),
    isPinned: Boolean(t.is_pinned),
    isHot: Boolean(t.is_hot),
  };
}

/** One-time migration from legacy `localStorage.discussions` JSON. */
export async function migrateLocalDiscussionsFromStorageOnce(): Promise<void> {
  if (typeof localStorage === "undefined") return;
  if (localStorage.getItem(MIGRATION_LS_KEY)) return;
  const raw = localStorage.getItem("discussions");
  if (!raw) {
    localStorage.setItem(MIGRATION_LS_KEY, "1");
    return;
  }
  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) {
      localStorage.setItem(MIGRATION_LS_KEY, "1");
      localStorage.removeItem("discussions");
      return;
    }
    for (const item of parsed) {
      const d = item as Record<string, unknown>;
      if (!d?.title || !d?.category || !d?.content) continue;
      const threadRef = await addDoc(collection(db, COL), {
        title: String(d.title),
        category: d.category,
        content: String(d.content),
        author_uid: String(d.author ?? "unknown"),
        author_label: d.authorName ? String(d.authorName) : null,
        is_anonymous: Boolean(d.isAnonymous),
        is_pinned: Boolean(d.isPinned),
        is_hot: Boolean(d.isHot),
        view_count: Number(d.views ?? 0),
        likes_count: Number(d.likes ?? 0),
        created_at: d.createdAt ? Timestamp.fromDate(new Date(d.createdAt as string)) : serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      const migrateReplies = async (parentId: string | null, replies: unknown[]) => {
        if (!Array.isArray(replies)) return;
        for (const r of replies) {
          const rr = r as Record<string, unknown>;
          if (!rr?.content) continue;
          const docRef = await addDoc(collection(db, COL, threadRef.id, REPLIES), {
            content: String(rr.content),
            author_uid: String(rr.author ?? "unknown"),
            author_label: rr.authorName ? String(rr.authorName) : null,
            is_anonymous: Boolean(rr.isAnonymous),
            parent_reply_id: parentId,
            likes_count: Number(rr.likes ?? 0),
            created_at: rr.createdAt ? Timestamp.fromDate(new Date(rr.createdAt as string)) : serverTimestamp(),
            updated_at: serverTimestamp(),
          });
          if (Array.isArray(rr.replies) && rr.replies.length > 0) {
            await migrateReplies(docRef.id, rr.replies as unknown[]);
          }
        }
      };
      await migrateReplies(null, (d.replies as unknown[]) ?? []);
    }
  } catch (e) {
    console.error("migrateLocalDiscussionsFromStorageOnce:", e);
  } finally {
    localStorage.setItem(MIGRATION_LS_KEY, "1");
    localStorage.removeItem("discussions");
  }
}

export async function getDiscussions(): Promise<Discussion[]> {
  await migrateLocalDiscussionsFromStorageOnce();
  const q = query(collection(db, COL), orderBy("updated_at", "desc"));
  const snap = await getDocs(q);
  const out: Discussion[] = [];
  for (const d of snap.docs) {
    try {
      out.push(await threadDocToDiscussion(d.id));
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function getDiscussion(id: string): Promise<Discussion | null> {
  await migrateLocalDiscussionsFromStorageOnce();
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return threadDocToDiscussion(id);
}

export function getReplyCount(discussion: Discussion): number {
  const countReplies = (replies: DiscussionReply[]): number =>
    replies.reduce((count, reply) => count + 1 + (reply.replies ? countReplies(reply.replies) : 0), 0);
  return countReplies(discussion.replies || []);
}

export async function createDiscussion(
  title: string,
  category: DiscussionCategory,
  content: string,
  authorUid: string,
  options?: { isAnonymous?: boolean; authorName?: string }
): Promise<Discussion> {
  const isAnonymous = options?.isAnonymous ?? true;
  const authorName = options?.authorName?.trim();
  const author_label = isAnonymous ? "Anonymous" : authorName || "User";

  const ref = await addDoc(collection(db, COL), {
    title: title.trim(),
    category,
    content: content.trim(),
    author_uid: authorUid,
    author_label,
    is_anonymous: isAnonymous,
    is_pinned: false,
    is_hot: false,
    view_count: 0,
    likes_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  return threadDocToDiscussion(ref.id);
}

export async function addReply(
  discussionId: string,
  content: string,
  authorUid: string,
  parentReplyId: string | undefined,
  options?: { isAnonymous?: boolean; authorName?: string }
): Promise<DiscussionReply> {
  const isAnonymous = options?.isAnonymous ?? true;
  const authorName = options?.authorName?.trim();
  const author_label = isAnonymous ? "Anonymous" : authorName || "User";

  const replyRef = await addDoc(collection(db, COL, discussionId, REPLIES), {
    content: content.trim(),
    author_uid: authorUid,
    author_label,
    is_anonymous: isAnonymous,
    parent_reply_id: parentReplyId ?? null,
    likes_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await updateDoc(doc(db, COL, discussionId), {
    updated_at: serverTimestamp(),
  });

  const snap = await getDoc(replyRef);
  return replyFromDoc({ id: snap.id, data: () => snap.data()! }, discussionId);
}

export async function toggleLike(
  discussionId: string,
  uid: string,
  replyId?: string
): Promise<{ liked: boolean; likes: number }> {
  if (replyId) {
    const likeRef = doc(db, COL, discussionId, REPLIES, replyId, REPLY_LIKES, uid);
    const existing = await getDoc(likeRef);
    if (existing.exists()) {
      await deleteDoc(likeRef);
      await updateDoc(doc(db, COL, discussionId, REPLIES, replyId), {
        likes_count: increment(-1),
        updated_at: serverTimestamp(),
      });
    } else {
      await setDoc(likeRef, { created_at: serverTimestamp() });
      await updateDoc(doc(db, COL, discussionId, REPLIES, replyId), {
        likes_count: increment(1),
        updated_at: serverTimestamp(),
      });
    }
    const r = await getDoc(doc(db, COL, discussionId, REPLIES, replyId));
    const likes = Number(r.data()?.likes_count ?? 0);
    const liked = (await getDoc(likeRef)).exists();
    return { liked, likes };
  }

  const likeRef = doc(db, COL, discussionId, THREAD_LIKES, uid);
  const existing = await getDoc(likeRef);
  if (existing.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, COL, discussionId), {
      likes_count: increment(-1),
      updated_at: serverTimestamp(),
    });
  } else {
    await setDoc(likeRef, { created_at: serverTimestamp() });
    await updateDoc(doc(db, COL, discussionId), {
      likes_count: increment(1),
      updated_at: serverTimestamp(),
    });
  }
  const t = await getDoc(doc(db, COL, discussionId));
  const likes = Number(t.data()?.likes_count ?? 0);
  const liked = (await getDoc(likeRef)).exists();
  return { liked, likes };
}

export async function incrementViews(discussionId: string): Promise<void> {
  await updateDoc(doc(db, COL, discussionId), {
    view_count: increment(1),
    updated_at: serverTimestamp(),
  });
}

/** All reply document ids (nested) for like-state queries. */
export function collectReplyIds(replies: DiscussionReply[]): string[] {
  const ids: string[] = [];
  const walk = (list: DiscussionReply[]) => {
    for (const r of list) {
      ids.push(r.id);
      if (r.replies?.length) walk(r.replies);
    }
  };
  walk(replies);
  return ids;
}

export async function getUserLikeFlagsForDiscussion(
  discussionId: string,
  uid: string,
  replyIds: string[]
): Promise<{ threadLiked: boolean; replyLiked: Record<string, boolean> }> {
  const threadSnap = await getDoc(doc(db, COL, discussionId, THREAD_LIKES, uid));
  const replyLiked: Record<string, boolean> = {};
  await Promise.all(
    replyIds.map(async (rid) => {
      const s = await getDoc(doc(db, COL, discussionId, REPLIES, rid, REPLY_LIKES, uid));
      replyLiked[rid] = s.exists();
    })
  );
  return { threadLiked: threadSnap.exists(), replyLiked };
}
