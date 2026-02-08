import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useGames, useDeleteGame, useToggleGamePublished, useToggleGameFeatured } from '@/hooks/useGames';
import { Plus, Gamepad2, Users, Clock, Star, Pencil, Trash2 } from 'lucide-react';

export function GamesListPage() {
  const { data: games, isLoading } = useGames();
  const deleteGame = useDeleteGame();
  const togglePublished = useToggleGamePublished();
  const toggleFeatured = useToggleGameFeatured();

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return <Badge variant="success">Débutant</Badge>;
      case 'intermediate':
        return <Badge variant="warning">Intermédiaire</Badge>;
      case 'expert':
        return <Badge variant="destructive">Expert</Badge>;
      default:
        return <Badge variant="secondary">{difficulty}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-72 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jeux</h1>
          <p className="text-muted-foreground">{games?.length || 0} jeux au total</p>
        </div>
        <Button asChild>
          <Link to="/games/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau jeu
          </Link>
        </Button>
      </div>

      {games?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <Gamepad2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucun jeu</h2>
          <p className="text-muted-foreground mb-6">Commencez par créer votre premier jeu</p>
          <Button asChild>
            <Link to="/games/new">
              <Plus className="h-4 w-4 mr-2" />
              Créer un jeu
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games?.map(game => (
            <div
              key={game.id}
              className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Cover Image */}
              <div className="relative aspect-video bg-muted">
                {game.cover_image_url ? (
                  <img
                    src={game.cover_image_url}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}

                {/* Featured Badge */}
                {game.featured && (
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-yellow-500 text-white">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Vedette
                    </Badge>
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" asChild>
                    <Link to={`/games/${game.id}`}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Éditer
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer ce jeu ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action est irréversible. Tous les concepts et quiz associés seront également supprimés.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteGame.mutate(game.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{game.name}</h3>
                
                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {game.player_count_min}-{game.player_count_max}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {game.play_time_min}-{game.play_time_max}'
                  </span>
                  {game.bgg_rating && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {game.bgg_rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-2 mb-4">
                  {getDifficultyBadge(game.difficulty)}
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={game.published}
                      onCheckedChange={(checked) => togglePublished.mutate({ id: game.id, published: checked })}
                    />
                    <span className="text-sm text-muted-foreground">Publié</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={game.featured}
                      onCheckedChange={(checked) => toggleFeatured.mutate({ id: game.id, featured: checked })}
                    />
                    <span className="text-sm text-muted-foreground">Vedette</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}