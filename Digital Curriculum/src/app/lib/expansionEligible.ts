import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

const DEFAULT_EXPIRATION_DAYS = 14;

/** Canonical Expansion role for graduated curriculum students. */
export const DIGITAL_CURRICULUM_ALUMNI_ROLE = "Digital Curriculum Alumni" as const;

/**
 * Upserts `eligibleUsers` with role {@link DIGITAL_CURRICULUM_ALUMNI_ROLE} and
 * generates an invite (same Cloud Function as App Access Hub "Save eligible user").
 */
export async function registerDigitalCurriculumAlumniEligible(
  email: string,
  opts?: {
    expirationDays?: number;
    cohortId?: string;
    source?: string;
  },
): Promise<{
  ok: boolean;
  code?: string;
  normalizedEmail?: string;
  errorMessage?: string;
}> {
  const fn = httpsCallable(functions, "createOrUpdateEligibleUser");
  try {
    const res = await fn({
      email: email.trim(),
      role: DIGITAL_CURRICULUM_ALUMNI_ROLE,
      source: opts?.source ?? "digital_curriculum_admin",
      generateInvite: true,
      expirationDays: opts?.expirationDays ?? DEFAULT_EXPIRATION_DAYS,
      ...(opts?.cohortId ? { cohortId: opts.cohortId } : {}),
    });
    const d = res.data as { ok?: boolean; code?: string; normalizedEmail?: string };
    return {
      ok: d?.ok === true,
      code: d.code,
      normalizedEmail: d.normalizedEmail,
    };
  } catch (e: unknown) {
    const err = e as { message?: string };
    return { ok: false, errorMessage: err.message ?? String(e) };
  }
}
