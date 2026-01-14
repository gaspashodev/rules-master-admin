import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConcept,
  useUpdateConcept,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useReorderBlocks,
} from '@/hooks/useConcepts';
import { useGame } from '@/hooks/useGames';
import { QuizEditor } from '@/components/quiz/QuizEditor';
import { MobilePreview } from '@/components/preview/MobilePreview';
import { SectionEditor } from '@/components/sections';
import type { SectionFormData, BlockFormData, LessonSection, SectionBlock } from '@/types/database';
import {
  ArrowLeft,
  Save,
  Plus,
  GripVertical,
  Trash2,
  Pencil,
  Clock,
  RefreshCw,
  LayoutGrid,
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

// ============ COMPOSANT SECTION SORTABLE WRAPPER ============

interface SortableSectionWrapperProps {
  section: LessonSection;
  onEditSection: (section: LessonSection) => void;
  onDeleteSection: (id: string) => void;
  children: React.ReactNode;
}

function SortableSectionWrapper({
  section,
  onEditSection,
  onDeleteSection,
  children,
}: SortableSectionWrapperProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Actions de section flottantes */}
      <div className="absolute -left-12 top-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          className="p-1.5 rounded bg-background border shadow-sm hover:bg-muted cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded bg-background border shadow-sm hover:bg-muted"
          onClick={() => onEditSection(section)}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded bg-background border shadow-sm hover:bg-destructive/10 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera également tous les blocs de cette section.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDeleteSection(section.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {children}
    </div>
  );
}

// ============ COMPOSANT PRINCIPAL ============

