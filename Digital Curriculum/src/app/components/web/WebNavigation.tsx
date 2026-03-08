import { Link, useLocation, useNavigate } from "react-router";
import { LayoutDashboard, BookOpen, FolderOpen, Award, Users, BarChart3, LogOut, Shield, ShoppingBag } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../auth/AuthProvider";

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
    allowedRoles: ["superAdmin"], // Only superAdmin can see
  },
];

export function WebNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Filter navigation items based on user roles
  const userRoles = user?.roles || [];
  const navItems = allNavItems.filter((item) => {
    // If item has deniedRoles, check if user has any of them
    if (item.deniedRoles && item.deniedRoles.length > 0) {
      const hasDeniedRole = item.deniedRoles.some((role) => userRoles.includes(role));
      if (hasDeniedRole) return false;
    }
    
    // If item has allowedRoles, check if user has at least one
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      const hasAllowedRole = item.allowedRoles.some((role) => userRoles.includes(role));
      if (!hasAllowedRole) return false;
    }
    
    // Legacy support: if item has roles (old prop name), treat as allowedRoles
    if (item.roles && item.roles.length > 0) {
      const hasRequiredRole = item.roles.some((role) => userRoles.includes(role));
      if (!hasRequiredRole) return false;
    }
    
    return true;
  });

  return (
    <nav className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold text-foreground">
              Mortar
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path === "/dashboard" && location.pathname === "/");
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
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
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {user.displayName || user.email || "User"}
                </p>
                {user.email && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
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
