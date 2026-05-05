import { Link, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FolderOpen, Award, Users, BarChart3, User } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/curriculum", label: "Curriculum", icon: BookOpen },
  { path: "/data-room", label: "Data Room", icon: FolderOpen },
  { path: "/community", label: "Community Hub", icon: Users },
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function WebNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  const userInitials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

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

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative h-9 w-9 rounded-full hover:opacity-80 transition-opacity">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-[#871002] text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/mobile/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}