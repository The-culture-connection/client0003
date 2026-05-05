import { Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, BookOpen, FolderOpen, Award, Users, BarChart3, LogOut, Shield, ShoppingBag, Bell, ShoppingCart, X, GraduationCap, Crown } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../auth/AuthProvider";
import { useState, useEffect } from "react";
import { subscribeUserNotifications, markNotificationRead, type UserNotification } from "../../lib/dataroom";
import { useCart } from "../../lib/cart";
import { releaseStock } from "../../lib/shop";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { trackEvent } from "../../analytics/trackEvent";
import { WEB_ANALYTICS_EVENTS } from "@mortar/analytics-contract/mortarAnalyticsContract";
import { UserBadgeSuiteDialog } from "../badges/UserBadgeSuiteDialog";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { useAdminViewMode } from "../../contexts/AdminViewModeContext";
import {
  isStaffAdminRole,
  pathExemptFromStaffAdminHubRedirect,
} from "../../lib/adminHubNavigation";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[]; // Legacy: use allowedRoles instead
  allowedRoles?: string[];
  deniedRoles?: string[];
}

const allNavItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Available to all
  { path: "/curriculum", label: "Curriculum", icon: BookOpen }, // Available to all
  { path: "/data-room", label: "Data Room", icon: FolderOpen }, // Available to all
  { path: "/community", label: "Community Hub", icon: Users }, // Available to all
  { path: "/shop", label: "Shop Mortar", icon: ShoppingBag }, // Available to all
  { 
    path: "/analytics", 
    label: "Analytics", 
    icon: BarChart3, 
    deniedRoles: ["Digital Curriculum Students"] // Denied to Digital Curriculum Students
  },
  {
    path: "/admin/auth",
    label: "Admin",
    icon: Shield,
    allowedRoles: ["superAdmin", "Admin"], // superAdmin or Admin can see
  },
];