export function ConceptFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: concept, isLoading } = useConcept(id);
  const { data: game } = useGame(concept?.game_id);
  const updateConcept = useUpdateConcept();
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  const reorderSections = useReorderSections();
  const createBlock = useCreateBlock();
  const updateBlock = useUpdateBlock();
  const deleteBlock = useDeleteBlock();
  const reorderBlocks = useReorderBlocks();

  // États du concept
  const [name, setName] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [estimatedTime, setEstimatedTime] = useState(5);

  // États des dialogs
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LessonSection | null>(null);

  // État de prévisualisation mobile
  const [previewSection, setPreviewSection] = useState<(LessonSection & { blocks: SectionBlock[] }) | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Formulaires
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    order_index: 1,
    title: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (concept) {
      setName(concept.name || '');
      setOrderIndex(concept.order_index || 1);
      setEstimatedTime(concept.estimated_time || 5);
    }
  }, [concept]);

  // ============ HANDLERS CONCEPT ============

  const handleSaveSettings = async () => {
    if (!id) return;
    await updateConcept.mutateAsync({
      id,
      data: {
        name,
        order_index: orderIndex,
        estimated_time: estimatedTime,
      },
    });
  };

  // ============ HANDLERS SECTIONS ============

  const handleSectionDragEnd = (event: DragEndEvent) => {
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

  const openAddSectionDialog = () => {
    setEditingSection(null);
    setSectionForm({
      order_index: (concept?.sections?.length || 0) + 1,
      title: '',
    });
    setIsSectionDialogOpen(true);
  };

  const openEditSectionDialog = (section: LessonSection) => {
    setEditingSection(section);
    setSectionForm({
      order_index: section.order_index,
      title: section.title || '',
    });
    setIsSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!id) return;
    if (editingSection) {
      await updateSection.mutateAsync({
        id: editingSection.id,
        conceptId: id,
        data: sectionForm,
      });
    } else {
      await createSection.mutateAsync({
        conceptId: id,
        data: sectionForm,
      });
    }
    setIsSectionDialogOpen(false);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (!id) return;
    deleteSection.mutate({ id: sectionId, conceptId: id });
  };

  // ============ HANDLERS BLOCS ============

  const handleDeleteBlock = (blockId: string) => {
    if (!id) return;
    deleteBlock.mutate({ id: blockId, conceptId: id });
  };

  const handleReorderBlocks = (_sectionId: string, blocks: SectionBlock[]) => {
    if (!id) return;
    const updates = blocks.map((block, index) => ({
      id: block.id,
      order_index: index + 1,
    }));
    reorderBlocks.mutate({ conceptId: id, blocks: updates });
  };

  // ============ HANDLERS INLINE (SECTION EDITOR) ============

  const handleUpdateBlockInline = (blockId: string, data: Partial<BlockFormData>) => {
    if (!id) return;
    updateBlock.mutate({ id: blockId, conceptId: id, data });
  };

  const handleCreateBlockInline = (sectionId: string, data: BlockFormData, insertIndex?: number) => {
    if (!id) return;
    
    const section = concept?.sections?.find((s) => s.id === sectionId);
    const blocks = section?.blocks || [];
    
    // Calculer le bon order_index
    let orderIndex: number;
    if (insertIndex !== undefined && blocks.length > 0) {
      // Insertion à une position spécifique
      // On doit d'abord réordonner les blocs existants pour faire de la place
      const blocksToUpdate = blocks
        .filter((b) => b.order_index > insertIndex)
        .map((b) => ({ id: b.id, order_index: b.order_index + 1 }));
      
      if (blocksToUpdate.length > 0) {
        reorderBlocks.mutate({ conceptId: id, blocks: blocksToUpdate });
      }
      
      orderIndex = insertIndex + 1;
    } else {
      orderIndex = blocks.length + 1;
    }
    
    createBlock.mutate({
      sectionId,
      conceptId: id,
      data: { ...data, order_index: orderIndex },
    });
  };

  // ============ CALCUL TEMPS ESTIMÉ ============

  const calculateEstimatedTime = () => {
    let totalMinutes = 0;
    const WORDS_PER_MINUTE = 200;

    // Blocs de toutes les sections
    concept?.sections?.forEach((section) => {
      section.blocks?.forEach((block) => {
        const words = block.content?.split(/\s+/).length || 0;
        totalMinutes += words / WORDS_PER_MINUTE;
        if (block.block_type === 'image') totalMinutes += 0.25;
        if (block.block_type === 'video') totalMinutes += 0.5;
      });
    });

    return Math.max(1, Math.ceil(totalMinutes));
  };

  // ============ RENDU ============

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/games/${concept.game_id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{concept.name}</h1>
          </div>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="quiz">Quiz</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        {/* ============ ONGLET CONTENU ============ */}
        <TabsContent value="content" className="space-y-6">
          {/* Sections */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sections / Cartes ({concept.sections?.length || 0})</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Chaque section représente une carte dans l'app mobile
                </p>
              </div>
              <Button size="sm" onClick={openAddSectionDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle section
              </Button>
            </CardHeader>
            <CardContent>
              {concept.sections?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune section. Créez des sections pour organiser votre contenu.
                  </p>
                  <Button size="sm" onClick={openAddSectionDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer la première section
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleSectionDragEnd}
                >
                  <SortableContext
                    items={concept.sections?.map((s) => s.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-6">
                      {concept.sections?.map((section) => (
                        <SortableSectionWrapper
                          key={section.id}
                          section={section}
                          onEditSection={openEditSectionDialog}
                          onDeleteSection={handleDeleteSection}
                        >
                          <SectionEditor
                            section={section}
                            conceptId={id!}
                            gameSlug={game?.slug || game?.name}
                            onUpdateBlock={handleUpdateBlockInline}
                            onCreateBlock={handleCreateBlockInline}
                            onDeleteBlock={handleDeleteBlock}
                            onReorderBlocks={handleReorderBlocks}
                            onPreview={() => {
                              setPreviewSection(section as LessonSection & { blocks: SectionBlock[] });
                              setIsPreviewOpen(true);
                            }}
                          />
                        </SortableSectionWrapper>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ONGLET QUIZ ============ */}
        <TabsContent value="quiz">
          <QuizEditor conceptId={id!} />
        </TabsContent>

        {/* ============ ONGLET PARAMÈTRES ============ */}
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
                      onClick={() => setEstimatedTime(calculateEstimatedTime())}
                      title="Calculer automatiquement"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Temps calculé : {calculateEstimatedTime()} min
                  </p>
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

      {/* ============ DIALOG SECTION ============ */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Modifier la section' : 'Nouvelle section'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre de la section (optionnel)</Label>
              <Input
                value={sectionForm.title || ''}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                placeholder="Ex: Mise en place, Tour de jeu..."
              />
              <p className="text-xs text-muted-foreground">
                Ce titre apparaîtra en haut de la carte dans l'application
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveSection}
              disabled={createSection.isPending || updateSection.isPending}
            >
              {editingSection ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de prévisualisation mobile */}
      {previewSection && (
        <MobilePreview
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          conceptName={name || concept?.name || 'Concept'}
          section={previewSection}
        />
      )}
    </div>
  );
}