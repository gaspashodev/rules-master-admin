import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { BarcodesEditor } from '@/components/games/BarcodesEditor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import { useGame, useCreateGame, useUpdateGame } from '@/hooks/useGames';
import { ConceptsList } from '@/components/games/ConceptsList';
import { ResourcesEditor } from '@/components/games/ResourcesEditor';
import { BggGameSearch } from '@/components/bgg-quiz';
import { useBggGame } from '@/hooks/useBggQuiz';
import { slugify } from '@/lib/utils';
import type { GameFormData, Game } from '@/types/database';
import { ArrowLeft, Save, Gamepad2, Download } from 'lucide-react';
import { toast } from 'sonner';

// Convert BGG weight to difficulty
function weightToDifficulty(weight: number | null): 'beginner' | 'intermediate' | 'expert' {
  if (!weight || weight < 2) return 'beginner';
  if (weight < 3) return 'intermediate';
  return 'expert';
}

export function GameFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const { data: game, isLoading } = useGame(id);
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();

  const { register, handleSubmit, watch, setValue, reset } = useForm<GameFormData>({
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      difficulty: 'intermediate',
      player_count_min: 2,
      player_count_max: 4,
      play_time_min: 30,
      play_time_max: 60,
      min_age: 10,
      bgg_rating: null,
      bgg_url: null,
      cover_image_url: null,
      affiliate_url: null,
      published: false,
      featured: false,
    },
  });

  const watchName = watch('name');
  const watchSlug = watch('slug');
  const watchCoverImage = watch('cover_image_url');
  const watchPublished = watch('published');
  const watchFeatured = watch('featured');
  const watchDifficulty = watch('difficulty');

  useEffect(() => {
    if (!isEditing && watchName) {
      setValue('slug', slugify(watchName));
    }
  }, [watchName, isEditing, setValue]);

  useEffect(() => {
    if (game) {
      reset({
        name: game.name,
        slug: game.slug,
        description: game.description,
        difficulty: game.difficulty,
        player_count_min: game.player_count_min,
        player_count_max: game.player_count_max,
        play_time_min: game.play_time_min,
        play_time_max: game.play_time_max,
        min_age: game.min_age,
        bgg_rating: game.bgg_rating,
        bgg_url: game.bgg_url,
        cover_image_url: game.cover_image_url,
        affiliate_url: game.affiliate_url,
        published: game.published,
        featured: game.featured,
      });
    }
  }, [game, reset]);

  const onSubmit = async (data: GameFormData) => {
    // Nettoyer les valeurs numériques qui peuvent être NaN
    const cleanData = {
      ...data,
      bgg_rating: data.bgg_rating && !isNaN(data.bgg_rating) ? data.bgg_rating : null,
      player_count_min: data.player_count_min || 1,
      player_count_max: data.player_count_max || 4,
      play_time_min: data.play_time_min || 30,
      play_time_max: data.play_time_max || 60,
      min_age: data.min_age || 8,
      // En édition, garder la valeur existante ; en création, défaut à 'intermediate'
      difficulty: data.difficulty || (isEditing ? game?.difficulty : 'intermediate') || 'intermediate',
    };
    
    if (isEditing && id) {
      await updateGame.mutateAsync({ id, data: cleanData });
    } else {
      const newGame = await createGame.mutateAsync(cleanData);
      navigate(`/games/${newGame.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/games')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? 'Modifier le jeu' : 'Nouveau jeu'}
            </h1>
          </div>
        </div>
        <Button type="submit" disabled={createGame.isPending || updateGame.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      {isEditing ? (
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList>
            <TabsTrigger value="info">Informations</TabsTrigger>
            <TabsTrigger value="concepts">Concepts</TabsTrigger>
            <TabsTrigger value="resources">Ressources</TabsTrigger>
            <TabsTrigger value="barcodes">Codes-barres</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <FormFields
              register={register}
              setValue={setValue}
              watchCoverImage={watchCoverImage}
              watchPublished={watchPublished}
              watchFeatured={watchFeatured}
              watchDifficulty={watchDifficulty}
              watchSlug={watchSlug}
              watchName={watchName}
              gameId={id}
              game={game}
              isEditing={true}
            />
          </TabsContent>
          <TabsContent value="concepts">
            <ConceptsList gameId={id!} />
          </TabsContent>
          <TabsContent value="resources">
            <ResourcesEditor gameId={id!} />
          </TabsContent>
          <TabsContent value="barcodes">
            <BarcodesEditor gameId={id!} />
          </TabsContent>
        </Tabs>
      ) : (
        <FormFields
          register={register}
          setValue={setValue}
          watchCoverImage={watchCoverImage}
          watchPublished={watchPublished}
          watchFeatured={watchFeatured}
          watchDifficulty={watchDifficulty}
          watchSlug={watchSlug}
          watchName={watchName}
          isEditing={false}
        />
      )}
    </form>
  );
}

interface FormFieldsProps {
  register: any;
  setValue: any;
  watchCoverImage: string | null;
  watchPublished: boolean;
  watchFeatured: boolean;
  watchDifficulty: string | undefined;
  watchSlug: string;
  watchName: string;
  gameId?: string;
  game?: Game | null;
  isEditing?: boolean;
}

function FormFields({
  register,
  setValue,
  watchCoverImage,
  watchPublished,
  watchFeatured,
  watchDifficulty,
  watchSlug,
  watchName,
  gameId,
  game,
  isEditing,
}: FormFieldsProps) {
  // Utiliser la valeur du jeu si disponible, sinon watchDifficulty
  const currentDifficulty = game?.difficulty || watchDifficulty || 'intermediate';

  // BGG import state
  const [selectedBggId, setSelectedBggId] = useState<number | null>(null);
  const { data: bggGameData } = useBggGame(selectedBggId || undefined);

  // Auto-import when BGG data is loaded
  useEffect(() => {
    if (bggGameData && selectedBggId) {
      // Fill form fields
      if (!isEditing) {
        setValue('name', bggGameData.name);
        setValue('slug', slugify(bggGameData.name));
      }

      if (bggGameData.min_players) setValue('player_count_min', bggGameData.min_players);
      if (bggGameData.max_players) setValue('player_count_max', bggGameData.max_players);
      if (bggGameData.min_playtime) setValue('play_time_min', bggGameData.min_playtime);
      if (bggGameData.max_playtime) setValue('play_time_max', bggGameData.max_playtime);
      if (bggGameData.rating) setValue('bgg_rating', Math.round(bggGameData.rating * 10) / 10);
      if (bggGameData.image_url) setValue('cover_image_url', bggGameData.image_url);
      setValue('bgg_url', `https://boardgamegeek.com/boardgame/${bggGameData.bgg_id}`);

      // Set difficulty based on weight
      const difficulty = weightToDifficulty(bggGameData.weight);
      setValue('difficulty', difficulty);

      toast.success(`Données importées depuis BGG (difficulté: ${difficulty === 'beginner' ? 'débutant' : difficulty === 'intermediate' ? 'intermédiaire' : 'expert'})`);
      setSelectedBggId(null);
    }
  }, [bggGameData, selectedBggId, isEditing, setValue]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {/* BGG Import */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Importer depuis BGG
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Rechercher un jeu dans la base BGG</Label>
              <BggGameSearch
                value={{ bgg_id: 0, name: '' }}
                onChange={(game) => {
                  if (game.bgg_id) {
                    setSelectedBggId(game.bgg_id);
                  }
                }}
                placeholder="Rechercher un jeu pour pré-remplir les champs..."
              />
              <p className="text-xs text-muted-foreground">
                Sélectionner un jeu pour remplir automatiquement les paramètres (joueurs, durée, note, difficulté, image)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du jeu *</Label>
                <Input id="name" {...register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" {...register('slug')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register('description')} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Difficulté</Label>
              <Select
                value={currentDifficulty}
                onValueChange={(v) => setValue('difficulty', v as 'beginner' | 'intermediate' | 'expert')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de joueurs</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    {...register('player_count_min', { valueAsNumber: true })}
                    className="w-20"
                  />
                  <span>à</span>
                  <Input
                    type="number"
                    {...register('player_count_max', { valueAsNumber: true })}
                    className="w-20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    {...register('play_time_min', { valueAsNumber: true })}
                    className="w-20"
                  />
                  <span>à</span>
                  <Input
                    type="number"
                    {...register('play_time_max', { valueAsNumber: true })}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Âge minimum</Label>
                <Input type="number" {...register('min_age', { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Note BGG</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...register('bgg_rating', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liens & Identification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL BoardGameGeek</Label>
              <Input {...register('bgg_url')} placeholder="https://boardgamegeek.com/..." />
            </div>
            <div className="space-y-2">
              <Label>Lien affilié</Label>
              <Input
                {...register('affiliate_url')}
                placeholder="https://www.philibert.com/..."
              />
              <p className="text-xs text-muted-foreground">
                Lien pour acheter le jeu (Amazon, Philibert...)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Image de couverture</CardTitle>
          </CardHeader>
          <CardContent>
            <ImageUpload
              value={watchCoverImage}
              onChange={(url) => setValue('cover_image_url', url)}
              bucket="game-covers"
              folder={gameId}
              filePrefix={watchSlug || watchName}
              aspectRatio="video"
              showUrlInput={true}
            />
            {!watchCoverImage && (
              <div className="mt-4 aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Publié</Label>
                <p className="text-xs text-muted-foreground">Visible dans l'application</p>
              </div>
              <Switch
                checked={watchPublished}
                onCheckedChange={(c) => setValue('published', c)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>En vedette</Label>
                <p className="text-xs text-muted-foreground">Mis en avant sur l'accueil</p>
              </div>
              <Switch
                checked={watchFeatured}
                onCheckedChange={(c) => setValue('featured', c)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}