import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useGames } from '@/hooks/useGames';
import { Gamepad2, BookOpen, HelpCircle, Star, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { data: games, isLoading } = useGames();

  const stats = {
    totalGames: games?.length || 0,
    publishedGames: games?.filter(g => g.published).length || 0,
    totalConcepts: games?.reduce((acc, g) => acc + (g.concept_count || 0), 0) || 0,
    totalQuizzes: games?.reduce((acc, g) => acc + (g.quiz_count || 0), 0) || 0,
  };

  const featuredGames = games?.filter(g => g.featured) || [];
  const recentGames = games?.slice(0, 5) || [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre contenu Rules Master</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jeux Total</CardTitle>
            <Gamepad2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{stats.totalGames}</div>
                <p className="text-xs text-muted-foreground">{stats.publishedGames} publiés</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concepts</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{stats.totalConcepts}</div>
                <p className="text-xs text-muted-foreground">Leçons disponibles</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quiz</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
                <p className="text-xs text-muted-foreground">Quiz créés</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Vedette</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{featuredGames.length}</div>
                <p className="text-xs text-muted-foreground">Jeux mis en avant</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Jeux Récents</CardTitle>
            <CardDescription>Les derniers jeux ajoutés</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentGames.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Aucun jeu pour le moment</p>
                <Link to="/games/new" className="text-primary text-sm mt-2 hover:underline">
                  Créer votre premier jeu
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentGames.map(game => (
                  <Link
                    key={game.id}
                    to={`/games/${game.id}`}
                    className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    {game.cover_image_url ? (
                      <img src={game.cover_image_url} alt={game.name} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gamepad2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{game.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{game.concept_count || 0} concepts</span>
                        {game.published ? (
                          <Badge variant="success" className="text-xs">Publié</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Brouillon</Badge>
                        )}
                      </div>
                    </div>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}