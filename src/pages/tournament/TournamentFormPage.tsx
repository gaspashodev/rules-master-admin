import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy, Plus, Search, X, ChevronUp, ChevronDown,
  Shuffle, Star, Loader2, ExternalLink, Upload, FileEdit,
  ArrowLeft, Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useTournamentTemplate,
  useCreateTournamentTemplate,
  useUpdateTournamentTemplate,
  uploadTournamentImage,
  deleteTournamentImage,
} from '@/hooks/useTournamentTemplates';
import { useSearchBggGames, useFetchBggData, type BggGameCache } from '@/hooks/useBggQuiz';
import { VALID_SIZES, type TournamentGame, type TournamentSize } from '@/types/tournament-templates';
import { toast } from 'sonner';

// ============ IMAGE UPLOAD FIELD ============

function ImageUploadField({
  label,
  value,
  onChange,
  folder,
  maxSizeKB,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  maxSizeKB: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadTournamentImage(file, folder, maxSizeKB);
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

  const sizeLabel = maxSizeKB >= 1024 ? `${Math.round(maxSizeKB / 1024)} Mo` : `${maxSizeKB} Ko`;

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
            <><Upload className="h-4 w-4 mr-2" />Choisir une image ({sizeLabel} max)</>
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
                Aucun jeu trouve
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

export function BracketPreview({ games }: { games: (TournamentGame | null)[] }) {
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

// ============ FORM PAGE ============

export function TournamentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existingTemplate, isLoading: templateLoading } = useTournamentTemplate(id);
  const createTemplate = useCreateTournamentTemplate();
  const updateTemplate = useUpdateTournamentTemplate();

  const [shareCode, setShareCode] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customShareImageUrl, setCustomShareImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [size, setSize] = useState<TournamentSize>(8);
  const [games, setGames] = useState<(TournamentGame | null)[]>(Array(8).fill(null));

  // Load existing template
  useEffect(() => {
    if (existingTemplate) {
      setShareCode(existingTemplate.share_code);
      setCustomTitle(existingTemplate.custom_title || '');
      setDescription(existingTemplate.description || '');
      setCustomImageUrl(existingTemplate.custom_image_url || '');
      setCustomShareImageUrl(existingTemplate.custom_share_image_url || '');
      setIsFeatured(existingTemplate.is_featured || false);
      setExpiresAt(existingTemplate.expires_at ? existingTemplate.expires_at.slice(0, 10) : '');
      setSize(existingTemplate.size);
      const padded = [...existingTemplate.all_games] as (TournamentGame | null)[];
      while (padded.length < existingTemplate.size) padded.push(null);
      setGames(padded);
    }
  }, [existingTemplate]);

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

  const buildPayload = (status: 'draft' | 'published') => ({
    share_code: shareCode.trim().toUpperCase(),
    size,
    all_games: filledGames,
    status,
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

    const payload = buildPayload('published');

    if (isEdit && id) {
      updateTemplate.mutate({ id, ...payload }, {
        onSuccess: () => navigate('/tournament/templates'),
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => navigate('/tournament/templates'),
      });
    }
  };

  const handleSaveDraft = () => {
    if (!shareCode.trim()) {
      toast.error('Le code de partage est requis');
      return;
    }

    const payload = buildPayload('draft');

    if (isEdit && id) {
      updateTemplate.mutate({ id, ...payload }, {
        onSuccess: () => navigate('/tournament/templates'),
      });
    } else {
      createTemplate.mutate(payload, {
        onSuccess: () => navigate('/tournament/templates'),
      });
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;

  if (templateLoading && isEdit) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tournament/templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              {isEdit ? 'Modifier le tournoi' : 'Nouveau tournoi'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? existingTemplate?.share_code : 'Creer un tournoi personnalise'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving || !shareCode.trim()}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileEdit className="h-4 w-4 mr-2" />}
            Brouillon
          </Button>
          <Button onClick={handlePublish} disabled={isSaving || !shareCode.trim() || !allFilled}>
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : <><Save className="h-4 w-4 mr-2" />{isEdit ? 'Mettre a jour' : 'Publier'}</>}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Visual & Options */}
        <Card>
          <CardHeader>
            <CardTitle>Visuels et options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ImageUploadField
                label="Image de couverture"
                value={customImageUrl}
                onChange={setCustomImageUrl}
                folder="covers"
                maxSizeKB={200}
              />
              <ImageUploadField
                label="Image de partage podium"
                value={customShareImageUrl}
                onChange={setCustomShareImageUrl}
                folder="share"
                maxSizeKB={2048}
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
          </CardContent>
        </Card>

        {/* Game Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Jeux du tournoi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
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

            {/* Bracket Preview */}
            {filledCount >= 2 && (
              <>
                <Separator />
                <BracketPreview games={games} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
