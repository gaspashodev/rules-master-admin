import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchBggGames, useFetchBggData, type BggGameCache } from '@/hooks/useBggQuiz';
import { Search, X, Loader2, Plus, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SelectedGame {
  id: string; // UUID from bgg_games_cache
  bgg_id: number;
  name: string;
}

interface BggGameSearchProps {
  value: SelectedGame | null;
  onChange: (game: SelectedGame | null) => void;
  placeholder?: string;
  className?: string;
}

export function BggGameSearch({
  value,
  onChange,
  placeholder = 'Rechercher un jeu...',
  className,
}: BggGameSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddById, setShowAddById] = useState(false);
  const [bggIdInput, setBggIdInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: games, isLoading } = useSearchBggGames(searchTerm);
  const fetchBggData = useFetchBggData();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddById(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectGame = (game: BggGameCache) => {
    onChange({ id: game.id, bgg_id: game.bgg_id, name: game.name });
    setSearchTerm('');
    setIsOpen(false);
    setShowAddById(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
  };

  const handleAddByBggId = async () => {
    const bggId = parseInt(bggIdInput);
    if (!bggId || bggId <= 0) {
      toast.error('Veuillez entrer un ID BGG valide');
      return;
    }

    try {
      const result = await fetchBggData.mutateAsync({ ids: [bggId] });
      if (result.inserted > 0 || result.updated > 0) {
        // Fetch the game data to get the id and name
        // We need to wait a bit for the cache to be invalidated
        setTimeout(async () => {
          // Search for the game we just added
          const { data } = await import('@/lib/supabase').then(m => m.supabase)
            .from('bgg_games_cache')
            .select('id, bgg_id, name')
            .eq('bgg_id', bggId)
            .single();

          if (data) {
            onChange({ id: data.id, bgg_id: data.bgg_id, name: data.name });
            setBggIdInput('');
            setShowAddById(false);
            setIsOpen(false);
          }
        }, 500);
      } else if (result.errors?.length > 0) {
        toast.error(`Erreur: ${result.errors[0]}`);
      } else {
        toast.error('Jeu non trouvé sur BGG');
      }
    } catch {
      // Error already handled by mutation
    }
  };

  // If a game is selected, show the selection
  if (value?.id) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 p-2 border rounded-md bg-muted/50">
          <span className="font-medium">{value.name}</span>
          <span className="text-muted-foreground ml-2 text-sm">BGG #{value.bgg_id}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          title="Supprimer"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setShowAddById(false);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && searchTerm.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 max-h-72 overflow-auto bg-popover border rounded-md shadow-lg">
          {isLoading ? (
            <div className="p-3 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Recherche...
            </div>
          ) : games && games.length > 0 ? (
            <>
              <ul className="py-1">
                {games.map((game) => (
                  <li key={game.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => handleSelectGame(game)}
                    >
                      <p className="font-medium truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground">BGG #{game.bgg_id}</p>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={() => setShowAddById(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter un autre jeu par ID BGG
                </Button>
              </div>
            </>
          ) : showAddById ? (
            <div className="p-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Entrez l'ID BGG du jeu (visible dans l'URL sur boardgamegeek.com)
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  value={bggIdInput}
                  onChange={(e) => setBggIdInput(e.target.value)}
                  placeholder="Ex: 174430"
                  className="flex-1"
                  autoFocus
                />
                {bggIdInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    asChild
                  >
                    <a
                      href={`https://boardgamegeek.com/boardgame/${bggIdInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Vérifier sur BGG"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <Button
                type="button"
                onClick={handleAddByBggId}
                disabled={fetchBggData.isPending || !bggIdInput}
                className="w-full"
              >
                {fetchBggData.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Récupération depuis BGG...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter depuis BGG
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-3 text-center text-muted-foreground">
              Aucun jeu trouvé
              <div className="flex justify-center mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddById(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter par ID BGG
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
