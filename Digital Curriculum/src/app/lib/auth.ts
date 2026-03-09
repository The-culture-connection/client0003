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
import { auth } from "./firebase";

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
 * Get current user with roles from custom claims
 */
export async function getCurrentUserWithRoles(): Promise<UserWithRoles | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await getIdTokenResult(user, true);
    const rolesClaim = (tokenResult.claims.roles ?? {}) as Record<string, boolean> | string[];

    let roles: string[] = [];
    if (Array.isArray(rolesClaim)) {
      roles = rolesClaim;
    } else if (typeof rolesClaim === "object") {
      roles = Object.keys(rolesClaim).filter((k) => rolesClaim[k]);
    }

    return {
      ...user,
      roles,
    };
  } catch {
    return { ...user, roles: [] };
  }
}

/**
 * Auth state observer
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
