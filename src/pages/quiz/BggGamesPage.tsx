import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  useBggGames,
  useUpdateBggGame,
  useDeleteBggGame,
  useFetchBggData,
  useRegenerateDescription,
  type BggGameCacheFull,
  type BggGameCacheInsert,
} from '@/hooks/useBggQuiz';
import { Switch } from '@/components/ui/switch';
import { Pagination } from '@/components/ui/pagination';
import { Search, Edit2, Trash2, ExternalLink, RefreshCw, Plus, Loader2, Sparkles, HelpCircle, Crown, Swords, Users, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

type SortOption = 'name-asc' | 'created_at-desc' | 'rating-desc' | 'rank-asc';

export function BggGamesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('created_at-desc');
  const [editingGame, setEditingGame] = useState<BggGameCacheFull | null>(null);
  const [showAddByIdDialog, setShowAddByIdDialog] = useState(false);
  const [crownOnly, setCrownOnly] = useState(false);

  // Parse sort option
  const [sortBy, sortOrder] = sortOption.split('-') as ['name' | 'created_at' | 'rating' | 'rank', 'asc' | 'desc'];

  const pageSize = 50;
  const { data, isLoading } = useBggGames({ search: debouncedSearch, page, pageSize, sortBy, sortOrder, crownOnly });
  const updateGame = useUpdateBggGame();
  const deleteGame = useDeleteBggGame();
  const fetchBggData = useFetchBggData();

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    // Simple debounce
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleDelete = async (game: BggGameCacheFull) => {
    if (!confirm(`Supprimer "${game.name}" ?`)) return;
    await deleteGame.mutateAsync(game.bgg_id);
  };

  const handleFetchHotList = async () => {
    await fetchBggData.mutateAsync({ useHotList: true });
  };

  const totalPages = data ? Math.ceil(data.count / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Liste des jeux</h1>
          <p className="text-muted-foreground">
            {data?.count || 0} jeux enregistrés dans la base
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddByIdDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter par ID
          </Button>
          <Button
            onClick={handleFetchHotList}
            disabled={fetchBggData.isPending}
          >
            {fetchBggData.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Nouvel appel BGG
          </Button>
        </div>
      </div>

      {/* Search & Sort */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un jeu..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={crownOnly ? 'default' : 'outline'}
              onClick={() => { setCrownOnly(!crownOnly); setPage(0); }}
              title="Filtrer les jeux éligibles à la Couronne"
              className="gap-2"
            >
              <Crown className="h-4 w-4" />
              Couronne
            </Button>
            <Select value={sortOption} onValueChange={(v) => { setSortOption(v as SortOption); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Plus récents</SelectItem>
                <SelectItem value="name-asc">Nom (A-Z)</SelectItem>
                <SelectItem value="rating-desc">Meilleure note</SelectItem>
                <SelectItem value="rank-asc">Meilleur rang</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Games list */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des jeux</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pagination top */}
          <div className="mb-4 pb-4 border-b">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <p className="text-center text-muted-foreground py-8">
              Aucun jeu trouvé
            </p>
          ) : (
            <div className="space-y-2">
              {data.data.map((game) => (
                <div
                  key={game.bgg_id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail */}
                  {game.image_url ? (
                    <img
                      src={game.image_url}
                      alt={game.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                      N/A
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{game.name_fr || game.name}</p>
                      {game.year_published && (
                        <span className="text-sm text-muted-foreground">
                          ({game.year_published})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>BGG ID: {game.bgg_id}</span>
                      {game.rating && <span>Note: {game.rating.toFixed(1)}</span>}
                      {game.rank && <span>Rank: #{game.rank}</span>}
                    </div>
                  </div>

                  {/* Status icons */}
                  <div className="flex items-center gap-1.5">
                    <HelpCircle
                      className={`h-4 w-4 ${game.quiz_enabled ? 'text-blue-500' : 'text-muted-foreground/30'}`}
                      title={game.quiz_enabled ? 'Quiz activé' : 'Quiz désactivé'}
                    />
                    <Crown
                      className={`h-4 w-4 ${game.crown_enabled ? 'text-yellow-500' : 'text-muted-foreground/30'}`}
                      title={game.crown_enabled ? 'Couronne activée' : 'Couronne désactivée'}
                    />
                    {game.crown_enabled && game.crown_modes && game.crown_modes.length > 0 && (
                      <div className="flex items-center gap-0.5 ml-0.5">
                        {game.crown_modes.includes('1v1') && (
                          <Swords className="h-3.5 w-3.5 text-yellow-500/70" title="1V1" />
                        )}
                        {game.crown_modes.includes('ffa') && (
                          <UsersRound className="h-3.5 w-3.5 text-yellow-500/70" title="FFA" />
                        )}
                        {game.crown_modes.includes('teams') && (
                          <Users className="h-3.5 w-3.5 text-yellow-500/70" title="Équipes" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`https://boardgamegeek.com/boardgame/${game.bgg_id}`, '_blank')}
                      title="Voir sur BGG"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingGame(game)}
                      title="Modifier"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(game)}
                      className="text-destructive hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-4 pt-4 border-t">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editingGame && (
        <EditGameDialog
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSave={async (data) => {
            await updateGame.mutateAsync({ bggId: editingGame.bgg_id, data });
            setEditingGame(null);
          }}
          isPending={updateGame.isPending}
        />
      )}

      {/* Add by ID dialog */}
      <AddByIdDialog
        open={showAddByIdDialog}
        onClose={() => setShowAddByIdDialog(false)}
        onSubmit={async (ids) => {
          await fetchBggData.mutateAsync({ ids });
          setShowAddByIdDialog(false);
        }}
        isPending={fetchBggData.isPending}
      />
    </div>
  );
}

function AddByIdDialog({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (ids: number[]) => Promise<void>;
  isPending: boolean;
}) {
  const [input, setInput] = useState('');

  const handleSubmit = async () => {
    // Parse IDs from input (comma or newline separated)
    const ids = input
      .split(/[,\n\s]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n > 0);

    if (ids.length === 0) {
      toast.error('Veuillez entrer au moins un ID valide');
      return;
    }

    await onSubmit(ids);
    setInput('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter des jeux par ID BGG</DialogTitle>
          <DialogDescription>
            Entrez les IDs BGG des jeux à ajouter (séparés par des virgules ou retours à la ligne).
            L'ID se trouve dans l'URL du jeu sur BGG (ex: boardgamegeek.com/boardgame/<strong>174430</strong>/gloomhaven)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>IDs BGG</Label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="174430, 224517, 167791&#10;ou un par ligne..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending || !input.trim()}>
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Ajouter
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditGameDialog({
  game,
  onClose,
  onSave,
  isPending,
}: {
  game: BggGameCacheFull;
  onClose: () => void;
  onSave: (data: Partial<BggGameCacheInsert>) => Promise<void>;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    name: game.name,
    name_fr: game.name_fr || '',
    year_published: game.year_published || '',
    image_url: game.image_url || '',
    description1: game.descriptions?.[0] || '',
    description2: game.descriptions?.[1] || '',
    designers: game.designers?.join(', ') || '',
    rating: game.rating || '',
    rank: game.rank || '',
    weight: game.weight || '',
    min_players: game.min_players || '',
    max_players: game.max_players || '',
    min_playtime: game.min_playtime || '',
    max_playtime: game.max_playtime || '',
    quiz_enabled: game.quiz_enabled ?? true,
    crown_enabled: game.crown_enabled ?? false,
    crown_modes: game.crown_modes ?? [],
  });

  const regenerateDescription = useRegenerateDescription();
  const [generatingType, setGeneratingType] = useState<1 | 2 | null>(null);

  const handleRegenerate = async (type: 1 | 2) => {
    setGeneratingType(type);
    try {
      const description = await regenerateDescription.mutateAsync({
        bggId: game.bgg_id,
        gameName: game.name,
        type,
      });
      if (type === 1) {
        setFormData(f => ({ ...f, description1: description }));
      } else {
        setFormData(f => ({ ...f, description2: description }));
      }
      toast.success(`Description ${type} régénérée`);
    } finally {
      setGeneratingType(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    // Build descriptions array
    const descriptions: string[] = [];
    if (formData.description1.trim()) descriptions.push(formData.description1.trim());
    if (formData.description2.trim()) descriptions.push(formData.description2.trim());

    const data: Partial<BggGameCacheInsert> = {
      name: formData.name.trim(),
      name_fr: formData.name_fr.trim() || null,
      year_published: formData.year_published ? Number(formData.year_published) : null,
      image_url: formData.image_url.trim() || null,
      descriptions: descriptions.length > 0 ? descriptions : null,
      designers: formData.designers ? formData.designers.split(',').map(d => d.trim()).filter(Boolean) : null,
      rating: formData.rating ? Number(formData.rating) : null,
      rank: formData.rank ? Number(formData.rank) : null,
      weight: formData.weight ? Number(formData.weight) : null,
      min_players: formData.min_players ? Number(formData.min_players) : null,
      max_players: formData.max_players ? Number(formData.max_players) : null,
      min_playtime: formData.min_playtime ? Number(formData.min_playtime) : null,
      max_playtime: formData.max_playtime ? Number(formData.max_playtime) : null,
      quiz_enabled: formData.quiz_enabled,
      crown_enabled: formData.crown_enabled,
      crown_modes: formData.crown_enabled && formData.crown_modes.length > 0 ? formData.crown_modes : null,
    };

    await onSave(data);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le jeu</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {formData.image_url && (
            <div className="flex justify-center">
              <img
                src={formData.image_url}
                alt={formData.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label>Nom *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Name FR */}
          <div className="space-y-2">
            <Label>Nom français</Label>
            <Input
              value={formData.name_fr}
              onChange={(e) => setFormData(f => ({ ...f, name_fr: e.target.value }))}
              placeholder="Laisser vide si identique au nom anglais"
            />
          </div>

          {/* Year & Image URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Année de publication</Label>
              <Input
                type="number"
                value={formData.year_published}
                onChange={(e) => setFormData(f => ({ ...f, year_published: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>URL Image</Label>
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(f => ({ ...f, image_url: e.target.value }))}
              />
            </div>
          </div>

          {/* Designers */}
          <div className="space-y-2">
            <Label>Designers (séparés par virgule)</Label>
            <Input
              value={formData.designers}
              onChange={(e) => setFormData(f => ({ ...f, designers: e.target.value }))}
              placeholder="Ex: Uwe Rosenberg, Jamey Stegmaier"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Note BGG</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.rating}
                onChange={(e) => setFormData(f => ({ ...f, rating: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Rang BGG</Label>
              <Input
                type="number"
                value={formData.rank}
                onChange={(e) => setFormData(f => ({ ...f, rank: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Poids</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData(f => ({ ...f, weight: e.target.value }))}
              />
            </div>
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Joueurs min</Label>
              <Input
                type="number"
                value={formData.min_players}
                onChange={(e) => setFormData(f => ({ ...f, min_players: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Joueurs max</Label>
              <Input
                type="number"
                value={formData.max_players}
                onChange={(e) => setFormData(f => ({ ...f, max_players: e.target.value }))}
              />
            </div>
          </div>

          {/* Playtime */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Durée min (min)</Label>
              <Input
                type="number"
                value={formData.min_playtime}
                onChange={(e) => setFormData(f => ({ ...f, min_playtime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Durée max (min)</Label>
              <Input
                type="number"
                value={formData.max_playtime}
                onChange={(e) => setFormData(f => ({ ...f, max_playtime: e.target.value }))}
              />
            </div>
          </div>

          {/* Quiz enabled */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Inclure dans les quiz</Label>
              <p className="text-sm text-muted-foreground">
                Ce jeu apparaîtra dans les quiz en front
              </p>
            </div>
            <Switch
              checked={formData.quiz_enabled}
              onCheckedChange={(checked) => setFormData(f => ({ ...f, quiz_enabled: checked }))}
            />
          </div>

          {/* Crown enabled */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Inclure dans la Couronne</Label>
                <p className="text-sm text-muted-foreground">
                  Ce jeu sera disponible dans le mode Couronne
                </p>
              </div>
              <Switch
                checked={formData.crown_enabled}
                onCheckedChange={(checked) => setFormData(f => ({ ...f, crown_enabled: checked, crown_modes: checked ? f.crown_modes : [] }))}
              />
            </div>
            {formData.crown_enabled && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm">Modes de jeu disponibles</Label>
                <div className="flex gap-4">
                  {(['1v1', 'ffa', 'teams'] as const).map((mode) => {
                    const labels: Record<string, string> = { '1v1': '1V1', 'ffa': 'FFA', 'teams': 'Équipes' };
                    const isChecked = formData.crown_modes.includes(mode);
                    return (
                      <label key={mode} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setFormData(f => ({
                              ...f,
                              crown_modes: e.target.checked
                                ? [...f.crown_modes, mode]
                                : f.crown_modes.filter(m => m !== mode),
                            }));
                          }}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{labels[mode]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Descriptions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description 1 (mécaniques)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerate(1)}
                  disabled={generatingType !== null}
                >
                  {generatingType === 1 ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Régénérer
                </Button>
              </div>
              <Textarea
                value={formData.description1}
                onChange={(e) => setFormData(f => ({ ...f, description1: e.target.value }))}
                rows={3}
                placeholder="Description focalisée sur les mécaniques de jeu..."
              />
              <p className="text-xs text-muted-foreground">
                {formData.description1.length}/130 caractères
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Description 2 (ambiance)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRegenerate(2)}
                  disabled={generatingType !== null}
                >
                  {generatingType === 2 ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Régénérer
                </Button>
              </div>
              <Textarea
                value={formData.description2}
                onChange={(e) => setFormData(f => ({ ...f, description2: e.target.value }))}
                rows={3}
                placeholder="Description focalisée sur l'ambiance et le thème..."
              />
              <p className="text-xs text-muted-foreground">
                {formData.description2.length}/130 caractères
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
