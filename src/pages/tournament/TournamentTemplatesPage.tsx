import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Trophy, Plus, Search, X, ChevronUp, ChevronDown,
  Shuffle, Star, Trash2, Pencil, Eye, Loader2, ExternalLink,
  Upload, FileEdit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Pagination } from '@/components/ui/pagination';
import {
  useTournamentTemplates,
  useCreateTournamentTemplate,
  useUpdateTournamentTemplate,
  useDeleteTournamentTemplate,
  uploadTournamentImage,
  deleteTournamentImage,
} from '@/hooks/useTournamentTemplates';
import { useSearchBggGames, useFetchBggData, type BggGameCache } from '@/hooks/useBggQuiz';
import { VALID_SIZES, isDraft, type TournamentTemplate, type TournamentGame, type TournamentSize } from '@/types/tournament-templates';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

// ============ IMAGE UPLOAD FIELD ============

function ImageUploadField({
  label,
  value,
  onChange,
  folder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTournamentImage(file, folder);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        await deleteTournamentImage(value);
      } catch {
        // Best effort cleanup
      }
    }
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="h-16 w-16 rounded object-cover border" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Remplacer
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Upload en cours...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Choisir une image (2 Mo max)</>
          )}
        </Button>
      )}
    </div>
  );
}

// ============ GAME SLOT SEARCH ============

