import { Link, useLocation } from "react-router";
import { Home, Users, Calendar, Compass, User } from "lucide-react";

const navItems = [
  { path: "/mobile", label: "Feed", icon: Home },
  { path: "/mobile/groups", label: "Groups", icon: Users },
  { path: "/mobile/events", label: "Events", icon: Calendar },
  { path: "/mobile/explore", label: "Explore", icon: Compass },
  { path: "/mobile/profile", label: "Profile", icon: User },
];

export function MobileNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border max-w-md mx-auto">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 flex-1"
            >
              <Icon
                className={`w-6 h-6 ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-xs ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
