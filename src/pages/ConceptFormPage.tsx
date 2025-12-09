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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
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
import { QuizEditor } from '@/components/quiz/QuizEditor';
import type { SectionFormData, BlockFormData, LessonSection, SectionBlock } from '@/types/database';
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
  ChevronDown,
  ChevronUp,
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

// ============ CONSTANTES ============

const blockTypes = [
  { value: 'text', label: 'Texte', icon: FileText, color: 'bg-blue-500' },
  { value: 'image', label: 'Image', icon: Image, color: 'bg-green-500' },
  { value: 'video', label: 'Vidéo', icon: Video, color: 'bg-red-500' },
  { value: 'tip', label: 'Astuce', icon: Lightbulb, color: 'bg-yellow-500' },
  { value: 'example', label: 'Exemple', icon: Code, color: 'bg-purple-500' },
];

const getBlockTypeInfo = (type: string) => {
  return blockTypes.find((t) => t.value === type) || blockTypes[0];
};

const MAX_BLOCKS_PER_SECTION = 6;
const MAX_CONTENT_LENGTH = 1500;

// ============ COMPOSANT BLOC SORTABLE ============

interface SortableBlockItemProps {
  block: SectionBlock;
  onEdit: (block: SectionBlock) => void;
  onDelete: (id: string) => void;
}

