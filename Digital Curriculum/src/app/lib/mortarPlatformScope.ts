import type { AdminPanelTabSlug } from "./adminHubNavigation";

export type MortarPlatformScope = "digital_curriculum" | "expansion_mobile" | "both";

/** Primary Mortar surface for each `/admin/panel/:tab` destination (for badges + legend). */
export const ADMIN_PANEL_TAB_SCOPE: Record<AdminPanelTabSlug, MortarPlatformScope> = {
  groups: "digital_curriculum",
  events: "both",
  graduation: "digital_curriculum",
  admins: "both",
  analytics: "digital_curriculum",
  reports: "digital_curriculum",
  badges: "both",
  "app-access-hub": "expansion_mobile",
  "expansion-mobile": "expansion_mobile",
  "mobile-analytics": "expansion_mobile",
  "mortar-info": "both",
  messages: "digital_curriculum",
  courses: "digital_curriculum",
  shop: "digital_curriculum",
};
