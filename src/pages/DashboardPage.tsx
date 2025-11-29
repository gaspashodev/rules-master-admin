import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useStats } from '@/hooks/useStats';
import {
  BarChart,
  Bar,
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
  BookOpen,
  HelpCircle,
  Star,
  Plus,
  FileText,
  TrendingUp,
  Eye,
  EyeOff,
} from 'lucide-react';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

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
            <CardTitle className="text-sm font-medium">Jeux Total</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGames || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {stats?.publishedGames || 0} publiés
              </span>
              <span className="flex items-center gap-1">
                <EyeOff className="h-3 w-3" /> {stats?.draftGames || 0} brouillons
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concepts</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConcepts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalSections || 0} sections au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalQuizzes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalQuestions || 0} questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Vedette</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.featuredGames || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Jeux mis en avant</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Évolution du contenu */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution du contenu
            </CardTitle>
            <CardDescription>Jeux et concepts créés par mois</CardDescription>
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
                    name="Jeux"
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

        {/* Répartition par difficulté */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par difficulté</CardTitle>
            <CardDescription>Nombre de jeux par niveau</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.gamesByDifficulty && stats.totalGames > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.gamesByDifficulty}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="difficulty"
                    label={({ name, value }) => (value && value > 0 ? `${name || ''}: ${value}` : '')}
                    labelLine={false}
                  >
                    {stats.gamesByDifficulty.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Aucun jeu pour le moment
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Jeux récents et actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jeux Récents</CardTitle>
            <CardDescription>Les derniers jeux ajoutés</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentGames || stats.recentGames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Aucun jeu pour le moment</p>
                <Link to="/games/new" className="text-primary text-sm mt-2 hover:underline">
                  Créer votre premier jeu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentGames.map((game) => (
                  <Link
                    key={game.id}
                    to={`/games/${game.id}`}
                    className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors"
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
                    <span className="text-xs text-muted-foreground">
                      {new Date(game.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/games/new"
                className="flex items-center gap-4 p-4 rounded-lg border border-dashed hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Nouveau Jeu</p>
                  <p className="text-sm text-muted-foreground">Ajouter un jeu de société</p>
                </div>
              </Link>

              <Link
                to="/games"
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Gérer les Jeux</p>
                  <p className="text-sm text-muted-foreground">
                    Voir et modifier tous les jeux
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Statistiques détaillées</p>
                  <p className="text-sm text-muted-foreground">Bientôt disponible</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé en barres */}
      {stats && stats.totalGames > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contenu par jeu</CardTitle>
            <CardDescription>Nombre de concepts par jeu (top 10)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.recentGames.slice(0, 10)}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={150}
                  className="text-xs"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="concept_count" name="Concepts" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}