function SortableBlockItem({ block, onEdit, onDelete }: SortableBlockItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeInfo = getBlockTypeInfo(block.block_type);
  const Icon = typeInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-md border bg-background hover:bg-accent/30 transition-colors group"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className={`p-1.5 rounded ${typeInfo.color}`}>
        <Icon className="h-3 w-3 text-white" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {block.block_type === 'image' && block.image_url
            ? block.alt_text || 'Image'
            : block.block_type === 'video' && block.video_url
            ? block.alt_text || 'Vidéo'
            : block.content.substring(0, 60)}
          {block.content.length > 60 && '...'}
        </p>
      </div>

      {block.block_type === 'image' && block.image_url && (
        <img
          src={block.image_url}
          alt={block.alt_text || ''}
          className="h-8 w-12 object-cover rounded"
        />
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => onEdit(block)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive">
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce bloc ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(block.id)}
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

// ============ COMPOSANT SECTION/CARTE ============

interface SectionCardProps {
  section: LessonSection;
  onEditSection: (section: LessonSection) => void;
  onDeleteSection: (id: string) => void;
  onAddBlock: (sectionId: string) => void;
  onEditBlock: (block: SectionBlock, sectionId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onReorderBlocks: (sectionId: string, blocks: SectionBlock[]) => void;
}

function SectionCard({
  section,
  onEditSection,
  onDeleteSection,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onReorderBlocks,
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && section.blocks) {
      const oldIndex = section.blocks.findIndex((b) => b.id === active.id);
      const newIndex = section.blocks.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(section.blocks, oldIndex, newIndex);
      onReorderBlocks(section.id, reordered);
    }
  };

  const blocksCount = section.blocks?.length || 0;
  const canAddMoreBlocks = blocksCount < MAX_BLOCKS_PER_SECTION;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header de la section */}
      <div className="flex items-center gap-3 p-4 bg-muted/30 border-b">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <LayoutGrid className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {section.title || `Section ${section.order_index}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {blocksCount} bloc{blocksCount > 1 ? 's' : ''} • Max {MAX_BLOCKS_PER_SECTION}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAddBlock(section.id)}
            disabled={!canAddMoreBlocks}
          >
            <Plus className="h-3 w-3 mr-1" />
            Bloc
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => onEditSection(section)}
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
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Contenu (blocs) */}
      {isExpanded && (
        <div className="p-4">
          {blocksCount === 0 ? (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <p className="text-sm">Aucun bloc dans cette section</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onAddBlock(section.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter un bloc
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleBlockDragEnd}
            >
              <SortableContext
                items={section.blocks?.map((b) => b.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {section.blocks?.map((block) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      onEdit={(b) => onEditBlock(b, section.id)}
                      onDelete={onDeleteBlock}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

// ============ FORMULAIRE DE BLOC ============

interface BlockFormProps {
  form: BlockFormData;
  setForm: (f: BlockFormData) => void;
  conceptId: string;
}

function BlockForm({ form, setForm, conceptId }: BlockFormProps) {
  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Type de bloc</Label>
        <Select
          value={form.block_type}
          onValueChange={(v: BlockFormData['block_type']) =>
            setForm({ ...form, block_type: v })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {blockTypes.map((type) => {
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

      {form.block_type === 'image' ? (
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
          <RichTextEditor
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
            label="Légende (optionnel)"
            placeholder="Texte explicatif pour accompagner l'image..."
            rows={3}
            maxLength={MAX_CONTENT_LENGTH}
          />
        </>
      ) : form.block_type === 'video' ? (
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
            <Label>Description</Label>
            <Input
              value={form.alt_text || ''}
              onChange={(e) => setForm({ ...form, alt_text: e.target.value })}
              placeholder="Description de la vidéo"
            />
          </div>
          <RichTextEditor
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
            label="Texte associé (optionnel)"
            placeholder="Texte explicatif pour accompagner la vidéo..."
            rows={3}
            maxLength={MAX_CONTENT_LENGTH}
          />
        </>
      ) : (
        <RichTextEditor
          value={form.content}
          onChange={(value) => setForm({ ...form, content: value })}
          label="Contenu *"
          placeholder={
            form.block_type === 'tip'
              ? 'Astuce ou conseil utile...'
              : form.block_type === 'example'
              ? 'Exemple concret ou cas pratique...'
              : 'Contenu du bloc...'
          }
          rows={6}
          maxLength={MAX_CONTENT_LENGTH}
        />
      )}
    </div>
  );
}

// ============ COMPOSANT PRINCIPAL ============

export function ConceptFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: concept, isLoading } = useConcept(id);
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
  const [introduction, setIntroduction] = useState('');
  const [summary, setSummary] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [estimatedTime, setEstimatedTime] = useState(5);

  // États des dialogs
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<LessonSection | null>(null);
  const [editingBlock, setEditingBlock] = useState<SectionBlock | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Formulaires
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    order_index: 1,
    title: '',
  });
  const [blockForm, setBlockForm] = useState<BlockFormData>({
    block_type: 'text',
    order_index: 1,
    content: '',
    image_url: null,
    video_url: null,
    alt_text: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  // ============ HANDLERS CONCEPT ============

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

  const openAddBlockDialog = (sectionId: string) => {
    const section = concept?.sections?.find((s) => s.id === sectionId);
    const blocksCount = section?.blocks?.length || 0;

    setEditingBlock(null);
    setCurrentSectionId(sectionId);
    setBlockForm({
      block_type: 'text',
      order_index: blocksCount + 1,
      content: '',
      image_url: null,
      video_url: null,
      alt_text: null,
    });
    setIsBlockDialogOpen(true);
  };

  const openEditBlockDialog = (block: SectionBlock, sectionId: string) => {
    setEditingBlock(block);
    setCurrentSectionId(sectionId);
    setBlockForm({
      block_type: block.block_type,
      order_index: block.order_index,
      content: block.content,
      image_url: block.image_url,
      video_url: block.video_url,
      alt_text: block.alt_text,
    });
    setIsBlockDialogOpen(true);
  };

  const handleSaveBlock = async () => {
    if (!id || !currentSectionId) return;
    if (editingBlock) {
      await updateBlock.mutateAsync({
        id: editingBlock.id,
        conceptId: id,
        data: blockForm,
      });
    } else {
      await createBlock.mutateAsync({
        sectionId: currentSectionId,
        conceptId: id,
        data: blockForm,
      });
    }
    setIsBlockDialogOpen(false);
  };

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

  // ============ CALCUL TEMPS ESTIMÉ ============

  const calculateEstimatedTime = () => {
    let totalMinutes = 0;
    const WORDS_PER_MINUTE = 200;

    // Introduction
    if (introduction) {
      totalMinutes += introduction.split(/\s+/).length / WORDS_PER_MINUTE;
    }

    // Blocs
    concept?.sections?.forEach((section) => {
      section.blocks?.forEach((block) => {
        const words = block.content?.split(/\s+/).length || 0;
        totalMinutes += words / WORDS_PER_MINUTE;
        if (block.block_type === 'image') totalMinutes += 0.25;
        if (block.block_type === 'video') totalMinutes += 0.5;
      });
    });

    // Résumé
    if (summary) {
      totalMinutes += summary.split(/\s+/).length / WORDS_PER_MINUTE;
    }

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

        {/* ============ ONGLET CONTENU ============ */}
        <TabsContent value="content" className="space-y-6">
          {/* Introduction */}
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
                    <div className="space-y-4">
                      {concept.sections?.map((section) => (
                        <SectionCard
                          key={section.id}
                          section={section}
                          onEditSection={openEditSectionDialog}
                          onDeleteSection={handleDeleteSection}
                          onAddBlock={openAddBlockDialog}
                          onEditBlock={openEditBlockDialog}
                          onDeleteBlock={handleDeleteBlock}
                          onReorderBlocks={handleReorderBlocks}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* Résumé */}
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

      {/* ============ DIALOG BLOC ============ */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? 'Modifier le bloc' : 'Nouveau bloc'}
            </DialogTitle>
          </DialogHeader>
          <BlockForm form={blockForm} setForm={setBlockForm} conceptId={id!} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveBlock}
              disabled={
                createBlock.isPending ||
                updateBlock.isPending ||
                (blockForm.block_type !== 'image' &&
                  blockForm.block_type !== 'video' &&
                  !blockForm.content)
              }
            >
              {editingBlock ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}