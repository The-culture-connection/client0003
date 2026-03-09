/**
 * Authentication utilities for Digital Curriculum
 */

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  getIdTokenResult,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface UserWithRoles extends User {
  roles?: string[];
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Get current user with roles from custom claims, with Firestore users/{uid}.roles as source of truth when present
 */
export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  const user = auth.currentUser;
  if (!user) return null;

  let roles: string[] = [];

  try {
    // 1. Prefer Firestore (source of truth for roles stored in DB, e.g. Admin/superAdmin)
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      const firestoreRoles = data?.roles;
      if (Array.isArray(firestoreRoles)) {
        roles = firestoreRoles.filter((r) => typeof r === "string");
      }
    }
  } catch (_e) {
    // Firestore read failed (e.g. rules); fall through to token
  }

  // 2. If no roles from Firestore, use custom claims (ID token)
  if (roles.length === 0) {
    try {
      const tokenResult = await getIdTokenResult(user, true);
      const rolesClaim = (tokenResult.claims.roles ?? {}) as Record<string, boolean> | string[];
      if (Array.isArray(rolesClaim)) {
        roles = rolesClaim;
      } else if (typeof rolesClaim === "object") {
        roles = Object.keys(rolesClaim).filter((k) => rolesClaim[k]);
      }
    } catch {
      // keep roles []
    }
  }

  return {
    ...user,
    roles,
  };
}

/**
 * Auth state observer
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
