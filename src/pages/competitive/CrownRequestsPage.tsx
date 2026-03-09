import { useQuery } from '@tanstack/react-query';
import { Crown, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';

interface CrownRequest {
  id: string;
  bgg_id: number;
  name: string;
  name_fr: string | null;
  image_url: string | null;
  crown_request_count: number;
  year_published: number | null;
}

function useCrownRequests() {
  return useQuery({
    queryKey: ['crown-requests'],
    queryFn: async (): Promise<CrownRequest[]> => {
      const { data, error } = await supabase
        .from('bgg_games_cache')
        .select('id, bgg_id, name, name_fr, image_url, crown_request_count, year_published')
        .gt('crown_request_count', 0)
        .order('crown_request_count', { ascending: false });
      if (error) throw error;
      return (data || []) as CrownRequest[];
    },
  });
}

export function CrownRequestsPage() {
  const { data: requests, isLoading } = useCrownRequests();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Crown className="h-7 w-7 text-yellow-500" />
          Demandes d'ajout à La Couronne
        </h1>
        <p className="text-muted-foreground">
          Jeux demandés par les joueurs pour être ajoutés au mode compétitif
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isLoading ? '…' : `${requests?.length ?? 0} jeu${(requests?.length ?? 0) > 1 ? 'x' : ''} demandé${(requests?.length ?? 0) > 1 ? 's' : ''}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : !requests?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune demande pour le moment
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                <span className="w-10 text-center">#</span>
                <span>Jeu</span>
                <span className="w-28 text-center">Demandes</span>
                <span className="w-12 text-center">BGG</span>
              </div>
              {requests.map((game, index) => (
                <div key={game.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/50 transition-colors">
                  <span className="w-10 text-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-3 min-w-0">
                    {game.image_url ? (
                      <img src={game.image_url} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted shrink-0 flex items-center justify-center">
                        <Crown className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{game.name_fr || game.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {game.name_fr ? game.name : ''}
                        {game.year_published ? ` · ${game.year_published}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="w-28 flex justify-center">
                    <Badge variant={game.crown_request_count >= 10 ? 'destructive' : game.crown_request_count >= 5 ? 'warning' : 'secondary'}>
                      {game.crown_request_count} demande{game.crown_request_count > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="w-12 flex justify-center">
                    <a
                      href={`https://boardgamegeek.com/boardgame/${game.bgg_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="Voir sur BGG"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
