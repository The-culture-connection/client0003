/**
 * syncRolesToClaims — keep Auth custom claims `roles` in sync with Firestore
 * `users/{uid}.roles` (and legacy `role`).
 *
 * Why: the Firestore security rules and admin callables authorize off custom claims
 * (`request.auth.token.roles` / `customClaims.roles`). The proper promotion paths
 * (`setUserRole` / `setAdminOnly` callables, the `onUserCreated` trigger) already set
 * claims. But a role changed *directly* in Firestore — console edit, seed script, data
 * import — would otherwise NOT update claims, leaving the user locked out (or over-granted).
 * That drift is exactly what broke staging after the rules deploy.
 *
 * This trigger closes the gap: whenever a user's role set changes in Firestore, it mirrors
 * the change into custom claims, so any future admin (however added) is covered.
 *
 * No infinite loop: writing custom claims does not write Firestore, so it can't re-trigger
 * this Firestore document trigger.
 */

import {getApps, initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

if (getApps().length === 0) {
  initializeApp();
}

const auth = getAuth();

function rolesFromDoc(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const out = new Set<string>();
  if (Array.isArray(data.roles)) {
    for (const r of data.roles) if (typeof r === "string" && r.trim()) out.add(r.trim());
  }
  if (typeof data.role === "string" && data.role.trim()) out.add(data.role.trim());
  return Array.from(out);
}

function claimRoles(claims: Record<string, unknown> | undefined): string[] {
  const raw = claims?.roles;
  if (Array.isArray(raw)) return raw.filter((r): r is string => typeof r === "string");
  if (typeof raw === "string") return [raw];
  return [];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every((x) => sb.has(x));
}

export const syncRolesToClaims = onDocumentWritten(
  {region: "us-central1", document: "users/{uid}"},
  async (event) => {
    const uid = event.params.uid as string;
    const before = event.data?.before.data() as Record<string, unknown> | undefined;
    const after = event.data?.after.data() as Record<string, unknown> | undefined;
    if (!after) return; // user doc deleted — nothing to sync.

    const desired = rolesFromDoc(after);
    const prior = before ? rolesFromDoc(before) : null;
    // Only act when the role set actually changed, so unrelated field writes (gamification,
    // profile edits, fcm tokens, …) don't trigger an Auth write on every user update.
    if (prior !== null && sameSet(prior, desired)) return;

    try {
      const user = await auth.getUser(uid);
      const current = claimRoles(user.customClaims as Record<string, unknown> | undefined);
      if (sameSet(current, desired)) return; // claims already correct.

      await auth.setCustomUserClaims(uid, {
        ...(user.customClaims || {}),
        roles: desired,
      });
      logger.info(`syncRolesToClaims: ${uid} claims roles -> [${desired.join(", ")}]`);
    } catch (err) {
      logger.error(`syncRolesToClaims: failed for ${uid}`, err);
    }
  }
);
