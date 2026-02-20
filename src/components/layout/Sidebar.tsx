import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Settings,
  ListTodo,
  Trophy,
  Dices,
  CalendarDays,
  Swords,
  MapPin,
  Medal,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Liste des jeux', href: '/quiz/games', icon: Dices },
];

const quizNavigation = [
  { name: 'Toutes les questions', href: '/quiz/questions', icon: ListTodo },
  { name: 'Prix & Récompenses', href: '/quiz/awards', icon: Trophy },
];

const eventsNavigation = [
  { name: 'Événements', href: '/events', icon: CalendarDays },
];

const competitiveNavigation = [
  { name: 'Matchs compétitifs', href: '/competitive/matches', icon: Swords },
  { name: 'Villes & Saisons', href: '/competitive/cities-seasons', icon: MapPin },
];

const tournamentNavigation = [
  { name: 'Tournois perso.', href: '/tournament/templates', icon: Medal },
];

const usersNavigation = [
  { name: 'Gestion joueurs', href: '/users', icon: Users },
];

const moderationNavigation = [
  { name: 'Contestations & Signalements', href: '/moderation', icon: ShieldAlert },
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
          Général
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
          Quiz BGG
        </p>
        {quizNavigation.map((item) => {
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
          Événements
        </p>
        {eventsNavigation.map((item) => {
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
          La Couronne
        </p>
        {competitiveNavigation.map((item) => {
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
          Tournois
        </p>
        {tournamentNavigation.map((item) => {
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
          Utilisateurs
        </p>
        {usersNavigation.map((item) => {
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
          Modération
        </p>
        {moderationNavigation.map((item) => {
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
