/**
 * Admin hub landing — layout based on UI/src/app/pages/admin/AdminDashboard.tsx,
 * wired to Digital Curriculum `/admin/panel/:tab` and builder routes.
 */
import { useNavigate } from "react-router";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  FileDown,
  UserPlus,
  Zap,
  Crown,
  Link as LinkIcon,
  CreditCard,
  ClipboardList,
  Smartphone,
  LineChart,
  ShieldAlert,
  Megaphone,
  MessageSquare,
  ShoppingBag,
  KeyRound,
  GraduationCap,
  UserCog,
  Medal,
  Shield,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { adminPanelPath } from "../../lib/adminHubNavigation";
import { useAdminHubActionCounts } from "../../hooks/useAdminHubActionCounts";
import { cn } from "../../components/ui/utils";
import type { MortarPlatformScope } from "../../lib/mortarPlatformScope";
import { PlatformScopeBadge, PlatformScopeKey } from "../../components/admin/MortarPlatformScope";

type ToolDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  gradient: string;
  iconColor: string;
  stats: string;
  scope: MortarPlatformScope;
};

type ActionStripItem = {
  key: string;
  title: string;
  description: string;
  href: string;
  count: number;
  icon: LucideIcon;
  variant: "critical" | "warning" | "info";
  scope: MortarPlatformScope;
};

