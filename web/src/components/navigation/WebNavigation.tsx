"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FolderOpen, Users, BarChart3 } from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/curriculum", label: "Curriculum", icon: BookOpen },
  { path: "/data-room", label: "Data Room", icon: FolderOpen },
  { path: "/community", label: "Community Hub", icon: Users },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
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
        </div>
      </div>
    </nav>
  );
}
