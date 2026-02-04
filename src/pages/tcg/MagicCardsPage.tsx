import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useTcgCards,
  useFetchMagicCards,
  useMagicSets,
  useDeleteTcgCard,
  useTcgCardsStats,
  useImportedSets,
} from '@/hooks/useTcgCards';
import type { TcgCard } from '@/types/tcg';
import { Search, Trash2, ExternalLink, ChevronLeft, ChevronRight, Download, Loader2, Image, Check } from 'lucide-react';

type SortOption = 'name-asc' | 'release_date-desc' | 'created_at-desc';

export function MagicCardsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('created_at-desc');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TcgCard | null>(null);

  const [sortBy, sortOrder] = sortOption.split('-') as ['name' | 'release_date' | 'created_at', 'asc' | 'desc'];

  const pageSize = 50;
  const { data, isLoading } = useTcgCards({
    tcg_type: 'magic',
    search: debouncedSearch,
    set_name: selectedSet || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });
  const { data: stats } = useTcgCardsStats('magic');
  const deleteCard = useDeleteTcgCard();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleDelete = async (card: TcgCard) => {
    if (!confirm(`Supprimer "${card.name}" ?`)) return;
    await deleteCard.mutateAsync(card.id);
  };

  const totalPages = data ? Math.ceil(data.count / pageSize) : 0;

  const uniqueSets = data?.data
    ? [...new Set(data.data.map(c => c.set_name).filter(Boolean))]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartes Magic: The Gathering</h1>
          <p className="text-muted-foreground">
            {stats?.total || 0} cartes enregistrées • {Object.keys(stats?.bySet || {}).length} sets
          </p>
        </div>
        <Button onClick={() => setShowImportDialog(true)}>
          <Download className="h-4 w-4 mr-2" />
          Importer des cartes
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une carte..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            {uniqueSets.length > 0 && (
              <Select value={selectedSet} onValueChange={(v) => { setSelectedSet(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Tous les sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sets</SelectItem>
                  {uniqueSets.sort().map((set) => (
                    <SelectItem key={set} value={set!}>{set}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortOption} onValueChange={(v) => { setSortOption(v as SortOption); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Trier par..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Plus récents</SelectItem>
                <SelectItem value="name-asc">Nom (A-Z)</SelectItem>
                <SelectItem value="release_date-desc">Date de sortie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liste des cartes</CardTitle>
        </CardHeader>
        <CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-[488/680] rounded-lg" />
              ))}
            </div>
          ) : !data?.data.length ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Aucune carte trouvée
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowImportDialog(true)}
              >
                Importer des cartes
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {data.data.map((card) => (
                <div
                  key={card.id}
                  className="group relative rounded-lg overflow-hidden border bg-card hover:ring-2 hover:ring-primary transition-all cursor-pointer"
                  onClick={() => setSelectedCard(card)}
                >
                  {card.image_url_small ? (
                    <img
                      src={card.image_url_small}
                      alt={card.name}
                      className="w-full aspect-[488/680] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[488/680] bg-muted flex items-center justify-center">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-white text-sm font-medium truncate">{card.name}</p>
                      <p className="text-white/70 text-xs truncate">{card.set_name}</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); handleDelete(card); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} sur {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportCardsDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
      />

      {selectedCard && (
        <CardDetailDialog
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}

function ImportCardsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [setFilter, setSetFilter] = useState('');
  const [sortOldFirst, setSortOldFirst] = useState(false);
  const [selectedSetCode, setSelectedSetCode] = useState('');

  const { data: sets, isLoading: loadingSets } = useMagicSets();
  const { data: importedSets } = useImportedSets('magic');
  const fetchCards = useFetchMagicCards();

  const importedSetsMap = new Map(
    importedSets?.map((s) => [s.set_id, s.count]) || []
  );

  const handleSearchImport = async () => {
    if (!searchQuery) return;
    await fetchCards.mutateAsync({
      query: searchQuery,
    });
  };

  const handleImportSet = async (setCode: string) => {
    setSelectedSetCode(setCode);
    await fetchCards.mutateAsync({
      setCode,
    });
  };

  const filteredSets = sets
    ?.filter((set) => {
      if (!setFilter) return true;
      const search = setFilter.toLowerCase();
      return set.name.toLowerCase().includes(search) || set.code.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      const dateA = new Date(a.released_at).getTime();
      const dateB = new Date(b.released_at).getTime();
      return sortOldFirst ? dateA - dateB : dateB - dateA;
    });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des cartes Magic: The Gathering</DialogTitle>
          <DialogDescription>
            Sélectionnez un set ou recherchez des cartes spécifiques à importer depuis Scryfall.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Rechercher par nom de carte</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Lightning Bolt, Black Lotus..."
              />
              <Button
                onClick={handleSearchImport}
                disabled={fetchCards.isPending || !searchQuery}
              >
                {fetchCards.isPending && !selectedSetCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ou importer un set complet ({sets?.length || 0} sets disponibles)</Label>

            <div className="flex gap-2">
              <Input
                value={setFilter}
                onChange={(e) => setSetFilter(e.target.value)}
                placeholder="Filtrer les sets..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOldFirst(!sortOldFirst)}
                className="whitespace-nowrap"
              >
                {sortOldFirst ? 'Ancien → Récent' : 'Récent → Ancien'}
              </Button>
            </div>

            {loadingSets ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {filteredSets?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun set trouvé pour "{setFilter}"
                  </p>
                ) : (
                  filteredSets?.slice(0, 100).map((set) => {
                    const importedCount = importedSetsMap.get(set.code) || 0;
                    const isComplete = importedCount >= set.card_count;
                    const isPartial = importedCount > 0 && importedCount < set.card_count;

                    return (
                      <div
                        key={set.code}
                        className={`flex items-center justify-between p-2 rounded hover:bg-muted ${isComplete ? 'bg-green-500/10' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {set.icon_svg_uri && (
                            <img
                              src={set.icon_svg_uri}
                              alt={set.name}
                              className="h-6 w-6 object-contain"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{set.name}</p>
                              {isComplete && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-600 rounded">
                                  <Check className="h-3 w-3" />
                                  Complet
                                </span>
                              )}
                              {isPartial && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-600 rounded">
                                  {importedCount}/{set.card_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {set.released_at} • {set.card_count} cartes • {set.set_type}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={isComplete ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => handleImportSet(set.code)}
                          disabled={fetchCards.isPending || isComplete}
                          className={isComplete ? 'text-green-600' : ''}
                        >
                          {fetchCards.isPending && selectedSetCode === set.code ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {fetchCards.data && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>
                <strong>Résultat :</strong> {fetchCards.data.inserted} ajoutées,{' '}
                {fetchCards.data.updated} mises à jour
                {fetchCards.data.hasMore && ' (il y a plus de cartes)'}
              </p>
              {fetchCards.data.errors.length > 0 && (
                <p className="text-destructive mt-1">
                  {fetchCards.data.errors.length} erreur(s)
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CardDetailDialog({
  card,
  onClose,
}: {
  card: TcgCard;
  onClose: () => void;
}) {
  const extraData = card.extra_data as {
    mana_cost?: string;
    cmc?: number;
    type_line?: string;
    power?: string;
    toughness?: string;
    loyalty?: string;
    color_identity?: string[];
  } | null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader className="sr-only">
          <DialogTitle>{card.name}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                className="w-48 rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-48 aspect-[488/680] bg-muted rounded-lg flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-xl font-bold">{card.name}</h2>
              <p className="text-muted-foreground">{card.set_name}</p>
            </div>

            <div className="space-y-1 text-sm">
              {extraData?.mana_cost && (
                <p><span className="text-muted-foreground">Coût de mana :</span> {extraData.mana_cost}</p>
              )}
              {extraData?.type_line && (
                <p><span className="text-muted-foreground">Type :</span> {extraData.type_line}</p>
              )}
              {card.types && card.types.length > 0 && (
                <p><span className="text-muted-foreground">Couleurs :</span> {card.types.join(', ')}</p>
              )}
              {extraData?.power && extraData?.toughness && (
                <p><span className="text-muted-foreground">Force/End. :</span> {extraData.power}/{extraData.toughness}</p>
              )}
              {extraData?.loyalty && (
                <p><span className="text-muted-foreground">Loyauté :</span> {extraData.loyalty}</p>
              )}
              {card.rarity && (
                <p><span className="text-muted-foreground">Rareté :</span> {card.rarity}</p>
              )}
              {card.release_date && (
                <p><span className="text-muted-foreground">Sortie :</span> {new Date(card.release_date).toLocaleDateString('fr-FR')}</p>
              )}
              {card.artist && (
                <p><span className="text-muted-foreground">Artiste :</span> {card.artist}</p>
              )}
            </div>

            {card.abilities && card.abilities.length > 0 && (
              <div className="text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto">
                <p>{card.abilities[0].text}</p>
              </div>
            )}

            {card.flavor_text && (
              <div className="text-xs italic text-muted-foreground bg-muted/50 p-2 rounded">
                <p>{card.flavor_text}</p>
              </div>
            )}

            {card.external_id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`https://scryfall.com/card/${card.set_id}/${card.external_id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir sur Scryfall
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
