/**
 * Defaults for Brevo template params (override via env in Functions config / secrets).
 */

export const DEFAULT_SUPPORT_EMAIL =
  process.env.MORTAR_SUPPORT_EMAIL?.trim() || "masters@wearemortar.com";

export const DEFAULT_PLATFORM_URL =
  process.env.DIGITAL_CURRICULUM_PLATFORM_URL?.trim() ||
  "https://mortar-stage-stage.up.railway.app";

export const DEFAULT_EXPANSION_APP_NAME =
  process.env.EXPANSION_APP_DISPLAY_NAME?.trim() || "MORTAR Expansion Network";

/** Deep link or marketing URL for invite redemption (Flutter / web). */
export const DEFAULT_EXPANSION_REDEEM_URL =
  process.env.EXPANSION_APP_REDEEM_URL?.trim() || DEFAULT_PLATFORM_URL;

export const DEFAULT_COURSE_DISPLAY_NAME =
  process.env.DEFAULT_COURSE_DISPLAY_NAME?.trim() || "MORTAR Masters Online";

/** Shown in 14-day inactivity email ("master …"). */
export const DEFAULT_COURSE_BENEFIT =
  process.env.DEFAULT_COURSE_BENEFIT?.trim() ||
  "the business skills you need to grow with confidence";

export const DEFAULT_SCHEDULE_HOURS =
  process.env.DEFAULT_ONBOARDING_SCHEDULE_HOURS?.trim() || "2–3 hours";

export const DEFAULT_TIME_TO_NEXT_BADGE =
  process.env.DEFAULT_TIME_TO_NEXT_BADGE?.trim() || "30 minutes";

export const DEFAULT_COURSE_ID =
  process.env.DEFAULT_COURSE_ID?.trim() || "mortar_masters_online";

export const ADMITTED_ALUMNI_NEXT_STEPS =
  process.env.GRADUATION_ADMITTED_NEXT_STEPS?.trim() ||
  "If you received an Expansion Network invite code from your administrator, use it in the mobile app. Otherwise, sign in to Digital Curriculum to explore alumni features.";
