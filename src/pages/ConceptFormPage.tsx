import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ImageUpload } from '@/components/ui/image-upload';
import {
  useConcept,
  useUpdateConcept,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
} from '@/hooks/useConcepts';
import { QuizEditor } from '@/components/quiz/QuizEditor';
import type { SectionFormData, LessonSection } from '@/types/database';
import { calculateEstimatedTime } from '@/lib/utils';
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  FileText,
  Image,
  Video,
  Lightbulb,
  Code,
  Clock,
  RefreshCw,
} from 'lucide-react';

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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const sectionTypes = [
  { value: 'text', label: 'Texte', icon: FileText, color: 'bg-blue-500' },
  { value: 'image', label: 'Image', icon: Image, color: 'bg-green-500' },
  { value: 'video', label: 'Vidéo', icon: Video, color: 'bg-red-500' },
  { value: 'tip', label: 'Astuce', icon: Lightbulb, color: 'bg-yellow-500' },
  { value: 'example', label: 'Exemple', icon: Code, color: 'bg-purple-500' },
];

const getSectionTypeInfo = (type: string) => {
  return sectionTypes.find((t) => t.value === type) || sectionTypes[0];
};

interface SortableSectionItemProps {
  section: LessonSection;
  onEdit: (section: LessonSection) => void;
  onDelete: (id: string) => void;
}

