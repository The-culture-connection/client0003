import { Link, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, FolderOpen, Award, Calendar, BarChart3, Smartphone } from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/curriculum", label: "Curriculum", icon: BookOpen },
  { path: "/quizzes", label: "Quizzes", icon: FileText },
  { path: "/data-room", label: "Data Room", icon: FolderOpen },
  { path: "/certificates", label: "Certificates & Badges", icon: Award },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/mobile", label: "Mobile App", icon: Smartphone },
];

export function WebNavigation() {
  const location = useLocation();

  return (
    <nav className="w-64 border-r border-border bg-card fixed left-0 top-0 bottom-0 overflow-y-auto">
      <div className="p-6">
        <h1 className="text-xl text-foreground mb-1">Mortar</h1>
        <p className="text-sm text-muted-foreground">Learning Platform</p>
      </div>
      <div className="px-3 pb-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
