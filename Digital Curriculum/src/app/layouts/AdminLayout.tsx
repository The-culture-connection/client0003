import { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { ScrollArea } from "../components/ui/scroll-area";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Crown, BookOpen, Sparkles } from "lucide-react";
import { adminPanelPath, type AdminPanelTabSlug } from "../lib/adminHubNavigation";
import { ADMIN_PANEL_TAB_SCOPE } from "../lib/mortarPlatformScope";
import { PlatformScopeBadge } from "../components/admin/MortarPlatformScope";
import { useAdminViewMode } from "../contexts/AdminViewModeContext";

const panelLinks: { label: string; tab: AdminPanelTabSlug }[] = [
  { label: "Groups", tab: "groups" },
  { label: "Events", tab: "events" },
  { label: "Alumni applications", tab: "graduation" },
  { label: "Admins", tab: "admins" },
  { label: "Analytics", tab: "analytics" },
  { label: "Reports", tab: "reports" },
  { label: "Badges", tab: "badges" },
  { label: "App Access Hub", tab: "app-access-hub" },
  { label: "Expansion mobile", tab: "expansion-mobile" },
  { label: "Mobile analytics", tab: "mobile-analytics" },
  { label: "Mortar Info", tab: "mortar-info" },
  { label: "Direct messages", tab: "messages" },
  { label: "Courses", tab: "courses" },
  { label: "Shop", tab: "shop" },
];

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminViewMode } = useAdminViewMode();

  useEffect(() => {
    if (adminViewMode === "student") {
      navigate("/dashboard", { replace: true });
    }
  }, [adminViewMode, navigate]);

  const isHub = location.pathname === "/admin" || location.pathname === "/admin/";

  if (isHub) {
    return <Outlet />;
  }

  return (
    <div className="flex w-full min-h-[calc(100vh-4rem)]">
      <aside className="hidden md:flex w-[min(18rem,92vw)] shrink-0 flex-col border-r border-border bg-card/60 sticky top-16 self-start max-h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-border space-y-3">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-accent transition-colors"
          >
            <Crown className="w-4 h-4 text-accent shrink-0" />
            Command center
          </Link>
          <p className="text-xs text-muted-foreground leading-snug">
            Admin tools and quick actions stay available while you work in a detail screen.
          </p>
        </div>

        <ScrollArea className="flex-1 px-2 py-3">
          <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Admin tools</p>
          <nav className="space-y-0.5">
            {panelLinks.map((l) => {
              const to = adminPanelPath(l.tab);
              const scope = ADMIN_PANEL_TAB_SCOPE[l.tab];
              return (
                <Link key={to} to={to}>
                  <Button
                    variant={location.pathname.startsWith(to) ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left font-normal h-auto min-h-9 py-1.5"
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">{l.label}</span>
                      <PlatformScopeBadge scope={scope} compact showIcon={false} className="shrink-0" />
                    </span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <Separator className="my-3" />

          <div className="px-2 pb-1">
            <PlatformScopeKey className="text-[10px]" />
          </div>

          <Separator className="my-3" />

          <p className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quick actions</p>
          <div className="space-y-1">
            <Button variant="outline" size="sm" className="w-full justify-start font-normal" asChild>
              <Link to="/admin/courses/builder">
                <BookOpen className="w-4 h-4 mr-2 shrink-0" />
                Course builder
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start font-normal" asChild>
              <Link to="/admin/courses/create">
                <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                Course wizard
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start font-normal" asChild>
              <Link to="/admin/auth">Admin password gate</Link>
            </Button>
          </div>
        </ScrollArea>
      </aside>

      <div className="flex-1 min-w-0 bg-background">
        <div className="md:hidden border-b border-border bg-muted/30 px-4 py-2 flex gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Hub</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={adminPanelPath("courses")}>Courses</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/courses/builder">Builder</Link>
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
