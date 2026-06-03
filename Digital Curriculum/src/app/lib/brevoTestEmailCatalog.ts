/**
 * Admin email testing — display labels and Brevo IDs (defaults from brevoTemplates.ts).
 * Merged with `adminListTestEmailTemplates` so new templates appear even before Functions deploy.
 */
export type BrevoTestEmailSection = "course" | "graduation" | "events" | "payments";

export type BrevoTestEmailCatalogEntry = {
  key: string;
  label: string;
  template_id: number;
  section: BrevoTestEmailSection;
};

/** Order matches admin panel sections. Keep in sync with functions/src/email/brevoTemplates.ts defaults. */
export const BREVO_TEST_EMAIL_CATALOG: BrevoTestEmailCatalogEntry[] = [
  { key: "course_inactive_7_days", label: "Course inactive — 7 days", template_id: 3, section: "course" },
  { key: "course_inactive_14_days", label: "Course inactive — 14 days", template_id: 4, section: "course" },
  { key: "masters_onboarding_welcome", label: "Masters onboarding welcome", template_id: 11, section: "course" },
  {
    key: "graduation_meeting_time_selected",
    label: "Graduation — meeting time confirmed",
    template_id: 8,
    section: "graduation",
  },
  {
    key: "graduation_admitted_to_alumni",
    label: "Graduation — admitted to alumni",
    template_id: 9,
    section: "graduation",
  },
  {
    key: "graduation_not_admitted",
    label: "Graduation — not admitted",
    template_id: 10,
    section: "graduation",
  },
  {
    key: "event_announcement_to_registrants",
    label: "Event announcement to registrants",
    template_id: 5,
    section: "events",
  },
  { key: "admin_custom_announcement", label: "Admin custom announcement", template_id: 6, section: "events" },
  { key: "app_access_code_invite", label: "App access code invite", template_id: 7, section: "events" },
  {
    key: "payment_shop_order_confirmed",
    label: "Payment — shop order confirmed",
    template_id: 12,
    section: "payments",
  },
  {
    key: "payment_event_registration_confirmed",
    label: "Payment — event registration confirmed",
    template_id: 13,
    section: "payments",
  },
  {
    key: "payment_module_purchase_confirmed",
    label: "Payment — module purchase confirmed",
    template_id: 14,
    section: "payments",
  },
  {
    key: "shop_order_fulfillment_update",
    label: "Shop — fulfillment / tracking update",
    template_id: 15,
    section: "payments",
  },
];

const CATALOG_BY_KEY = new Map(BREVO_TEST_EMAIL_CATALOG.map((e) => [e.key, e]));

export function brevoTestEmailLabel(key: string): string {
  return CATALOG_BY_KEY.get(key)?.label ?? key;
}

export function brevoTestEmailSection(key: string): BrevoTestEmailSection {
  return CATALOG_BY_KEY.get(key)?.section ?? "events";
}

const SECTION_ORDER: BrevoTestEmailSection[] = ["course", "graduation", "events", "payments"];

export const BREVO_TEST_EMAIL_SECTION_LABELS: Record<BrevoTestEmailSection, string> = {
  course: "Course & onboarding",
  graduation: "Graduation",
  events: "Events & admin",
  payments: "Payments & shop",
};

/** Merge API list with catalog so payment templates always show in the panel. */
export function mergeTestEmailTemplates(
  fromApi: Array<{ key: string; template_id: number; preference_category: string | null }>
): Array<{
  key: string;
  template_id: number;
  preference_category: string | null;
  label: string;
  section: BrevoTestEmailSection;
  fromCatalogOnly: boolean;
}> {
  const byKey = new Map(fromApi.map((t) => [t.key, t]));

  for (const entry of BREVO_TEST_EMAIL_CATALOG) {
    if (!byKey.has(entry.key)) {
      byKey.set(entry.key, {
        key: entry.key,
        template_id: entry.template_id,
        preference_category: null,
      });
    }
  }

  const merged = [...byKey.values()].map((t) => ({
    ...t,
    label: brevoTestEmailLabel(t.key),
    section: brevoTestEmailSection(t.key),
    fromCatalogOnly: !fromApi.some((a) => a.key === t.key),
  }));

  merged.sort((a, b) => {
    const sa = SECTION_ORDER.indexOf(a.section);
    const sb = SECTION_ORDER.indexOf(b.section);
    if (sa !== sb) return sa - sb;
    const ia = BREVO_TEST_EMAIL_CATALOG.findIndex((e) => e.key === a.key);
    const ib = BREVO_TEST_EMAIL_CATALOG.findIndex((e) => e.key === b.key);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });

  return merged;
}