function GameSlotSearch({
  onSelect,
  onCustom,
}: {
  onSelect: (game: BggGameCache) => void;
  onCustom: (name: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customName, setCustomName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showAddById, setShowAddById] = useState(false);
  const [bggIdInput, setBggIdInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: games, isLoading } = useSearchBggGames(searchTerm);
  const fetchBggData = useFetchBggData();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddByBggId = async () => {
    const bggId = parseInt(bggIdInput);
    if (!bggId || bggId <= 0) {
      toast.error('ID BGG invalide');
      return;
    }
    try {
      const result = await fetchBggData.mutateAsync({ ids: [bggId] });
      if (result.inserted > 0 || result.updated > 0) {
        setTimeout(async () => {
          const { supabase } = await import('@/lib/supabase');
          const { data } = await supabase
            .from('bgg_games_cache')
            .select('id, bgg_id, name, image_url')
            .eq('bgg_id', bggId)
            .single();
          if (data) {
            onSelect({ id: data.id, bgg_id: data.bgg_id, name: data.name, image: data.image_url, thumbnail: data.image_url });
            setIsOpen(false);
            setBggIdInput('');
            setShowAddById(false);
          }
        }, 500);
      }
    } catch {
      // Error handled by mutation
    }
  };

  if (showCustom) {
    return (
      <div className="flex gap-2">
        <Input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Nom du jeu custom..."
          className="flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && customName.trim()) {
              onCustom(customName.trim());
              setCustomName('');
              setShowCustom(false);
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => { if (customName.trim()) { onCustom(customName.trim()); setCustomName(''); setShowCustom(false); } }}
          disabled={!customName.trim()}
        >
          OK
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowCustom(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); setShowAddById(false); }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un jeu BGG..."
          className="pl-8 h-8 text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {isOpen && searchTerm.length >= 3 && (
          <div className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-popover border rounded-md shadow-lg">
            {isLoading ? (
              <div className="p-2 text-center text-muted-foreground text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />
                Recherche...
              </div>
            ) : games && games.length > 0 ? (
              <>
                <ul className="py-1">
                  {games.map((game) => (
                    <li key={game.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-1.5 text-left hover:bg-muted text-sm"
                        onClick={() => { onSelect(game); setSearchTerm(''); setIsOpen(false); }}
                      >
                        <p className="font-medium truncate">{game.name}</p>
                        <p className="text-xs text-muted-foreground">BGG #{game.bgg_id}</p>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="border-t p-1.5">
                  <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => setShowAddById(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter par ID BGG
                  </Button>
                </div>
              </>
            ) : showAddById ? (
              <div className="p-2 space-y-2">
                <p className="text-xs text-muted-foreground">ID BGG du jeu :</p>
                <div className="flex gap-1.5">
                  <Input type="number" min={1} value={bggIdInput} onChange={(e) => setBggIdInput(e.target.value)} placeholder="Ex: 174430" className="flex-1 h-7 text-sm" autoFocus />
                  {bggIdInput && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={`https://boardgamegeek.com/boardgame/${bggIdInput}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
                <Button type="button" size="sm" onClick={handleAddByBggId} disabled={fetchBggData.isPending || !bggIdInput} className="w-full h-7 text-xs">
                  {fetchBggData.isPending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Chargement...</> : <><Plus className="h-3 w-3 mr-1" />Ajouter</>}
                </Button>
              </div>
            ) : (
              <div className="p-2 text-center text-muted-foreground text-sm">
                Aucun jeu trouvé
                <div className="flex justify-center mt-1">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddById(true)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter par ID BGG
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setShowCustom(true)}>
        Jeu custom
      </Button>
    </div>
  );
}

// ============ BRACKET PREVIEW ============

function BracketPreview({ games }: { games: (TournamentGame | null)[] }) {
  const pairs: [TournamentGame | null, TournamentGame | null][] = [];
  for (let i = 0; i < games.length; i += 2) {
    pairs.push([games[i], games[i + 1] || null]);
  }

  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Apercu du bracket (1er tour)</h4>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {pairs.map((pair, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30 text-sm">
            <span className="text-xs text-muted-foreground w-5 shrink-0">#{i + 1}</span>
            <span className="truncate flex-1 font-medium">{pair[0]?.name || <span className="text-muted-foreground italic">vide</span>}</span>
            <span className="text-xs text-muted-foreground font-bold">VS</span>
            <span className="truncate flex-1 font-medium text-right">{pair[1]?.name || <span className="text-muted-foreground italic">vide</span>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ FORM DIALOG ============

function TournamentFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TournamentTemplate | null; // null = create mode
}) {
  const isEdit = !!template;

  const [shareCode, setShareCode] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customShareImageUrl, setCustomShareImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [size, setSize] = useState<TournamentSize>(8);
  const [games, setGames] = useState<(TournamentGame | null)[]>([]);

  const createTemplate = useCreateTournamentTemplate();
  const updateTemplate = useUpdateTournamentTemplate();

  // Initialize form when dialog opens or template changes
  useEffect(() => {
    if (open) {
      if (template) {
        setShareCode(template.share_code);
        setCustomTitle(template.custom_title || '');
        setDescription(template.description || '');
        setCustomImageUrl(template.custom_image_url || '');
        setCustomShareImageUrl(template.custom_share_image_url || '');
        setIsFeatured(template.is_featured || false);
        setExpiresAt(template.expires_at ? template.expires_at.slice(0, 10) : '');
        setSize(template.size);
        // Pad all_games to size with nulls for draft editing
        const padded = [...template.all_games] as (TournamentGame | null)[];
        while (padded.length < template.size) padded.push(null);
        setGames(padded);
      } else {
        setShareCode('');
        setCustomTitle('');
        setDescription('');
        setCustomImageUrl('');
        setCustomShareImageUrl('');
        setIsFeatured(false);
        setExpiresAt('');
        setSize(8);
        setGames(Array(8).fill(null));
      }
    }
  }, [open, template]);

  const handleSizeChange = useCallback((newSize: TournamentSize) => {
    setSize(newSize);
    setGames(prev => {
      if (newSize > prev.length) {
        return [...prev, ...Array(newSize - prev.length).fill(null)];
      }
      return prev.slice(0, newSize);
    });
  }, []);

  const handleSetGame = useCallback((index: number, game: TournamentGame) => {
    setGames(prev => {
      const next = [...prev];
      next[index] = game;
      return next;
    });
  }, []);

  const handleClearGame = useCallback((index: number) => {
    setGames(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    setGames(prev => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setGames(prev => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  const handleShuffle = useCallback(() => {
    setGames(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  }, []);

  const filledGames = games.filter((g): g is TournamentGame => g !== null);
  const filledCount = filledGames.length;
  const allFilled = filledCount === size;

  const buildPayload = () => ({
    share_code: shareCode.trim().toUpperCase(),
    size,
    all_games: filledGames,
    is_featured: isFeatured,
    custom_title: customTitle || null,
    custom_image_url: customImageUrl || null,
    custom_share_image_url: customShareImageUrl || null,
    description: description || null,
    expires_at: expiresAt || null,
  });

  const handlePublish = () => {
    if (!shareCode.trim()) {
      toast.error('Le code de partage est requis');
      return;
    }
    if (!allFilled) {
      toast.error(`Tous les ${size} slots doivent etre remplis (${filledCount}/${size})`);
      return;
    }

    const payload = buildPayload();

    if (isEdit) {
      updateTemplate.mutate({ id: template.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleSaveDraft = () => {
    if (!shareCode.trim()) {
      toast.error('Le code de partage est requis');
      return;
    }

    const payload = buildPayload();

    if (isEdit) {
      updateTemplate.mutate({ id: template.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {isEdit ? 'Modifier le tournoi' : 'Nouveau tournoi'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* General Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code de partage *</Label>
              <Input
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                placeholder="Ex: TOP8-STRATEGIE"
              />
              <p className="text-xs text-muted-foreground">Unique, sera utilise dans l'URL</p>
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ex: Top 16 Strategie de l'annee"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description / accroche du tournoi..."
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Visual & Options */}
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadField
              label="Image de couverture"
              value={customImageUrl}
              onChange={setCustomImageUrl}
              folder="covers"
            />
            <ImageUploadField
              label="Image de partage podium"
              value={customShareImageUrl}
              onChange={setCustomShareImageUrl}
              folder="share"
            />
            <div className="flex items-center gap-3">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
              <Label>Mis en avant sur le front</Label>
            </div>
            <div className="space-y-2">
              <Label>Date d'expiration</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Vide = permanent</p>
            </div>
          </div>

          <Separator />

          {/* Game Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>Jeux du tournoi</Label>
                <Select value={String(size)} onValueChange={(v) => handleSizeChange(Number(v) as TournamentSize)}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VALID_SIZES.map(s => (
                      <SelectItem key={s} value={String(s)}>{s} jeux</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{filledCount}/{size} remplis</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleShuffle} disabled={filledCount < 2}>
                <Shuffle className="h-4 w-4 mr-1" />
                Melanger
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
              {games.map((game, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded border bg-card">
                  <span className="text-xs text-muted-foreground w-7 text-right shrink-0 font-mono">{index + 1}.</span>

                  {game ? (
                    <>
                      {game.image_url && (
                        <img src={game.image_url} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                      )}
                      <span className="flex-1 text-sm font-medium truncate">{game.name}</span>
                      <Badge variant={game.is_custom ? 'secondary' : 'outline'} className="text-xs shrink-0">
                        {game.is_custom ? 'Custom' : 'BGG'}
                      </Badge>
                      <div className="flex gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveUp(index)} disabled={index === 0}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleMoveDown(index)} disabled={index === games.length - 1}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleClearGame(index)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1">
                      <GameSlotSearch
                        onSelect={(bggGame) => {
                          handleSetGame(index, {
                            game_id: String(bggGame.bgg_id),
                            name: bggGame.name,
                            image_url: bggGame.image || bggGame.thumbnail || null,
                            is_custom: false,
                          });
                        }}
                        onCustom={(name) => {
                          handleSetGame(index, {
                            game_id: null,
                            name,
                            image_url: null,
                            is_custom: true,
                          });
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bracket Preview */}
          {filledCount >= 2 && (
            <>
              <Separator />
              <BracketPreview games={games} />
            </>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving || !shareCode.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />}
            Brouillon
          </Button>
          <Button onClick={handlePublish} disabled={isSaving || !shareCode.trim() || !allFilled}>
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : (isEdit ? 'Mettre a jour' : 'Publier le tournoi')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ DETAIL DIALOG ============

function TournamentDetailDialog({
  open,
  onOpenChange,
  template,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TournamentTemplate | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!template) return null;

  const draft = isDraft(template);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {template.custom_title || template.share_code}
            {draft && <Badge variant="secondary">Brouillon</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Code de partage</Label>
              <p className="font-mono font-medium">{template.share_code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Taille</Label>
              <p className="font-medium">{template.size} jeux {draft && <span className="text-muted-foreground">({template.all_games.length} remplis)</span>}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Cree le</Label>
              <p className="font-medium">{new Date(template.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            {template.custom_title && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Titre</Label>
                <p className="font-medium">{template.custom_title}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Mis en avant</Label>
              <p className="font-medium">{template.is_featured ? 'Oui' : 'Non'}</p>
            </div>
            {template.description && (
              <div className="col-span-3">
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{template.description}</p>
              </div>
            )}
            {template.expires_at && (
              <div>
                <Label className="text-muted-foreground">Expire le</Label>
                <p className="font-medium">{new Date(template.expires_at).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
            {template.custom_image_url && (
              <div>
                <Label className="text-muted-foreground">Image de couverture</Label>
                <img src={template.custom_image_url} alt="" className="h-20 rounded object-cover mt-1" />
              </div>
            )}
            {template.custom_share_image_url && (
              <div>
                <Label className="text-muted-foreground">Image de partage</Label>
                <img src={template.custom_share_image_url} alt="" className="h-20 rounded object-cover mt-1" />
              </div>
            )}
          </div>

          <Separator />

          {/* Games list */}
          <div>
            <h3 className="font-semibold mb-3">Jeux ({template.all_games.length}/{template.size})</h3>
            <div className="space-y-1">
              {template.all_games.map((game, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <span className="text-xs text-muted-foreground w-7 text-right font-mono">{i + 1}.</span>
                  {game.image_url && (
                    <img src={game.image_url} alt="" className="h-7 w-7 rounded object-cover" />
                  )}
                  <span className="flex-1 font-medium truncate">{game.name}</span>
                  <Badge variant={game.is_custom ? 'secondary' : 'outline'} className="text-xs">
                    {game.is_custom ? 'Custom' : 'BGG'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {template.all_games.length >= 2 && (
            <>
              <Separator />
              <BracketPreview games={template.all_games} />
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce tournoi ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le tournoi "{template.share_code}" sera supprime definitivement. Les resultats lies ne seront pas affectes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN PAGE ============

export function TournamentTemplatesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<TournamentTemplate | null>(null);

  const { data, isLoading } = useTournamentTemplates({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const deleteTemplate = useDeleteTournamentTemplate();

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleOpenCreate = () => {
    setEditTemplate(null);
    setFormOpen(true);
  };

  const handleOpenEdit = () => {
    setEditTemplate(selectedTemplate);
    setSelectedTemplate(null);
    setFormOpen(true);
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;
    deleteTemplate.mutate(selectedTemplate.id, {
      onSuccess: () => setSelectedTemplate(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="h-7 w-7" />
            Tournois personnalises
          </h1>
          <p className="text-muted-foreground">{data?.count || 0} tournois</p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tournoi
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher par code ou titre..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tournois</CardTitle>
        </CardHeader>
        <CardContent>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          <div className="space-y-2 mt-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : !data?.data?.length ? (
              <p className="text-muted-foreground text-center py-8">Aucun tournoi trouve</p>
            ) : (
              data.data.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTemplate(t)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">{t.share_code}</code>
                      <Badge variant="outline">{t.all_games.length}/{t.size} jeux</Badge>
                      {isDraft(t) && (
                        <Badge variant="secondary">Brouillon</Badge>
                      )}
                      {t.is_featured && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Featured
                        </Badge>
                      )}
                      {t.expires_at && new Date(t.expires_at) < new Date() && (
                        <Badge variant="destructive">Expire</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{t.custom_title || '(sans titre)'}</span>
                      <span>{new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTemplate(t); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <TournamentDetailDialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        template={selectedTemplate}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Create/Edit Dialog */}
      <TournamentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={editTemplate}
      />
    </div>
  );
}
