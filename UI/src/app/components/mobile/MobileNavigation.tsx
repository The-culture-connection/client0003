import { Link, useLocation } from "react-router";
import { Home, Users, Calendar, Compass, User } from "lucide-react";

const navItems = [
  { path: "/mobile/feed", label: "Feed", icon: Home },
  { path: "/mobile/groups", label: "Groups", icon: Users },
  { path: "/mobile/events", label: "Events", icon: Calendar },
  { path: "/mobile/explore", label: "Explore", icon: Compass },
  { path: "/mobile/profile", label: "Profile", icon: User },
];

export function MobileNavigation() {
  const location = useLocation();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-card border-b border-border z-10">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-lg font-bold text-foreground">Mortar</h1>
          <Link
            to="/dashboard"
            className="text-xs text-accent hover:text-accent/90"
          >
            Web App →
          </Link>
        </div>
      </div>
      
      <div className="h-14" />

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-10">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