function SortableSectionItem({ section, onEdit, onDelete }: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = getSectionTypeInfo(section.section_type);
  const Icon = typeInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group bg-card"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="cursor-grab active:cursor-grabbing touch-none h-8 w-8"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div className={`p-2 rounded ${typeInfo.color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{typeInfo.label}</Badge>
          {section.title && <span className="font-medium">{section.title}</span>}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-1">
          {section.section_type === 'image' && section.image_url
            ? section.alt_text || 'Image sans description'
            : section.content.substring(0, 80)}
          {section.content.length > 80 && '...'}
        </p>
      </div>
      {section.section_type === 'image' && section.image_url && (
        <img
          src={section.image_url}
          alt={section.alt_text || ''}
          className="h-12 w-16 object-cover rounded"
        />
      )}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onEdit(section)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(section.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function ConceptFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: concept, isLoading } = useConcept(id);
  const updateConcept = useUpdateConcept();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();

  const [introduction, setIntroduction] = useState('');
  const [summary, setSummary] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [estimatedTime, setEstimatedTime] = useState(5);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LessonSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    section_type: 'text',
    order_index: 1,
    title: '',
    content: '',
    image_url: null,
    video_url: null,
    alt_text: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (concept) {
      setIntroduction(concept.introduction || '');
      setSummary(concept.summary || '');
      setName(concept.name || '');
      setDescription(concept.description || '');
      setOrderIndex(concept.order_index || 1);
      setDifficulty(concept.difficulty || 1);
      setEstimatedTime(concept.estimated_time || 5);
    }
  }, [concept]);

  const handleSave = async () => {
    if (!id) return;
    await updateConcept.mutateAsync({
      id,
      data: { introduction, summary },
    });
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    await updateConcept.mutateAsync({
      id,
      data: { 
        name, 
        description, 
        order_index: orderIndex, 
        difficulty, 
        estimated_time: estimatedTime 
      },
    });
  };

  const handleAddSection = async () => {
    if (!id) return;
    await createSection.mutateAsync({
      conceptId: id,
      data: {
        ...sectionForm,
        order_index: (concept?.sections?.length || 0) + 1,
      },
    });
    setIsAddDialogOpen(false);
    resetSectionForm();
  };

  const handleEditSection = async () => {
    if (!id || !editingSection) return;
    await updateSection.mutateAsync({
      id: editingSection.id,
      conceptId: id,
      data: sectionForm,
    });
    setEditingSection(null);
    resetSectionForm();
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!id) return;
    deleteSection.mutate({ id: sectionId, conceptId: id });
  };

  const resetSectionForm = () => {
    setSectionForm({
      section_type: 'text',
      order_index: 1,
      title: '',
      content: '',
      image_url: null,
      video_url: null,
      alt_text: null,
    });
  };

  const openEditDialog = (section: LessonSection) => {
    setEditingSection(section);
    setSectionForm({
      section_type: section.section_type,
      order_index: section.order_index,
      title: section.title || '',
      content: section.content,
      image_url: section.image_url,
      video_url: section.video_url,
      alt_text: section.alt_text,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && concept?.sections) {
      const oldIndex = concept.sections.findIndex((s) => s.id === active.id);
      const newIndex = concept.sections.findIndex((s) => s.id === over.id);

      const reordered = arrayMove(concept.sections, oldIndex, newIndex);
      const updates = reordered.map((section, index) => ({
        id: section.id,
        order_index: index + 1,
      }));

      reorderSections.mutate({ conceptId: id!, sections: updates });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!concept) {
    return <div>Concept non trouvé</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/games/${concept.game_id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{concept.name}</h1>
            <p className="text-muted-foreground">{concept.description}</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateConcept.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={introduction}
                onChange={(e) => setIntroduction(e.target.value)}
                rows={4}
                placeholder="Texte d'introduction..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sections ({concept.sections?.length || 0})</CardTitle>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {concept.sections?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune section. Cliquez sur "Ajouter" pour créer du contenu.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={concept.sections?.map((s) => s.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {concept.sections?.map((section) => (
                        <SortableSectionItem
                          key={section.id}
                          section={section}
                          onEdit={openEditDialog}
                          onDelete={handleDeleteSection}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Résumé</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
                placeholder="Résumé de fin de leçon..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quiz">
          <QuizEditor conceptId={id!} />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres du concept</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom du concept</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nom du concept"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ordre d'affichage</Label>
                  <Input 
                    type="number" 
                    value={orderIndex} 
                    onChange={(e) => setOrderIndex(parseInt(e.target.value) || 1)}
                    min={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du concept"
                  rows={2}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Durée estimée (minutes)</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="number" 
                      value={estimatedTime} 
                      onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 1)}
                      min={1}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const calculatedTime = calculateEstimatedTime(
                          concept?.sections || [],
                          introduction,
                          summary
                        );
                        setEstimatedTime(calculatedTime);
                      }}
                      title="Calculer automatiquement"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {concept?.sections && concept.sections.length > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Temps calculé : {calculateEstimatedTime(concept.sections, introduction, summary)} min
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Difficulté</Label>
                  <Select 
                    value={String(difficulty)} 
                    onValueChange={(v) => setDifficulty(parseInt(v) as 1 | 2 | 3)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">★☆☆ Facile</SelectItem>
                      <SelectItem value="2">★★☆ Moyen</SelectItem>
                      <SelectItem value="3">★★★ Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} disabled={updateConcept.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer les paramètres
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Section Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle section</DialogTitle>
          </DialogHeader>
          <SectionForm form={sectionForm} setForm={setSectionForm} conceptId={id!} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddSection} disabled={createSection.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Section Dialog */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la section</DialogTitle>
          </DialogHeader>
          <SectionForm form={sectionForm} setForm={setSectionForm} conceptId={id!} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)}>
              Annuler
            </Button>
            <Button onClick={handleEditSection} disabled={updateSection.isPending}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SectionFormProps {
  form: SectionFormData;
  setForm: (f: SectionFormData) => void;
  conceptId: string;
}

function SectionForm({ form, setForm, conceptId }: SectionFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Type de section</Label>
        <Select
          value={form.section_type}
          onValueChange={(v: SectionFormData['section_type']) =>
            setForm({ ...form, section_type: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sectionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${type.color}`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    {type.label}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Titre (optionnel)</Label>
        <Input
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Titre de la section"
        />
      </div>

      {form.section_type === 'image' ? (
        <>
          <ImageUpload
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            bucket="lesson-images"
            folder={conceptId}
            label="Image"
            aspectRatio="video"
            showUrlInput={true}
          />
          <div className="space-y-2">
            <Label>Texte alternatif</Label>
            <Input
              value={form.alt_text || ''}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              placeholder="Description de l'image pour l'accessibilité"
            />
          </div>
          <div className="space-y-2">
            <Label>Légende / Contenu associé</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={3}
              placeholder="Texte explicatif pour accompagner l'image..."
            />
          </div>
        </>
      ) : form.section_type === 'video' ? (
        <>
          <div className="space-y-2">
            <Label>URL de la vidéo</Label>
            <Input
              value={form.video_url || ''}
              onChange={(e) => setForm({ ...form, video_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-muted-foreground">
              Supporte YouTube, Vimeo et les liens vidéo directs
            </p>
          </div>
          <div className="space-y-2">
            <Label>Texte alternatif</Label>
            <Input
              value={form.alt_text || ''}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              placeholder="Description de la vidéo"
            />
          </div>
          <div className="space-y-2">
            <Label>Contenu associé</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={3}
              placeholder="Texte explicatif pour accompagner la vidéo..."
            />
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label>Contenu *</Label>
          <Textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={8}
            placeholder={
              form.section_type === 'tip'
                ? 'Astuce ou conseil utile...'
                : form.section_type === 'example'
                ? 'Exemple concret ou cas pratique...'
                : 'Contenu de la section...'
            }
          />
        </div>
      )}
    </div>
  );
}