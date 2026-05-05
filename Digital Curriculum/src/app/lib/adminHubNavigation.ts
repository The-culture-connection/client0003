/** Tab slug in URL: `/admin/panel/:tab` — must match TabsTrigger values in Admin.tsx */
export const ADMIN_PANEL_TAB_SLUGS = [
  "groups",
  "events",
  "graduation",
  "admins",
  "analytics",
  "reports",
  "badges",
  "app-access-hub",
  "expansion-mobile",
  "mobile-analytics",
  "mortar-info",
  "messages",
  "courses",
  "shop",
] as const;

export type AdminPanelTabSlug = (typeof ADMIN_PANEL_TAB_SLUGS)[number];

export const ADMIN_PANEL_TAB_SET = new Set<string>(ADMIN_PANEL_TAB_SLUGS);

export function isAdminPanelTab(slug: string | undefined): slug is AdminPanelTabSlug {
  return Boolean(slug && ADMIN_PANEL_TAB_SET.has(slug));
}

export function adminPanelPath(tab: AdminPanelTabSlug): string {
  return `/admin/panel/${tab}`;
}

/** Admin or superAdmin role (Digital Curriculum web). */
export function isStaffAdminRole(roles: readonly string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => {
    const x = String(r).trim().toLowerCase();
    return x === "superadmin" || x === "admin";
  });
}

export function staffPrimaryHomePath(adminViewMode: "student" | "admin"): string {
  return adminViewMode === "admin" ? "/admin" : "/dashboard";
}

/** Paths where we do not force-redirect staff in admin view mode to `/admin`. */
export function pathExemptFromStaffAdminHubRedirect(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname === "/login" || pathname === "/join" || pathname === "/verify-email") return true;
  if (pathname.startsWith("/certificate/")) return true;
  if (pathname.startsWith("/onboarding")) return true;
  return false;
}
