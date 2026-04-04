/**
 * joinGroup / leaveGroup — only server-side updates to GroupMembers / PendingMembers.
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();
const auth = getAuth();

const MOBILE_GROUPS = "groups_mobile";

async function isStaffUid(uid: string): Promise<boolean> {
  try {
    const u = await auth.getUser(uid);
    const roles = (u.customClaims?.roles as string[]) || [];
    return roles.includes("Admin") || roles.includes("superAdmin");
  } catch {
    return false;
  }
}

async function deleteVotesUnder(parent: FirebaseFirestore.DocumentReference): Promise<void> {
  const snap = await parent.collection("votes").get();
  for (const d of snap.docs) {
    await d.ref.delete();
  }
}

async function deleteMobileGroupDeep(groupId: string): Promise<void> {
  const groupRef = db.collection(MOBILE_GROUPS).doc(groupId);
  const threads = await groupRef.collection("threads").get();
  for (const t of threads.docs) {
    const comments = await t.ref.collection("comments").get();
    for (const c of comments.docs) {
      await deleteVotesUnder(c.ref);
      await c.ref.delete();
    }
    await deleteVotesUnder(t.ref);
    await t.ref.delete();
  }
  await groupRef.delete();
}

const callableCors = [
  /^https:\/\/[\w-]+\.up\.railway\.app$/,
  "https://mortar-web-staging.up.railway.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "https://mortar-dev.firebaseapp.com",
  "https://mortar-dev.web.app",
  "https://mortar-stage.firebaseapp.com",
  "https://mortar-stage.web.app",
] as (string | RegExp)[];

const joinLeaveSchema = z.object({
  groupId: z.string().min(1),
  /** Expansion app uses `mobile` → `groups_mobile`; web curriculum omits → `Groups`. */
  scope: z.enum(["curriculum", "mobile"]).optional(),
});

function groupsCollection(scope: string | undefined): string {
  return scope === "mobile" ? "groups_mobile" : "Groups";
}

export const joinGroup = onCall(
  {region: "us-central1", invoker: "public", cors: callableCors},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const parsed = joinLeaveSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "groupId required");
    }
    const {groupId, scope} = parsed.data;
    const ref = db.collection(groupsCollection(scope)).doc(groupId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Group not found");
      }
      const data = snap.data()!;
      const members = Array.isArray(data.GroupMembers) ? (data.GroupMembers as string[]) : [];
      const pending = Array.isArray(data.PendingMembers) ? (data.PendingMembers as string[]) : [];
      if (members.includes(uid)) {
        return;
      }
      if (pending.includes(uid)) {
        return;
      }
      const status = (data.Status as string) || "Open";
      if (status === "Open") {
        tx.update(ref, {GroupMembers: FieldValue.arrayUnion(uid)});
      } else {
        tx.update(ref, {PendingMembers: FieldValue.arrayUnion(uid)});
      }
    });

    const after = await ref.get();
    const d = after.data()!;
    const members = Array.isArray(d.GroupMembers) ? (d.GroupMembers as string[]) : [];
    const pending = Array.isArray(d.PendingMembers) ? (d.PendingMembers as string[]) : [];
    return {
      success: true,
      pending: !members.includes(uid) && pending.includes(uid),
    };
  }
);

export const leaveGroup = onCall(
  {region: "us-central1", invoker: "public", cors: callableCors},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const parsed = joinLeaveSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "groupId required");
    }
    const {groupId, scope} = parsed.data;
    const ref = db.collection(groupsCollection(scope)).doc(groupId);

    await ref.update({
      GroupMembers: FieldValue.arrayRemove(uid),
      PendingMembers: FieldValue.arrayRemove(uid),
    });

    return {success: true};
  }
);

const deleteMobileGroupSchema = z.object({
  groupId: z.string().min(1),
});

/** Creator or staff (token claims): deletes `groups_mobile` doc and all `threads` / `comments` / `votes`. */
export const deleteMobileGroup = onCall(
  {region: "us-central1", invoker: "public", cors: callableCors},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const parsed = deleteMobileGroupSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "groupId required");
    }
    const {groupId} = parsed.data;
    const ref = db.collection(MOBILE_GROUPS).doc(groupId);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Group not found");
    }
    const createdBy = snap.data()?.createdBy as string | undefined;
    const staff = await isStaffUid(uid);
    if (createdBy !== uid && !staff) {
      throw new HttpsError(
        "permission-denied",
        "Only the community creator or staff can delete this group"
      );
    }
    await deleteMobileGroupDeep(groupId);
    return {success: true};
  }
);
