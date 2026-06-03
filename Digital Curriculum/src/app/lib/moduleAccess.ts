/**
 * Module purchase access — reads `users/{uid}.membership.paid_modules`.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Course, Module } from "./courses";

function sortedModules(course: Course): Module[] {
  return [...course.modules].sort((a, b) => (a.order || 0) - (b.order || 0));
}

/** Curriculum module id for a course module row (aligned with sorted module order). */
export function curriculumModuleIdForIndex(course: Course, moduleIndex: number): string | undefined {
  return course.curriculumMapping?.modules?.[moduleIndex]?.moduleId;
}

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

/** Sum of module prices the user has not purchased yet (paid modules only). */
export function unpaidPaidModuleTotalCents(course: Course, paidModuleIds: string[]): number {
  const modules = sortedModules(course);
  let dollars = 0;
  modules.forEach((module, moduleIndex) => {
    const price = Number(module.price ?? 0);
    if (price <= 0) return;
    const curriculumModuleId = curriculumModuleIdForIndex(course, moduleIndex);
    if (!userHasModuleAccess(module, paidModuleIds, curriculumModuleId)) {
      dollars += price;
    }
  });
  return Math.round(dollars * 100);
}

export function userOwnsAllPaidModules(course: Course, paidModuleIds: string[]): boolean {
  return unpaidPaidModuleTotalCents(course, paidModuleIds) === 0;
}
