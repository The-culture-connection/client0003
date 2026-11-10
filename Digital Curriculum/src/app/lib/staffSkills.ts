/**
 * Data access for the staff Skills & Passions form (/staff-skills).
 *
 * - `staff_skills_profiles/{uid}`: one response per signed-in person; owner
 *   writes, owner + staff read (see firestore.rules).
 * - `staff_skill_catalog/{kind__slug}`: skills/passions people added that were
 *   not in the starter catalog. Any signed-in user can add; everyone signed in
 *   can read, so a new entry shows up in search for the next person.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { PASSION_CATALOG, SKILL_CATALOG } from "./staffSkillsCatalog";

export type CatalogKind = "skill" | "passion";

export type StaffSkillsProfile = {
  user_id: string;
  email: string | null;
  full_name: string;
  title: string;
  team: string;
  linkedin_url: string;
  skills: string[];
  certifications: string;
  workshop_topics: string;
  passions: string[];
  training_formats: string[];
  audiences: string[];
  monthly_hours: string;
  ok_to_feature: "yes" | "no" | "";
};

const PROFILES = "staff_skills_profiles";
const CATALOG = "staff_skill_catalog";

export function emptyProfile(uid: string, email: string | null, name: string | null): StaffSkillsProfile {
  return {
    user_id: uid,
    email,
    full_name: name ?? "",
    title: "",
    team: "",
    linkedin_url: "",
    skills: [],
    certifications: "",
    workshop_topics: "",
    passions: [],
    training_formats: [],
    audiences: [],
    monthly_hours: "",
    ok_to_feature: "",
  };
}

export async function loadMyStaffSkillsProfile(uid: string): Promise<StaffSkillsProfile | null> {
  const snap = await getDoc(doc(db, PROFILES, uid));
  if (!snap.exists()) return null;
  return snap.data() as StaffSkillsProfile;
}

export async function saveMyStaffSkillsProfile(profile: StaffSkillsProfile, isNew: boolean): Promise<void> {
  await setDoc(
    doc(db, PROFILES, profile.user_id),
    {
      ...profile,
      updated_at: serverTimestamp(),
      ...(isNew ? { created_at: serverTimestamp() } : {}),
    },
    { merge: true }
  );
}

/** Starter catalog merged with everything staff have added, de-duplicated and sorted. */
export async function loadCatalog(): Promise<Record<CatalogKind, string[]>> {
  const custom: Record<CatalogKind, string[]> = { skill: [], passion: [] };
  try {
    const snap = await getDocs(collection(db, CATALOG));
    snap.forEach((d) => {
      const data = d.data() as { kind?: string; label?: string };
      if ((data.kind === "skill" || data.kind === "passion") && typeof data.label === "string") {
        custom[data.kind].push(data.label);
      }
    });
  } catch {
    // The starter catalog still works if custom entries can't be read.
  }
  return {
    skill: mergeUnique(SKILL_CATALOG, custom.skill),
    passion: mergeUnique(PASSION_CATALOG, custom.passion),
  };
}

/** Normalize a label typed by a user: trim, collapse spaces, cap length. */
export function cleanLabel(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Save a new entry so other people can pick it. The doc id is derived from the
 * label, so adding something that already exists is a harmless no-op (the rules
 * reject the overwrite and we ignore that).
 */
export async function addCatalogEntry(kind: CatalogKind, label: string, uid: string): Promise<void> {
  const clean = cleanLabel(label);
  if (!clean) return;
  const id = `${kind}__${slug(clean)}`;
  try {
    await setDoc(doc(db, CATALOG, id), {
      kind,
      label: clean,
      created_by: uid,
      created_at: serverTimestamp(),
    });
  } catch {
    // Already exists, or offline: the person still keeps it on their own answers.
  }
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "entry";
}

function mergeUnique(base: string[], extra: string[]): string[] {
  const seen = new Map<string, string>();
  for (const s of [...base, ...extra]) {
    const key = s.toLowerCase();
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
