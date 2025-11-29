import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  useVideoResources,
  useCreateVideoResource,
  useUpdateVideoResource,
  useDeleteVideoResource,
  useReorderVideoResources,
  useGameRules,
  useCreateGameRule,
  useUpdateGameRule,
  useDeleteGameRule,
  useReorderGameRules,
} from '@/hooks/useResources';
import type { VideoResource, VideoResourceFormData, GameRule, GameRuleFormData } from '@/types/database';
import { Plus, GripVertical, Trash2, Pencil, Video, FileText, ExternalLink, Globe } from 'lucide-react';

interface ResourcesEditorProps {
  gameId: string;
}

const LANGUAGES = [
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'en', label: '🇬🇧 Anglais' },
  { value: 'de', label: '🇩🇪 Allemand' },
  { value: 'es', label: '🇪🇸 Espagnol' },
  { value: 'it', label: '🇮🇹 Italien' },
];

// ============ SORTABLE VIDEO ITEM ============

function SortableVideoItem({
  video,
  onEdit,
  onDelete,
}: {
  video: VideoResource;
  onEdit: (video: VideoResource) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const langLabel = LANGUAGES.find(l => l.value === video.language)?.label || video.language;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
        <Video className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{video.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{video.channel}</span>
          <span>•</span>
          <span>{video.duration} min</span>
          <span>•</span>
          <span>{langLabel}</span>
        </div>
      </div>

      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-accent rounded-lg transition-colors"
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(video)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette vidéo ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(video.id)} className="bg-destructive text-destructive-foreground">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ============ SORTABLE RULE ITEM ============

function SortableRuleItem({
  rule,
  onEdit,
  onDelete,
}: {
  rule: GameRule;
  onEdit: (rule: GameRule) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const langLabel = LANGUAGES.find(l => l.value === rule.language)?.label || rule.language;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
        <FileText className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{rule.title}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-3 w-3" />
          <span>{langLabel}</span>
        </div>
      </div>

      <a
        href={rule.pdf_url}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 hover:bg-accent rounded-lg transition-colors"
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(rule)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette règle ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(rule.id)} className="bg-destructive text-destructive-foreground">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function ResourcesEditor({ gameId }: ResourcesEditorProps) {
  // Videos
  const { data: videos, isLoading: videosLoading } = useVideoResources(gameId);
  const createVideo = useCreateVideoResource();
  const updateVideo = useUpdateVideoResource();
  const deleteVideo = useDeleteVideoResource();
  const reorderVideos = useReorderVideoResources();

  // Rules
  const { data: rules, isLoading: rulesLoading } = useGameRules(gameId);
  const createRule = useCreateGameRule();
  const updateRule = useUpdateGameRule();
  const deleteRule = useDeleteGameRule();
  const reorderRules = useReorderGameRules();

  // Dialog states
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoResource | null>(null);
  const [editingRule, setEditingRule] = useState<GameRule | null>(null);

  // Form states
  const [videoForm, setVideoForm] = useState<VideoResourceFormData>({
    title: '',
    channel: '',
    url: '',
    thumbnail_url: null,
    duration: 10,
    language: 'fr',
    order_index: 1,
  });

  const [ruleForm, setRuleForm] = useState<GameRuleFormData>({
    title: '',
    pdf_url: '',
    language: 'fr',
    order_index: 1,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ============ VIDEO HANDLERS ============

  const handleVideoDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && videos) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);
      const reordered = arrayMove(videos, oldIndex, newIndex);
      const updates = reordered.map((v, index) => ({ id: v.id, order_index: index + 1 }));
      reorderVideos.mutate({ gameId, videos: updates });
    }
  };

  const openAddVideoDialog = () => {
    setEditingVideo(null);
    setVideoForm({
      title: '',
      channel: '',
      url: '',
      thumbnail_url: null,
      duration: 10,
      language: 'fr',
      order_index: (videos?.length || 0) + 1,
    });
    setIsVideoDialogOpen(true);
  };

  const openEditVideoDialog = (video: VideoResource) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      channel: video.channel,
      url: video.url,
      thumbnail_url: video.thumbnail_url,
      duration: video.duration,
      language: video.language,
      order_index: video.order_index,
    });
    setIsVideoDialogOpen(true);
  };

  const handleSaveVideo = async () => {
    if (editingVideo) {
      await updateVideo.mutateAsync({ id: editingVideo.id, gameId, data: videoForm });
    } else {
      await createVideo.mutateAsync({ gameId, data: videoForm });
    }
    setIsVideoDialogOpen(false);
  };

  // ============ RULE HANDLERS ============

  const handleRuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && rules) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      const reordered = arrayMove(rules, oldIndex, newIndex);
      const updates = reordered.map((r, index) => ({ id: r.id, order_index: index + 1 }));
      reorderRules.mutate({ gameId, rules: updates });
    }
  };

  const openAddRuleDialog = () => {
    setEditingRule(null);
    setRuleForm({
      title: '',
      pdf_url: '',
      language: 'fr',
      order_index: (rules?.length || 0) + 1,
    });
    setIsRuleDialogOpen(true);
  };

  const openEditRuleDialog = (rule: GameRule) => {
    setEditingRule(rule);
    setRuleForm({
      title: rule.title,
      pdf_url: rule.pdf_url,
      language: rule.language,
      order_index: rule.order_index,
    });
    setIsRuleDialogOpen(true);
  };

  const handleSaveRule = async () => {
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, gameId, data: ruleForm });
    } else {
      await createRule.mutateAsync({ gameId, data: ruleForm });
    }
    setIsRuleDialogOpen(false);
  };

  return (
    <>
      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos" className="gap-2">
            <Video className="h-4 w-4" />
            Vidéos ({videos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <FileText className="h-4 w-4" />
            Règles PDF ({rules?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* ============ VIDEOS TAB ============ */}
        <TabsContent value="videos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Vidéos de règles</CardTitle>
              <Button size="sm" onClick={openAddVideoDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {videosLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : videos?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Video className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Aucune vidéo pour ce jeu</p>
                  <Button size="sm" onClick={openAddVideoDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une vidéo
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleVideoDragEnd}>
                  <SortableContext items={videos?.map(v => v.id) || []} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {videos?.map((video) => (
                        <SortableVideoItem
                          key={video.id}
                          video={video}
                          onEdit={openEditVideoDialog}
                          onDelete={(id) => deleteVideo.mutate({ id, gameId })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ RULES TAB ============ */}
        <TabsContent value="rules">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Règles PDF</CardTitle>
              <Button size="sm" onClick={openAddRuleDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Chargement...</div>
              ) : rules?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">Aucune règle PDF pour ce jeu</p>
                  <Button size="sm" onClick={openAddRuleDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une règle
                  </Button>
                </div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRuleDragEnd}>
                  <SortableContext items={rules?.map(r => r.id) || []} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {rules?.map((rule) => (
                        <SortableRuleItem
                          key={rule.id}
                          rule={rule}
                          onEdit={openEditRuleDialog}
                          onDelete={(id) => deleteRule.mutate({ id, gameId })}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============ VIDEO DIALOG ============ */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingVideo ? 'Modifier la vidéo' : 'Nouvelle vidéo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="Explication des règles en 10 minutes"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Chaîne / Auteur *</Label>
                <Input
                  value={videoForm.channel}
                  onChange={(e) => setVideoForm({ ...videoForm, channel: e.target.value })}
                  placeholder="Ludochrono"
                />
              </div>
              <div className="space-y-2">
                <Label>Durée (minutes) *</Label>
                <Input
                  type="number"
                  min={1}
                  value={videoForm.duration}
                  onChange={(e) => setVideoForm({ ...videoForm, duration: parseInt(e.target.value) || 0 })}
                  placeholder="10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>URL de la vidéo *</Label>
              <Input
                value={videoForm.url}
                onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="space-y-2">
              <Label>URL de la miniature (optionnel)</Label>
              <Input
                value={videoForm.thumbnail_url || ''}
                onChange={(e) => setVideoForm({ ...videoForm, thumbnail_url: e.target.value || null })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select value={videoForm.language} onValueChange={(v) => setVideoForm({ ...videoForm, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVideoDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSaveVideo}
              disabled={!videoForm.title || !videoForm.url || !videoForm.channel || !videoForm.duration || createVideo.isPending || updateVideo.isPending}
            >
              {editingVideo ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ RULE DIALOG ============ */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Modifier la règle' : 'Nouvelle règle PDF'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={ruleForm.title}
                onChange={(e) => setRuleForm({ ...ruleForm, title: e.target.value })}
                placeholder="Règles complètes"
              />
              <p className="text-sm text-muted-foreground">
                Ex: "Règles complètes", "Aide de jeu", "FAQ officielle"
              </p>
            </div>
            <div className="space-y-2">
              <Label>URL du PDF *</Label>
              <Input
                value={ruleForm.pdf_url}
                onChange={(e) => setRuleForm({ ...ruleForm, pdf_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label>Langue</Label>
              <Select value={ruleForm.language} onValueChange={(v) => setRuleForm({ ...ruleForm, language: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handleSaveRule}
              disabled={!ruleForm.title || !ruleForm.pdf_url || createRule.isPending || updateRule.isPending}
            >
              {editingRule ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}