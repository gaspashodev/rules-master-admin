import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/hooks/useStats';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import {
  Gamepad2,
  Star,
  TrendingUp,
  Eye,
  EyeOff,
  Dices,
  Layers,
} from 'lucide-react';

const TCG_COLORS = ['#facc15', '#7c3aed', '#3b82f6', '#ec4899']; // Pokémon, Yu-Gi-Oh, Lorcana, Magic

export function DashboardPage() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre contenu Rules Master</p>
      </div>

      {/* Stats principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Règles de jeux</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGames || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {stats?.publishedGames || 0} publiées
              </span>
              <span className="flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> {stats?.draftGames || 0} brouillons
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Règle en vedette</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.featuredGames || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalConcepts || 0} concepts • {stats?.totalSections || 0} sections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jeux BGG</CardTitle>
            <Dices className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBggGames?.toLocaleString('fr-FR') || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Dans le cache BGG</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cartes TCG</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTcgCards?.toLocaleString('fr-FR') || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pokémon, Yu-Gi-Oh, Lorcana, Magic</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques - Répartitions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Évolution du contenu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution du contenu
            </CardTitle>
            <CardDescription>Règles et concepts créés par mois</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.contentOverTime && stats.contentOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.contentOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="games"
                    name="Règles"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="concepts"
                    name="Concepts"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142 76% 36%)' }}
                  />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Pas encore de données
              </div>
            )}
          </CardContent>
        </Card>

        {/* Répartition des cartes TCG */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des cartes TCG</CardTitle>
            <CardDescription>Cartes par jeu de cartes à collectionner</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.cardsByTcgType && stats.cardsByTcgType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.cardsByTcgType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="name"
                    label={({ value }) => {
                      const total = stats.cardsByTcgType.reduce((sum, t) => sum + t.count, 0);
                      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return value > 0 ? `${percent}%` : '';
                    }}
                    labelLine={false}
                  >
                    {stats.cardsByTcgType.map((_, index) => (
                      <Cell key={`cell-tcg-${index}`} fill={TCG_COLORS[index % TCG_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => {
                      const total = stats.cardsByTcgType.reduce((sum, t) => sum + t.count, 0);
                      const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                      return `${value.toLocaleString('fr-FR')} (${percent}%)`;
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucune carte importée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Règles récentes */}
      <Card>
        <CardHeader>
          <CardTitle>Règles Récentes</CardTitle>
          <CardDescription>Les dernières règles de jeux ajoutées</CardDescription>
        </CardHeader>
        <CardContent>
          {!stats?.recentGames || stats.recentGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Gamepad2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Aucune règle pour le moment</p>
              <Link to="/games/new" className="text-primary text-sm mt-2 hover:underline">
                Créer votre première règle
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stats.recentGames.map((game) => (
                <Link
                  key={game.id}
                  to={`/games/${game.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  {game.cover_image_url ? (
                    <img
                      src={game.cover_image_url}
                      alt={game.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gamepad2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{game.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {game.concept_count} concepts
                      </span>
                      {game.published ? (
                        <Badge variant="success" className="text-xs">
                          Publié
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Brouillon
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}