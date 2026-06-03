/**
 * Brevo transactional template IDs (numeric IDs from Brevo → Transactional → Templates).
 * Copy/paste HTML + subject lines: docs/brevo-transactional-email-templates.md
 * Override any ID via env without redeploying code: BREVO_TPL_* (see keys below).
 */

function tpl(envKey: string, codeDefault: number): number {
  const raw = process.env[envKey]?.trim();
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  return codeDefault;
}

/** Mortar Brevo transactional template IDs (mortar-dev account, May 2026). */
export const BREVO_TEMPLATE_IDS = {
  course_inactive_7_days: tpl("BREVO_TPL_COURSE_INACTIVE_7D", 3),
  course_inactive_14_days: tpl("BREVO_TPL_COURSE_INACTIVE_14D", 4),
  event_announcement_to_registrants: tpl("BREVO_TPL_EVENT_ANNOUNCEMENT", 5),
  admin_custom_announcement: tpl("BREVO_TPL_ADMIN_CUSTOM", 6),
  app_access_code_invite: tpl("BREVO_TPL_APP_ACCESS_CODE", 7),
  /** Admin Accept + selectedTime (status → accepted): meeting scheduled */
  graduation_meeting_time_selected: tpl("BREVO_TPL_GRADUATION_MEETING_TIME", 8),
  /** After meeting: admitUserToAlumni (users.roles gains Digital Curriculum Alumni) */
  graduation_admitted_to_alumni: tpl("BREVO_TPL_GRADUATION_ADMITTED", 9),
  /** After meeting (or admin reject): status → rejected */
  graduation_not_admitted: tpl("BREVO_TPL_GRADUATION_NOT_ADMITTED", 10),
  masters_onboarding_welcome: tpl("BREVO_TPL_MASTERS_ONBOARDING_WELCOME", 11),
  /** Stripe shop checkout confirmation */
  payment_shop_order_confirmed: tpl("BREVO_TPL_PAYMENT_SHOP_CONFIRMED", 12),
  /** Stripe paid event ticket confirmation */
  payment_event_registration_confirmed: tpl("BREVO_TPL_PAYMENT_EVENT_CONFIRMED", 13),
  /** Stripe paid course module confirmation */
  payment_module_purchase_confirmed: tpl("BREVO_TPL_PAYMENT_MODULE_CONFIRMED", 14),
  /** Admin fulfillment status / tracking update */
  shop_order_fulfillment_update: tpl("BREVO_TPL_SHOP_FULFILLMENT_UPDATE", 15),
} as const;

export type BrevoTemplateKey = keyof typeof BREVO_TEMPLATE_IDS;

export function resolveTemplateId(key: BrevoTemplateKey): number {
  const id = BREVO_TEMPLATE_IDS[key];
  if (!id || id <= 0) {
    throw new Error(
      `Brevo template "${key}" is not configured. Set BREVO_TEMPLATE_IDS.${key} or env BREVO_TPL_* and redeploy.`
    );
  }
  return id;
}
