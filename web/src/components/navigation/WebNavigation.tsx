"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FolderOpen, Users, BarChart3, HelpCircle } from "lucide-react";
import { startTour } from "@/components/tour/DashboardTour";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, tour: "dashboard" },
  { path: "/curriculum", label: "Curriculum", icon: BookOpen, tour: "curriculum" },
  { path: "/data-room", label: "Data Room", icon: FolderOpen, tour: "data-room" },
  { path: "/community", label: "Community Hub", icon: Users, tour: "community" },
  { path: "/analytics", label: "Analytics", icon: BarChart3, tour: "analytics" },
];

export function WebNavigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-card border-b border-border" style={{ backgroundColor: 'var(--card)' }}>
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-foreground" style={{ color: 'var(--foreground)' }}>
              Mortar
            </Link>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path || 
                  (item.path === "/dashboard" && pathname === "/");
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    data-tour={`nav-${item.tour}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    style={isActive ? {} : { color: 'var(--muted-foreground)' }}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={() => startTour()}
            data-tour="help"
            title="Take a tour of the dashboard"
            aria-label="Take a tour of the dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Tour</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
