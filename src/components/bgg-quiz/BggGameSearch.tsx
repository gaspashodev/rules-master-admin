import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchBggGames, type BggGameCache } from '@/hooks/useBggQuiz';
import { Search, X, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddGameDialog } from './AddGameDialog';

interface BggGameSearchProps {
  value: { bgg_id: number; name: string };
  onChange: (game: { bgg_id: number; name: string }) => void;
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: games, isLoading } = useSearchBggGames(searchTerm);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectGame = (game: BggGameCache) => {
    onChange({ bgg_id: game.id, name: game.name });
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ bgg_id: 0, name: '' });
    setSearchTerm('');
  };

  const handleGameCreated = (game: { bgg_id: number; name: string }) => {
    onChange(game);
    setSearchTerm('');
    setIsOpen(false);
  };

  const openAddDialog = () => {
    setIsOpen(false);
    setIsAddDialogOpen(true);
  };

  // Dialog for adding a new game
  const addGameDialog = (
    <AddGameDialog
      open={isAddDialogOpen}
      onOpenChange={setIsAddDialogOpen}
      initialName={searchTerm}
      onGameCreated={handleGameCreated}
    />
  );

  // If a game is selected, show the selection
  if (value.name && value.bgg_id > 0) {
    return (
      <>
        <div className={cn('flex items-center gap-2', className)}>
          <div className="flex-1 p-2 border rounded-md bg-muted/50">
            <span className="font-medium">{value.name}</span>
            <span className="text-muted-foreground ml-2 text-sm">#{value.bgg_id}</span>
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
        {addGameDialog}
      </>
    );
  }

  return (
    <>
      <div ref={containerRef} className={cn('relative', className)}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
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
          <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-popover border rounded-md shadow-lg">
            {isLoading ? (
              <div className="p-3 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Recherche...
              </div>
            ) : games && games.length > 0 ? (
              <ul className="py-1">
                {games.map((game) => (
                  <li key={game.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-muted"
                      onClick={() => handleSelectGame(game)}
                    >
                      <p className="font-medium truncate">{game.name}</p>
                      <p className="text-xs text-muted-foreground">#{game.id}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-center text-muted-foreground">
                Aucun jeu trouvé
                <div className="flex justify-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openAddDialog}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter ce jeu à la base
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {addGameDialog}
    </>
  );
}
