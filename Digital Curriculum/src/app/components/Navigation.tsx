import { Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  Award, 
  MessageSquare, 
  Calendar, 
  ShoppingBag,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { currentUser, hasPermission } from "../lib/store";
import { Button } from "./ui/button";
import { useState } from "react";

export function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const mainLinks = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/curriculum", label: "Curriculum", icon: BookOpen },
    { path: "/dataroom", label: "Data Room", icon: FileText },
    { path: "/certificates", label: "Certificates", icon: Award },
    { path: "/discussion", label: "Discussion", icon: MessageSquare },
    { path: "/events", label: "Events", icon: Calendar },
    { path: "/store", label: "Store", icon: ShoppingBag },
  ];

  const adminLinks = hasPermission(currentUser.role, "canManageUsers")
    ? [{ path: "/admin", label: "Admin", icon: Settings }]
    : [];

  const allLinks = [...mainLinks, ...adminLinks];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex bg-primary text-primary-foreground h-16 px-6 items-center justify-between border-b border-border shadow-sm">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
              <span className="font-bold text-sm">MM</span>
            </div>
            <span className="font-bold text-lg">MORTAR MASTERS</span>
          </Link>
          
          <div className="flex gap-1">
            {allLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isActive(link.path)
                    ? "bg-secondary text-secondary-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <link.icon className="w-4 h-4" />
                <span className="text-sm">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.points} points</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-sidebar-accent">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden bg-primary text-primary-foreground border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
              <span className="font-bold text-sm">MM</span>
            </div>
            <span className="font-bold">MORTAR MASTERS</span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-primary-foreground"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border bg-primary">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">{currentUser.name}</p>
              <p className="text-sm text-muted-foreground">{currentUser.points} points</p>
            </div>
            <div className="py-2">
              {allLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    isActive(link.path)
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-sidebar-accent"
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              ))}
              <button className="flex items-center gap-3 px-4 py-3 w-full hover:bg-sidebar-accent transition-colors">
                <LogOut className="w-5 h-5" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
