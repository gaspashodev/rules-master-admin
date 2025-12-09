import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Gamepad2,
  Settings,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Jeux', href: '/games', icon: Gamepad2 },
];

const secondaryNavigation = [
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-full flex-col bg-card border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          R
        </div>
        <div>
          <h1 className="font-semibold text-foreground">Rules Master</h1>
          <p className="text-xs text-muted-foreground">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Contenu
        </p>
        {navigation.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        <Separator className="my-4" />

        <p className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Système
        </p>
        {secondaryNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}