/**
 * Module purchase access — reads `users/{uid}.membership.paid_modules`.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Module } from "./courses";

export async function getPaidModuleIds(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid));
  const list = snap.data()?.membership?.paid_modules;
  return Array.isArray(list) ? list.filter((id): id is string => typeof id === "string") : [];
}

/** True when the user may open lessons in this module (free modules always allowed). */
export function userHasModuleAccess(
  module: Pick<Module, "id" | "price">,
  paidModuleIds: string[],
  curriculumModuleId?: string
): boolean {
  const price = Number(module.price ?? 0);
  if (price <= 0) return true;
  const ids = new Set(paidModuleIds);
  if (module.id && ids.has(module.id)) return true;
  if (curriculumModuleId && ids.has(curriculumModuleId)) return true;
  return false;
}
