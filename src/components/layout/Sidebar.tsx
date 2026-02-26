import { useState } from 'react';
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
  Star,
  Megaphone,
  Vote,
  Image,
  type LucideIcon,
} from 'lucide-react';

/* ── Navigation data ──────────────────────────────────────────── */

interface NavChild {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string;
  icon: LucideIcon;
  href?: string;         // direct link if no children
  children?: NavChild[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/',
  },
  {
    label: 'Liste des jeux',
    icon: Dices,
    href: '/quiz/games',
  },
  {
    label: 'Quiz BGG',
    icon: ListTodo,
    children: [
      { name: 'Toutes les questions', href: '/quiz/questions', icon: ListTodo },
      { name: 'Quizzes perso.', href: '/quiz/featured', icon: Star },
      { name: 'Prix & Récompenses', href: '/quiz/awards', icon: Trophy },
    ],
  },
  {
    label: 'Événements',
    icon: CalendarDays,
    href: '/events',
  },
  {
    label: 'La Couronne',
    icon: Swords,
    children: [
      { name: 'Matchs compétitifs', href: '/competitive/matches', icon: Swords },
      { name: 'Villes & Saisons', href: '/competitive/cities-seasons', icon: MapPin },
    ],
  },
  {
    label: 'Tournois',
    icon: Medal,
    href: '/tournament/templates',
  },
  {
    label: 'Utilisateurs',
    icon: Users,
    href: '/users',
  },
  {
    label: 'Modération',
    icon: ShieldAlert,
    href: '/moderation',
  },
  {
    label: 'Galerie',
    icon: Image,
    href: '/gallery',
  },
  {
    label: 'Contenu',
    icon: Megaphone,
    children: [
      { name: 'Diffusion', href: '/broadcast', icon: Megaphone },
      { name: 'Sondages', href: '/polls', icon: Vote },
    ],
  },
  {
    label: 'Paramètres',
    icon: Settings,
    href: '/settings',
  },
];

/* ── Sidebar ──────────────────────────────────────────────────── */

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
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {NAV_SECTIONS.map((section) =>
          section.children ? (
            <FlyoutItem key={section.label} section={section} pathname={location.pathname} />
          ) : (
            <DirectLink key={section.label} section={section} pathname={location.pathname} />
          ),
        )}
      </nav>
    </div>
  );
}

/* ── Direct link (no children) ────────────────────────────────── */

function DirectLink({ section, pathname }: { section: NavSection; pathname: string }) {
  const isActive =
    pathname === section.href ||
    (section.href !== '/' && section.href && pathname.startsWith(section.href));

  return (
    <Link
      to={section.href!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      <section.icon className="h-4.5 w-4.5" />
      {section.label}
    </Link>
  );
}

/* ── Expandable item (children revealed on hover) ─────────────── */

function FlyoutItem({ section, pathname }: { section: NavSection; pathname: string }) {
  const [open, setOpen] = useState(false);

  const isChildActive = section.children?.some(
    (child) => pathname === child.href || pathname.startsWith(child.href + '/'),
  );

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Parent button */}
      <button
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left',
          isChildActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )}
      >
        <section.icon className="h-4.5 w-4.5" />
        {section.label}
        <svg
          className={cn('ml-auto h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Inline sub-items */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          open ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <div className="ml-4 pl-3 border-l border-border/50 space-y-0.5 py-1">
          {section.children!.map((child) => {
            const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
            return (
              <Link
                key={child.href}
                to={child.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <child.icon className="h-3.5 w-3.5" />
                {child.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