export function AdminCommandCenter() {
  const navigate = useNavigate();
  const counts = useAdminHubActionCounts();

  const adminTools: ToolDef[] = [
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Dashboards, exports, and web analytics tooling",
      href: adminPanelPath("analytics"),
      gradient: "from-accent/20 to-accent/5",
      iconColor: "text-accent",
      stats: "Dashboard",
      scope: "digital_curriculum",
    },
    {
      icon: Medal,
      title: "Badge Management",
      description: "Create & configure achievement badges",
      href: adminPanelPath("badges"),
      gradient: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
      stats: "Badges",
      scope: "both",
    },
    {
      icon: BookOpen,
      title: "Courses",
      description: "Manage catalog and open course builder",
      href: adminPanelPath("courses"),
      gradient: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-500",
      stats: "Courses",
      scope: "digital_curriculum",
    },
    {
      icon: Calendar,
      title: "Events",
      description: "Create events and moderate RSVPs",
      href: adminPanelPath("events"),
      gradient: "from-purple-500/20 to-purple-500/5",
      iconColor: "text-purple-500",
      stats: "Events",
      scope: "both",
    },
    {
      icon: UserCog,
      title: "Role & admins",
      description: "Manage admin access and user roles",
      href: adminPanelPath("admins"),
      gradient: "from-yellow-500/20 to-yellow-500/5",
      iconColor: "text-yellow-500",
      stats: "Access",
      scope: "both",
    },
    {
      icon: ClipboardList,
      title: "Reports",
      description: "Goal reports and engagement summaries",
      href: adminPanelPath("reports"),
      gradient: "from-green-500/20 to-green-500/5",
      iconColor: "text-green-500",
      stats: "Reports",
      scope: "digital_curriculum",
    },
    {
      icon: ShoppingBag,
      title: "Shop",
      description: "Shop items, inventory, and catalog",
      href: adminPanelPath("shop"),
      gradient: "from-accent/20 to-accent/5",
      iconColor: "text-accent",
      stats: "Commerce",
      scope: "digital_curriculum",
    },
    {
      icon: GraduationCap,
      title: "Alumni applications",
      description: "Review graduation and alumni intake",
      href: adminPanelPath("graduation"),
      gradient: "from-cyan-500/20 to-cyan-500/5",
      iconColor: "text-cyan-500",
      stats: "Applications",
      scope: "digital_curriculum",
    },
    {
      icon: KeyRound,
      title: "App Access Hub",
      description: "Expansion access and invitations",
      href: adminPanelPath("app-access-hub"),
      gradient: "from-pink-500/20 to-pink-500/5",
      iconColor: "text-pink-500",
      stats: "Hub",
      scope: "expansion_mobile",
    },
    {
      icon: ShieldAlert,
      title: "Expansion mobile moderation",
      description: "Moderation tools for the mobile app",
      href: adminPanelPath("expansion-mobile"),
      gradient: "from-orange-500/20 to-orange-500/5",
      iconColor: "text-orange-500",
      stats: "Moderation",
      scope: "expansion_mobile",
    },
    {
      icon: LineChart,
      title: "Mobile analytics",
      description: "Expansion mobile analytics & exports",
      href: adminPanelPath("mobile-analytics"),
      gradient: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-500",
      stats: "Analytics",
      scope: "expansion_mobile",
    },
    {
      icon: Megaphone,
      title: "Mortar Info",
      description: "Announcements and mortar info posts",
      href: adminPanelPath("mortar-info"),
      gradient: "from-sky-500/20 to-sky-500/5",
      iconColor: "text-sky-500",
      stats: "Posts",
      scope: "both",
    },
    {
      icon: MessageSquare,
      title: "Direct messages",
      description: "Digital student DMs and replies",
      href: adminPanelPath("messages"),
      gradient: "from-violet-500/20 to-violet-500/5",
      iconColor: "text-violet-500",
      stats: "Inbox",
      scope: "digital_curriculum",
    },
    {
      icon: Users,
      title: "Groups",
      description: "Community groups and approvals",
      href: adminPanelPath("groups"),
      gradient: "from-indigo-500/20 to-indigo-500/5",
      iconColor: "text-indigo-500",
      stats: "Groups",
      scope: "digital_curriculum",
    },
  ];

  const actionStripItems: ActionStripItem[] = [
    {
      key: "events",
      title: "Events need approval",
      description: "Member-submitted events awaiting review.",
      href: adminPanelPath("events"),
      count: counts.pendingEvents,
      icon: Calendar,
      variant: "critical",
      scope: "both",
    },
    {
      key: "graduation",
      title: "Alumni applications",
      description: "Graduation applications pending review.",
      href: adminPanelPath("graduation"),
      count: counts.pendingGraduation,
      icon: Medal,
      variant: "critical",
      scope: "digital_curriculum",
    },
    {
      key: "reports",
      title: "Mobile expansion reports",
      description: "User reports requiring moderation.",
      href: adminPanelPath("expansion-mobile"),
      count: counts.openReports,
      icon: Shield,
      variant: "warning",
      scope: "expansion_mobile",
    },
    {
      key: "dms",
      title: "DM messages",
      description: "Unread student messages needing a reply.",
      href: adminPanelPath("messages"),
      count: counts.unreadDms,
      icon: MessageSquare,
      variant: "info",
      scope: "digital_curriculum",
    },
  ];

  const stripStyles = (active: boolean, variant: ActionStripItem["variant"]) => {
    if (!active) {
      return "border-border bg-card/40 opacity-90 hover:opacity-100 hover:border-border";
    }
    switch (variant) {
      case "critical":
        return "border-red-500/70 bg-red-950/35 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]";
      case "warning":
        return "border-yellow-500/65 bg-yellow-950/25 shadow-[0_0_0_1px_rgba(234,179,8,0.35)]";
      case "info":
        return "border-blue-500/65 bg-blue-950/30 shadow-[0_0_0_1px_rgba(59,130,246,0.35)]";
      default:
        return "border-border";
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Crown className="w-8 h-8 text-accent" />
              </div>
              Admin Command Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose a tool below. Detail screens keep this hub available in the side rail.
            </p>
          </div>
          <Badge className="bg-accent/10 text-accent border-accent/30 text-sm px-3 py-1 shrink-0">ADMIN ACCESS</Badge>
        </div>
        <PlatformScopeKey className="mt-3 pt-3 border-t border-border/40" />
      </div>

      {/* Action items — live counts; visually emphasized when work is waiting */}
      <section className="mb-8">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-foreground">Action items</h2>
            {!counts.loading && counts.total > 0 && (
              <Badge className="bg-destructive text-destructive-foreground border-0 min-w-[1.5rem] justify-center tabular-nums">
                {counts.total}
              </Badge>
            )}
            {counts.loading && (
              <span className="text-xs text-muted-foreground">Loading counts…</span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1.5 shrink-0"
            title="Counts refresh automatically from Firestore while this page is open."
          >
            <RefreshCw className="w-4 h-4" />
            Live sync
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {actionStripItems.map((item) => {
            const active = item.count > 0;
            return (
              <Card
                key={item.key}
                role="button"
                tabIndex={0}
                onClick={() => navigate(item.href)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(item.href);
                  }
                }}
                className={cn(
                  "p-5 cursor-pointer transition-all hover:shadow-lg border-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  stripStyles(active, item.variant)
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={cn(
                      "p-2.5 rounded-lg shrink-0 border",
                      active
                        ? item.variant === "critical"
                          ? "bg-red-500/15 border-red-500/40 text-red-400"
                          : item.variant === "warning"
                            ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400"
                            : "bg-blue-500/15 border-blue-500/40 text-blue-400"
                        : "bg-muted/50 border-border text-muted-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PlatformScopeBadge scope={item.scope} compact className="shrink-0" />
                      <h3 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h3>
                      {active && item.variant === "critical" && (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
                      )}
                      {active && item.variant === "warning" && (
                        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                        </span>
                      )}
                      {active && item.variant === "info" && (
                        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span
                    className={cn(
                      "text-lg font-bold tabular-nums",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {counts.loading ? "—" : item.count}
                  </span>
                  <span className="text-sm font-medium text-accent flex items-center gap-1">
                    Review
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground mb-1">Admin tools</h2>
            <p className="text-sm text-muted-foreground">Jump into each management area.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {adminTools.map((tool, idx) => (
              <Card
                key={idx}
                onClick={() => navigate(tool.href)}
                className={`p-5 bg-gradient-to-br ${tool.gradient} border-border hover:border-accent transition-all hover:shadow-xl cursor-pointer group relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform"></div>

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="p-3 rounded-lg bg-card/50 border border-border/50">
                      <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <PlatformScopeBadge scope={tool.scope} />
                      <Badge variant="outline" className="text-xs border-border">
                        {tool.stats}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">{tool.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-border group-hover:border-accent group-hover:bg-accent/10 group-hover:text-accent transition-all"
                  >
                    Open
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 bg-gradient-to-br from-accent/20 via-card to-card border-accent/30">
            <h2 className="text-lg font-bold text-foreground mb-4">Quick actions</h2>
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground justify-start"
                onClick={() => navigate(adminPanelPath("graduation"))}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Alumni applications
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate("/admin/courses/builder")}
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Course builder
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate("/admin/courses/create")}
              >
                <Zap className="w-4 h-4 mr-2" />
                Course wizard
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate(adminPanelPath("events"))}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Events panel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-border justify-start"
                onClick={() => navigate(adminPanelPath("reports"))}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Reports panel
              </Button>
            </div>
          </Card>

          <Card className="p-5 bg-card border-border">
            <h2 className="text-lg font-bold text-foreground mb-4">System status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-foreground">Admin shell</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500 text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm text-foreground">Firestore</span>
                </div>
                <Badge className="bg-green-500/10 text-green-500 text-xs">Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                  <span className="text-sm text-foreground">Functions</span>
                </div>
                <Badge className="bg-accent/10 text-accent text-xs">In use</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Mobile tools</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Expansion
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Payments</span>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  See Shop
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm text-foreground">Integrations</span>
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  App Hub
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
