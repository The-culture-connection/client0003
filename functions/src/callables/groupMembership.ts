/**
 * joinGroup / leaveGroup — only server-side updates to GroupMembers / PendingMembers.
 */
import {initializeApp, getApps} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {z} from "zod";

if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore();

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