export function WebNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [badgeSuiteOpen, setBadgeSuiteOpen] = useState(false);

  const { cart, itemCount, api } = useCart(user?.uid ?? null);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserNotifications(user.uid, (list, unread) => {
      setNotifications(list);
      setUnreadCount(unread);
    });
  }, [user?.uid]);

  const handleNotificationClick = async (n: UserNotification) => {
    if (!user?.uid) return;
    if (n.type === "certificate_available") {
      trackEvent(WEB_ANALYTICS_EVENTS.NOTIFICATION_ITEM_CLICKED, {
        notification_id: n.id,
        notification_type: n.type,
        has_certificate_id: Boolean(n.certificateId),
        has_badge_id: Boolean(n.badgeId),
      });
      await markNotificationRead(user.uid, n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setNotificationsOpen(false);
      navigate("/data-room");
      return;
    }
    if (n.type === "badge_earned") {
      trackEvent(WEB_ANALYTICS_EVENTS.NOTIFICATION_ITEM_CLICKED, {
        notification_id: n.id,
        notification_type: n.type,
        has_certificate_id: false,
        has_badge_id: Boolean(n.badgeId),
      });
      await markNotificationRead(user.uid, n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setNotificationsOpen(false);
      setBadgeSuiteOpen(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Filter navigation items based on user roles
  const userRoles = user?.roles || [];
  const hasRole = (role: string) =>
    userRoles.some((r) => r.trim().toLowerCase() === role.trim().toLowerCase());

  const hasStaffAdminAccess = isStaffAdminRole(userRoles);

  const { adminViewMode, setAdminViewMode } = useAdminViewMode();

  const showStudentNavLinks = !hasStaffAdminAccess || adminViewMode === "student";
  const adminMinimalHeader = hasStaffAdminAccess && adminViewMode === "admin";

  useEffect(() => {
    if (!user || !hasStaffAdminAccess || adminViewMode !== "admin") return;
    if (pathExemptFromStaffAdminHubRedirect(location.pathname)) return;
    if (!location.pathname.startsWith("/admin")) {
      navigate("/admin", { replace: true });
    }
  }, [user, hasStaffAdminAccess, adminViewMode, location.pathname, navigate]);

  const logoTo =
    hasStaffAdminAccess && adminViewMode === "admin" ? "/admin" : "/dashboard";

  const navItems = allNavItems.filter((item) => {
    if (item.path === "/admin/auth") {
      if (!hasStaffAdminAccess) return false;
      if (adminViewMode === "student") return false;
    }
    // If item has deniedRoles, check if user has any of them
    if (item.deniedRoles && item.deniedRoles.length > 0) {
      const hasDeniedRole = item.deniedRoles.some((role) => hasRole(role));
      if (hasDeniedRole) return false;
    }
    
    // If item has allowedRoles, check if user has at least one
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      const hasAllowedRole = item.allowedRoles.some((role) => hasRole(role));
      if (!hasAllowedRole) return false;
    }
    
    // Legacy support: if item has roles (old prop name), treat as allowedRoles
    if (item.roles && item.roles.length > 0) {
      const hasRequiredRole = item.roles.some((role) => hasRole(role));
      if (!hasRequiredRole) return false;
    }
    
    return true;
  });

  const staffViewToggle = hasStaffAdminAccess ? (
    <ToggleGroup
      type="single"
      value={adminViewMode}
      onValueChange={(v) => {
        if (v === "student" || v === "admin") setAdminViewMode(v);
      }}
      variant="outline"
      size="sm"
      className="shrink-0 flex"
    >
      <ToggleGroupItem value="student" aria-label="Student view" className="px-2.5 md:px-3">
        <GraduationCap className="w-4 h-4 shrink-0" />
        <span className="ml-1.5 hidden md:inline">Student</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="admin" aria-label="Admin view" className="px-2.5 md:px-3">
        <Crown className="w-4 h-4 shrink-0" />
        <span className="ml-1.5 hidden md:inline">Admin</span>
      </ToggleGroupItem>
    </ToggleGroup>
  ) : null;

  return (
    <nav className="bg-card border-b border-border">
      <div className={adminMinimalHeader ? "max-w-[1600px] mx-auto px-8" : "max-w-7xl mx-auto px-8"}>
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <Link to={logoTo} className="text-xl font-bold text-foreground shrink-0">
              Mortar
            </Link>
            {adminMinimalHeader && staffViewToggle}
            {showStudentNavLinks && (
              <div className="flex items-center gap-1 flex-wrap min-w-0">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isAdminNavItem = item.path === "/admin/auth";
                  const isActive =
                    location.pathname === item.path ||
                    (item.path === "/dashboard" && location.pathname === "/") ||
                    (isAdminNavItem && location.pathname.startsWith("/admin"));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() =>
                        trackEvent(WEB_ANALYTICS_EVENTS.NAV_LINK_CLICKED, {
                          path: item.path,
                          label: item.label,
                        })
                      }
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4 shrink-0">
              {showStudentNavLinks && hasStaffAdminAccess && staffViewToggle}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={n.read ? "opacity-75" : ""}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{n.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                          <span className="text-xs text-muted-foreground">
                            {n.createdAt && typeof (n.createdAt as { toDate?: () => Date }).toDate === "function"
                              ? formatDistanceToNow((n.createdAt as { toDate: () => Date }).toDate(), { addSuffix: true })
                              : ""}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                  {notifications.length > 0 && (
                    <DropdownMenuItem onClick={() => { setNotificationsOpen(false); navigate("/data-room"); }}>
                      View Data Room
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu
                open={cartOpen}
                onOpenChange={(open) => {
                  setCartOpen(open);
                  trackEvent(WEB_ANALYTICS_EVENTS.CART_DROPDOWN_TOGGLED, { open });
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                    {itemCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
                        {itemCount > 9 ? "9+" : itemCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96">
                  {cart.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">Cart is empty</div>
                  ) : (
                    <div className="p-4">
                      <div className="space-y-3">
                        {cart.map((line) => (
                          <div
                            key={`${line.itemId}__${line.size ?? ""}`}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">{line.name}</div>
                              {line.size && <div className="text-xs text-muted-foreground">{line.size}</div>}
                              <div className="text-xs text-muted-foreground">
                                Qty {line.quantity} · ${Number(line.price).toFixed(2)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={async () => {
                                if (!api) return;
                                await releaseStock({
                                  itemId: line.itemId,
                                  size: line.size,
                                  quantity: line.quantity,
                                  category: line.category,
                                }).catch(console.error);
                                api.removeLine({ itemId: line.itemId, size: line.size });
                                trackEvent(WEB_ANALYTICS_EVENTS.CART_LINE_REMOVE_CLICKED, {
                                  item_id: line.itemId,
                                });
                              }}
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-semibold">
                            $
                            {cart
                              .reduce((sum, l) => sum + l.quantity * l.price, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                        <Button
                          className="w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                          onClick={() => {
                            trackEvent(WEB_ANALYTICS_EVENTS.CART_CONTINUE_TO_SHOP_CLICKED, {});
                            setCartOpen(false);
                            navigate("/shop");
                          }}
                        >
                          Continue Shopping
                        </Button>
                      </div>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {user.displayName || user.email || "User"}
                </p>
                {user.email ? (
                  <button
                    type="button"
                    onClick={() => setBadgeSuiteOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-2 block w-full text-right mt-0.5"
                    title="View badges"
                  >
                    {user.email}
                  </button>
                ) : null}
              </div>
              <UserBadgeSuiteDialog
                open={badgeSuiteOpen}
                onOpenChange={setBadgeSuiteOpen}
                userId={user.uid}
                accountLabel={user.email ?? user.displayName ?? undefined}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2 border-border text-foreground hover:bg-muted"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
