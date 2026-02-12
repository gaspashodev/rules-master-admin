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
  useFetchYugiohCards,
  useYugiohSets,
  useDeleteTcgCard,
  useTcgCardsStats,
  useImportedSets,
  useTcgSetsFromDb,
} from '@/hooks/useTcgCards';
import type { TcgCard } from '@/types/tcg';
import { Search, Trash2, ExternalLink, Download, Loader2, Image, Check } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';

type SortOption = 'name-asc' | 'created_at-desc';

export function YugiohCardsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>('created_at-desc');
  const [selectedSet, setSelectedSet] = useState<string>('');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<TcgCard | null>(null);

  const [sortBy, sortOrder] = sortOption.split('-') as ['name' | 'created_at', 'asc' | 'desc'];

  const pageSize = 50;
  const { data, isLoading } = useTcgCards({
    tcg_type: 'yugioh',
    search: debouncedSearch,
    set_name: selectedSet || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });
  const { data: stats } = useTcgCardsStats('yugioh');
  const { data: setsFromDb } = useTcgSetsFromDb('yugioh');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cartes Yu-Gi-Oh!</h1>
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
            {setsFromDb && setsFromDb.length > 0 && (
              <Select value={selectedSet} onValueChange={(v) => { setSelectedSet(v === 'all' ? '' : v); setPage(0); }}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Tous les sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sets</SelectItem>
                  {setsFromDb.map((set) => (
                    <SelectItem key={set} value={set}>{set}</SelectItem>
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
          <div className="mb-4 pb-4 border-b">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-[59/86] rounded-lg" />
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
                      className="w-full aspect-[59/86] object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-[59/86] bg-muted flex items-center justify-center">
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

          <div className="mt-4 pt-4 border-t">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
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

  const { data: sets, isLoading: loadingSets } = useYugiohSets();
  const { data: importedSets } = useImportedSets('yugioh');
  const fetchCards = useFetchYugiohCards();

  const importedSetsMap = new Map(
    importedSets?.map((s) => [s.set_id, s.count]) || []
  );

  const handleSearchImport = async () => {
    if (!searchQuery) return;
    await fetchCards.mutateAsync({
      query: searchQuery,
      num: 50,
    });
  };

  const handleImportSet = async (setName: string) => {
    await fetchCards.mutateAsync({
      setName,
      num: 250,
    });
  };

  const filteredSets = sets
    ?.filter((set) => {
      if (!setFilter) return true;
      const search = setFilter.toLowerCase();
      return set.set_name.toLowerCase().includes(search);
    })
    .sort((a, b) => {
      const dateA = a.tcg_date ? new Date(a.tcg_date).getTime() : 0;
      const dateB = b.tcg_date ? new Date(b.tcg_date).getTime() : 0;
      return sortOldFirst ? dateA - dateB : dateB - dateA;
    });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des cartes Yu-Gi-Oh!</DialogTitle>
          <DialogDescription>
            Sélectionnez un set ou recherchez des cartes spécifiques à importer depuis YGOProDeck.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Rechercher par nom de carte</Label>
            <div className="flex gap-2">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: Dark Magician, Blue-Eyes..."
              />
              <Button
                onClick={handleSearchImport}
                disabled={fetchCards.isPending || !searchQuery}
              >
                {fetchCards.isPending ? (
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
                  filteredSets?.slice(0, 100).map((set, index) => {
                    const importedCount = importedSetsMap.get(set.set_code) || 0;
                    const isComplete = importedCount >= set.num_of_cards;
                    const isPartial = importedCount > 0 && importedCount < set.num_of_cards;

                    return (
                      <div
                        key={`${set.set_name}-${index}`}
                        className={`flex items-center justify-between p-2 rounded hover:bg-muted ${isComplete ? 'bg-green-500/10' : ''}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{set.set_name}</p>
                            {isComplete && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-green-500/20 text-green-600 rounded">
                                <Check className="h-3 w-3" />
                                Complet
                              </span>
                            )}
                            {isPartial && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-500/20 text-yellow-600 rounded">
                                {importedCount}/{set.num_of_cards}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {set.tcg_date || 'Date inconnue'} • {set.num_of_cards} cartes
                          </p>
                        </div>
                        <Button
                          variant={isComplete ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => handleImportSet(set.set_name)}
                          disabled={fetchCards.isPending || isComplete}
                          className={isComplete ? 'text-green-600' : ''}
                        >
                          {fetchCards.isPending ? (
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
    atk?: number;
    def?: number;
    level?: number;
    attribute?: string;
    archetype?: string;
    frameType?: string;
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
                className="w-40 rounded-lg shadow-lg"
              />
            ) : (
              <div className="w-40 aspect-[59/86] bg-muted rounded-lg flex items-center justify-center">
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
              {card.types && card.types.length > 0 && (
                <p><span className="text-muted-foreground">Type :</span> {card.types.join(', ')}</p>
              )}
              {extraData?.attribute && (
                <p><span className="text-muted-foreground">Attribut :</span> {extraData.attribute}</p>
              )}
              {extraData?.level && (
                <p><span className="text-muted-foreground">Niveau :</span> {extraData.level}</p>
              )}
              {extraData?.atk !== undefined && (
                <p><span className="text-muted-foreground">ATK :</span> {extraData.atk}</p>
              )}
              {extraData?.def !== undefined && (
                <p><span className="text-muted-foreground">DEF :</span> {extraData.def}</p>
              )}
              {card.rarity && (
                <p><span className="text-muted-foreground">Rareté :</span> {card.rarity}</p>
              )}
              {extraData?.archetype && (
                <p><span className="text-muted-foreground">Archétype :</span> {extraData.archetype}</p>
              )}
            </div>

            {card.flavor_text && (
              <div className="text-xs bg-muted p-2 rounded max-h-32 overflow-y-auto">
                <p>{card.flavor_text}</p>
              </div>
            )}

            {card.external_id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`https://ygoprodeck.com/card/${card.external_id}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir sur YGOProDeck
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
