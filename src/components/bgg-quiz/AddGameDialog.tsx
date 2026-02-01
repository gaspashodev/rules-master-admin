import { useState, KeyboardEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, X } from 'lucide-react';
import {
  useCreateBggGame,
  type BggGameCacheInsert,
} from '@/hooks/useBggQuiz';

interface AddGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onGameCreated?: (game: { bgg_id: number; name: string }) => void;
}

export function AddGameDialog({
  open,
  onOpenChange,
  initialName = '',
  onGameCreated,
}: AddGameDialogProps) {
  // Required fields
  const [bggId, setBggId] = useState('');
  const [name, setName] = useState(initialName);

  // Optional fields
  const [yearPublished, setYearPublished] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [designers, setDesigners] = useState<string[]>([]);
  const [designerInput, setDesignerInput] = useState('');
  const [rating, setRating] = useState('');
  const [rank, setRank] = useState('');
  const [weight, setWeight] = useState('');
  const [minPlayers, setMinPlayers] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [minPlaytime, setMinPlaytime] = useState('');
  const [maxPlaytime, setMaxPlaytime] = useState('');

  const createGame = useCreateBggGame();

  const handleAddDesigner = () => {
    const trimmed = designerInput.trim();
    if (trimmed && !designers.includes(trimmed)) {
      setDesigners([...designers, trimmed]);
      setDesignerInput('');
    }
  };

  const handleDesignerKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDesigner();
    }
  };

  const handleRemoveDesigner = (index: number) => {
    setDesigners(designers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const id = parseInt(bggId);
    if (!id || !name) return;

    const gameData: BggGameCacheInsert = {
      bgg_id: id,
      name,
      year_published: yearPublished ? parseInt(yearPublished) : null,
      image_url: imageUrl || null,
      description: description || null,
      designers: designers.length > 0 ? designers : [],
      rating: rating ? parseFloat(rating) : null,
      rank: rank ? parseInt(rank) : null,
      weight: weight ? parseFloat(weight) : null,
      min_players: minPlayers ? parseInt(minPlayers) : null,
      max_players: maxPlayers ? parseInt(maxPlayers) : null,
      min_playtime: minPlaytime ? parseInt(minPlaytime) : null,
      max_playtime: maxPlaytime ? parseInt(maxPlaytime) : null,
    };

    try {
      await createGame.mutateAsync(gameData);
      onGameCreated?.({ bgg_id: id, name });
      onOpenChange(false);
      resetForm();
    } catch {
      // Error is handled by the mutation
    }
  };

  const resetForm = () => {
    setBggId('');
    setName('');
    setYearPublished('');
    setImageUrl('');
    setDescription('');
    setDesigners([]);
    setDesignerInput('');
    setRating('');
    setRank('');
    setWeight('');
    setMinPlayers('');
    setMaxPlayers('');
    setMinPlaytime('');
    setMaxPlaytime('');
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
    setName(initialName);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un jeu</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Required fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Champs obligatoires</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bgg-id">BGG ID *</Label>
                <div className="flex gap-2">
                  <Input
                    id="bgg-id"
                    type="number"
                    min={1}
                    value={bggId}
                    onChange={(e) => setBggId(e.target.value)}
                    placeholder="Ex: 295947"
                    className="flex-1"
                    autoFocus
                  />
                  {bggId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <a
                        href={`https://boardgamegeek.com/boardgame/${bggId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Voir sur BGG"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="game-name">Nom du jeu *</Label>
                <Input
                  id="game-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cascadia"
                />
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Informations générales</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Année de publication</Label>
                <Input
                  id="year"
                  type="number"
                  min={1900}
                  max={2100}
                  value={yearPublished}
                  onChange={(e) => setYearPublished(e.target.value)}
                  placeholder="Ex: 2021"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Note BGG</Label>
                <Input
                  id="rating"
                  type="number"
                  step="0.01"
                  min={0}
                  max={10}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  placeholder="Ex: 8.25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rank">Rang BGG</Label>
                <Input
                  id="rank"
                  type="number"
                  min={1}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="Ex: 42"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Complexité (poids)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min={1}
                max={5}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="Ex: 2.5 (entre 1 et 5)"
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Players & Playtime */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Joueurs & Durée</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de joueurs</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(e.target.value)}
                    placeholder="Min"
                    className="w-20"
                  />
                  <span className="text-muted-foreground">à</span>
                  <Input
                    type="number"
                    min={1}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                    placeholder="Max"
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">joueurs</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Durée de partie (minutes)</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    value={minPlaytime}
                    onChange={(e) => setMinPlaytime(e.target.value)}
                    placeholder="Min"
                    className="w-20"
                  />
                  <span className="text-muted-foreground">à</span>
                  <Input
                    type="number"
                    min={1}
                    value={maxPlaytime}
                    onChange={(e) => setMaxPlaytime(e.target.value)}
                    placeholder="Max"
                    className="w-20"
                  />
                  <span className="text-muted-foreground text-sm">min</span>
                </div>
              </div>
            </div>
          </div>

          {/* Designers */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Auteurs</h3>

            <div className="space-y-2">
              <Label htmlFor="designer-input">Ajouter un designer</Label>
              <div className="flex gap-2">
                <Input
                  id="designer-input"
                  value={designerInput}
                  onChange={(e) => setDesignerInput(e.target.value)}
                  onKeyDown={handleDesignerKeyDown}
                  placeholder="Nom du designer (Entrée pour valider)"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddDesigner}
                  disabled={!designerInput.trim()}
                >
                  Ajouter
                </Button>
              </div>
              {designers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {designers.map((designer, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      {designer}
                      <button
                        type="button"
                        onClick={() => handleRemoveDesigner(index)}
                        className="ml-1 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description & Image */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Contenu</h3>

            <div className="space-y-2">
              <Label htmlFor="image-url">URL de l'image</Label>
              <Input
                id="image-url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              {imageUrl && (
                <div className="mt-2">
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    className="w-24 h-24 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description du jeu..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createGame.isPending || !bggId || !name}
          >
            {createGame.isPending ? 'Enregistrement...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
