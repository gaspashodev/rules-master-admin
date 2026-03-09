import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useStats, useDashboardCharts, buildActivityData } from '@/hooks/useStats';
import type { ActivityRange } from '@/hooks/useStats';
import { MATCH_STATUS_CONFIG } from '@/types/competitive';
import type { MatchStatus } from '@/types/competitive';
import {
  Dices,
  CalendarDays,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
};

const STATUS_COLORS: Record<string, string> = {
  lobby: '#94a3b8',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

const GAME_TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b'];

const RANGE_OPTIONS: { value: ActivityRange; label: string }[] = [
  { value: '30d', label: '30 jours' },
  { value: '3m', label: '3 mois' },
  { value: '12m', label: '12 mois' },
  { value: 'all', label: 'Tout' },
];

function formatLabel(label: string): string {
  const parts = label.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  return `${months[parseInt(parts[1]) - 1]} ${parts[0].slice(2)}`;
}

export function DashboardPage() {
  const { data: stats, isLoading } = useStats();
  const { data: chartData, isLoading: chartsLoading } = useDashboardCharts();
  const [activityRange, setActivityRange] = useState<ActivityRange>('12m');

  const activityData = useMemo(() => {
    if (!chartData) return [];
    return buildActivityData(chartData.eventDates, chartData.matchDates, activityRange);
  }, [chartData, activityRange]);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de Rules Master</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/quiz/games">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liste des jeux</CardTitle>
              <Dices className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBggGames?.toLocaleString('fr-FR') || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Dans le cache BGG</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/events">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Événements</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Événements créés</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/competitive/matches">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Matchs terminés</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completedCompetitiveMatches || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Matchs complétés</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/competitive/matches">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Joueurs actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activePlayers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Participants uniques</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activity chart */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium">Activité</CardTitle>
            <div className="flex gap-1">
              {RANGE_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={activityRange === opt.value ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => setActivityRange(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickFormatter={formatLabel}
                      fontSize={12}
                      interval={activityRange === '30d' ? 4 : activityRange === 'all' ? 2 : undefined}
                    />
                    <YAxis allowDecimals={false} fontSize={12} />
                    <Tooltip labelFormatter={formatLabel} contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="events" name="Événements" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="matches" name="Matchs compétitifs" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events by city */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Événements par ville (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.eventsByCity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis dataKey="city" type="category" width={120} fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Événements" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by city */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Villes les plus représentées (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData?.usersByCity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} fontSize={12} />
                    <YAxis dataKey="city" type="category" width={120} fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Utilisateurs" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches by status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Matchs par statut</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData?.matchesByStatus}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ count }) => count}
                    >
                      {chartData?.matchesByStatus.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.status] || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend formatter={(value: string) => MATCH_STATUS_CONFIG[value as MatchStatus]?.label || value} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events by game type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Répartition des événements par type</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData?.eventsByGameType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ count }) => count}
                    >
                      {chartData?.eventsByGameType.map((_, i) => (
                        <Cell key={i} fill={GAME_TYPE_COLORS[i % GAME_TYPE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
