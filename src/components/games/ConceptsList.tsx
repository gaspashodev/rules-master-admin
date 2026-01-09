import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useConcepts, useCreateConcept, useDeleteConcept, useReorderConcepts } from '@/hooks/useConcepts';
import { Plus, GripVertical, Clock, ChevronRight, Trash2, BookOpen } from 'lucide-react';
import type { ConceptFormData, Concept } from '@/types/database';

interface ConceptsListProps {
  gameId: string;
}

function SortableConceptItem({ concept, onDelete, onNavigate }: { 
  concept: Concept; 
  gameId: string;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: concept.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

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
      
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
        {concept.order_index}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{concept.name}</p>
        <p className="text-sm text-muted-foreground truncate">{concept.description}</p>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {concept.estimated_time} min
        </span>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce concept ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera également toutes les sections et quiz associés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(concept.id)}
                className="bg-destructive text-destructive-foreground"
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onNavigate(concept.id)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ConceptsList({ gameId }: ConceptsListProps) {
  const navigate = useNavigate();
  const { data: concepts, isLoading } = useConcepts(gameId);
  const createConcept = useCreateConcept();
  const deleteConcept = useDeleteConcept();
  const reorderConcepts = useReorderConcepts();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<ConceptFormData>({
    name: '',
    description: '',
    order_index: 1,
    estimated_time: 5,
    introduction: '',
    summary: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px de mouvement minimum pour activer le drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && concepts) {
      const oldIndex = concepts.findIndex((c) => c.id === active.id);
      const newIndex = concepts.findIndex((c) => c.id === over.id);
      
      const reordered = arrayMove(concepts, oldIndex, newIndex);
      const updates = reordered.map((c, index) => ({
        id: c.id,
        order_index: index + 1,
      }));

      reorderConcepts.mutate({ gameId, concepts: updates });
    }
  };

  const handleCreate = async () => {
    await createConcept.mutateAsync({
      gameId,
      data: {
        ...formData,
        order_index: (concepts?.length || 0) + 1,
      },
    });
    setIsDialogOpen(false);
    setFormData({
      name: '',
      description: '',
      order_index: 1,
      estimated_time: 5,
      introduction: '',
      summary: '',
    });
  };

  const handleDelete = (conceptId: string) => {
    deleteConcept.mutate({ id: conceptId, gameId });
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Concepts ({concepts?.length || 0})</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouveau concept</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Les Bases"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée estimée (min)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_time}
                    onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Objectif et déroulement"
                />
              </div>
              <div className="space-y-2">
                <Label>Introduction</Label>
                <Textarea
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  rows={3}
                  placeholder="Texte d'introduction de la leçon..."
                />
              </div>
              <div className="space-y-2">
                <Label>Résumé</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={3}
                  placeholder="Résumé de fin de leçon..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={!formData.name || createConcept.isPending}>
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {concepts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Aucun concept pour ce jeu</p>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer le premier concept
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={concepts?.map(c => c.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {concepts?.map((concept) => (
                  <SortableConceptItem
                    key={concept.id}
                    concept={concept}
                    gameId={gameId}
                    onDelete={handleDelete}
                    onNavigate={(id) => navigate(`/concepts/${id}`)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}