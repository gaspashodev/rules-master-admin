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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { 
  useQuiz, 
  useCreateQuiz, 
  useQuizQuestions, 
  useCreateQuizQuestion, 
  useUpdateQuizQuestion, 
  useDeleteQuizQuestion,
  useReorderQuizQuestions,
} from '@/hooks/useQuizzes';
import type { QuizQuestion, QuizQuestionFormData } from '@/types/database';
import { ImageUpload } from '@/components/ui/image-upload';
import { Plus, GripVertical, Trash2, Pencil, HelpCircle, CheckCircle2, XCircle, Image } from 'lucide-react';

interface QuizEditorProps {
  conceptId: string;
}

const emptyQuestion: QuizQuestionFormData = {
  question: '',
  options: [
    { id: 'opt-1', text: '' },
    { id: 'opt-2', text: '' },
    { id: 'opt-3', text: '' },
    { id: 'opt-4', text: '' },
  ],
  correct_answer_id: 'opt-1',
  explanation: '',
  difficulty: 'medium',
  order_index: 1,
  image_url: null,
};

const getDifficultyBadge = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return <Badge variant="success">Facile</Badge>;
    case 'medium':
      return <Badge variant="warning">Moyen</Badge>;
    case 'hard':
      return <Badge variant="destructive">Difficile</Badge>;
    default:
      return <Badge variant="secondary">{difficulty}</Badge>;
  }
};

function SortableQuestionItem({
  question,
  index,
  onEdit,
  onDelete,
}: {
  question: QuizQuestion;
  index: number;
  onEdit: (question: QuizQuestion) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors group bg-card"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none mt-1"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
        {index + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium mb-2">{question.question}</p>
        {question.image_url && (
          <div className="mb-2">
            <img 
              src={question.image_url} 
              alt="Question" 
              className="h-16 w-auto rounded object-cover"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {question.options.map((option) => (
            <div
              key={option.id}
              className={`flex items-center gap-2 text-sm p-2 rounded ${
                option.id === question.correct_answer_id
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-muted'
              }`}
            >
              {option.id === question.correct_answer_id ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{option.text || '(vide)'}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {getDifficultyBadge(question.difficulty)}
          {question.image_url && (
            <Badge variant="outline" className="gap-1">
              <Image className="h-3 w-3" />
              Image
            </Badge>
          )}
          {question.explanation && (
            <span className="text-xs text-muted-foreground">
              Explication disponible
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => onEdit(question)}
        >
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
              <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(question.id)}
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

export function QuizEditor({ conceptId }: QuizEditorProps) {
  const { data: quiz, isLoading: quizLoading } = useQuiz(conceptId);
  const createQuiz = useCreateQuiz();
  const { data: questions, isLoading: questionsLoading } = useQuizQuestions(quiz?.id);
  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion();
  const deleteQuestion = useDeleteQuizQuestion();
  const reorderQuestions = useReorderQuizQuestions();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [formData, setFormData] = useState<QuizQuestionFormData>(emptyQuestion);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && questions && quiz) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      
      const reordered = arrayMove(questions, oldIndex, newIndex);
      const updates = reordered.map((q, index) => ({
        id: q.id,
        order_index: index + 1,
      }));

      reorderQuestions.mutate({ quizId: quiz.id, questions: updates });
    }
  };

  const handleCreateQuiz = async () => {
    await createQuiz.mutateAsync(conceptId);
  };

  const handleOpenAddDialog = () => {
    setEditingQuestion(null);
    setFormData({
      ...emptyQuestion,
      order_index: (questions?.length || 0) + 1,
      options: [
        { id: `opt-${Date.now()}-1`, text: '' },
        { id: `opt-${Date.now()}-2`, text: '' },
        { id: `opt-${Date.now()}-3`, text: '' },
        { id: `opt-${Date.now()}-4`, text: '' },
      ],
      image_url: null,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (question: QuizQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      options: question.options,
      correct_answer_id: question.correct_answer_id,
      explanation: question.explanation,
      difficulty: question.difficulty,
      order_index: question.order_index,
      image_url: question.image_url,
    });
    setIsDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!quiz) return;

    if (editingQuestion) {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        quizId: quiz.id,
        data: formData,
      });
    } else {
      await createQuestion.mutateAsync({
        quizId: quiz.id,
        data: formData,
      });
    }
    setIsDialogOpen(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!quiz) return;
    await deleteQuestion.mutateAsync({ id: questionId, quizId: quiz.id });
  };

  const updateOption = (index: number, text: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], text };
    setFormData({ ...formData, options: newOptions });
  };

  if (quizLoading) {
    return <div className="text-center py-8 text-muted-foreground">Chargement...</div>;
  }

  // No quiz yet - show create button
  if (!quiz) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">Aucun quiz pour ce concept</p>
          <Button onClick={handleCreateQuiz} disabled={createQuiz.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Créer un quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Questions ({questions?.length || 0})</CardTitle>
          <Button size="sm" onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </CardHeader>
        <CardContent>
          {questionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : questions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune question. Cliquez sur "Ajouter" pour créer votre première question.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questions?.map(q => q.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {questions?.map((question, index) => (
                    <SortableQuestionItem
                      key={question.id}
                      question={question}
                      index={index}
                      onEdit={handleOpenEditDialog}
                      onDelete={handleDeleteQuestion}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Question Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Modifier la question' : 'Nouvelle question'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Posez votre question..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Image (optionnel)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Ajoutez une image pour illustrer la question
              </p>
              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                bucket="quiz-images"
                folder="questions"
                aspectRatio="video"
              />
            </div>

            <div className="space-y-2">
              <Label>Réponses</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Sélectionnez la bonne réponse en cliquant sur le bouton radio
              </p>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.correct_answer_id === option.id}
                      onChange={() => setFormData({ ...formData, correct_answer_id: option.id })}
                      className="h-4 w-4 text-primary"
                    />
                    <Input
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Réponse ${index + 1}`}
                      className={formData.correct_answer_id === option.id ? 'border-green-500' : ''}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Difficulté</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(v: 'easy' | 'medium' | 'hard') => setFormData({ ...formData, difficulty: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Facile</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="hard">Difficile</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Explication (optionnel)</Label>
              <Textarea
                value={formData.explanation}
                onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                placeholder="Expliquez pourquoi c'est la bonne réponse..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveQuestion}
              disabled={!formData.question || createQuestion.isPending || updateQuestion.isPending}
            >
              {editingQuestion ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}