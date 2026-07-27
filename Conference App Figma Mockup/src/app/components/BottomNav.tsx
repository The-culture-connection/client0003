import { Home, Users, Calendar, Compass, User } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/feed', icon: Calendar, label: 'Feed' },
  { path: '/groups', icon: Users, label: 'Groups' },
  { path: '/explore', icon: Compass, label: 'Explore' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="max-w-md mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-1 px-4 py-2 transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}