import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGame, useCreateGame, useUpdateGame } from '@/hooks/useGames';
import { ConceptsList } from '@/components/games/ConceptsList';
import { slugify } from '@/lib/utils';
import type { GameFormData } from '@/types/database';
import { ArrowLeft, Save, Gamepad2 } from 'lucide-react';

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
      rules_pdf_url: null,
      cover_image_url: null,
      published: false,
      featured: false,
    },
  });

  const watchName = watch('name');
  const watchCoverImage = watch('cover_image_url');
  const watchPublished = watch('published');
  const watchFeatured = watch('featured');

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
        rules_pdf_url: game.rules_pdf_url,
        cover_image_url: game.cover_image_url,
        published: game.published,
        featured: game.featured,
      });
    }
  }, [game, reset]);

  const onSubmit = async (data: GameFormData) => {
    if (isEditing && id) {
      await updateGame.mutateAsync({ id, data });
    } else {
      const newGame = await createGame.mutateAsync(data);
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
          </TabsList>
          <TabsContent value="info">
            <FormFields register={register} setValue={setValue} watchCoverImage={watchCoverImage} watchPublished={watchPublished} watchFeatured={watchFeatured} />
          </TabsContent>
          <TabsContent value="concepts">
            <ConceptsList gameId={id!} />
          </TabsContent>
        </Tabs>
      ) : (
        <FormFields register={register} setValue={setValue} watchCoverImage={watchCoverImage} watchPublished={watchPublished} watchFeatured={watchFeatured} />
      )}
    </form>
  );
}

function FormFields({ register, setValue, watchCoverImage, watchPublished, watchFeatured }: any) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
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
              <Select defaultValue="intermediate" onValueChange={(v) => setValue('difficulty', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Input type="number" {...register('player_count_min', { valueAsNumber: true })} className="w-20" />
                  <span>à</span>
                  <Input type="number" {...register('player_count_max', { valueAsNumber: true })} className="w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <div className="flex items-center gap-2">
                  <Input type="number" {...register('play_time_min', { valueAsNumber: true })} className="w-20" />
                  <span>à</span>
                  <Input type="number" {...register('play_time_max', { valueAsNumber: true })} className="w-20" />
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
                <Input type="number" step="0.1" {...register('bgg_rating', { valueAsNumber: true })} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Liens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL BGG</Label>
              <Input {...register('bgg_url')} />
            </div>
            <div className="space-y-2">
              <Label>PDF Règles</Label>
              <Input {...register('rules_pdf_url')} />
            </div>
            <div className="space-y-2">
              <Label>Image couverture</Label>
              <Input {...register('cover_image_url')} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              {watchCoverImage ? (
                <img src={watchCoverImage} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gamepad2 className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Publié</Label>
              <Switch checked={watchPublished} onCheckedChange={(c) => setValue('published', c)} />
            </div>
            <div className="flex items-center justify-between">
              <Label>En vedette</Label>
              <Switch checked={watchFeatured} onCheckedChange={(c) => setValue('featured', c)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}