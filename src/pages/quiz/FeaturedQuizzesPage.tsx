import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  useFeaturedQuizzes,
  usePendingQuizzesCount,
  useCreateFeaturedQuiz,
  useUpdateFeaturedQuiz,
  useDeleteFeaturedQuiz,
  useApproveFeaturedQuiz,
  useRejectFeaturedQuiz,
  useToggleFeaturedQuizActive,
  useToggleFeaturedQuizFeatured,
} from '@/hooks/useFeaturedQuizzes';
import { ImageUploader } from '@/components/bgg-quiz';
import { toast } from 'sonner';
import type {
  FeaturedQuiz,
  FeaturedQuizFilters,
  FeaturedQuizFormData,
  FeaturedQuizMode,
  FeaturedQuizQuestion,
  ClassiqueQuestion,
  ExpertQuestion,
} from '@/types/featured-quizzes';
import { QUIZ_MODE_CONFIG, QUIZ_STATUS_CONFIG, QUIZ_CATEGORIES } from '@/types/featured-quizzes';
import {
  Plus,
  Trash2,
  Pencil,
  Star,
  Power,
  PowerOff,
  Search,
  Save,
  Loader2,
  Eye,
  Check,
  X,
  Clock,
  HelpCircle,
} from 'lucide-react';

// ============ QUESTION VIEWER (read-only for review) ============

function QuestionViewer({ question, index, mode }: { question: FeaturedQuizQuestion; index: number; mode: FeaturedQuizMode }) {
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">Q{index + 1}</Badge>
        <p className="text-sm font-medium flex-1">{question.question}</p>
      </div>
      {question.image_url && (
        <img src={question.image_url} alt="" className="h-20 rounded object-cover" />
      )}
      {mode === 'classique' ? (
        <div className="grid grid-cols-2 gap-1.5">
          {question.options.map((opt, i) => (
            <div
              key={i}
              className={`text-xs px-2 py-1 rounded border ${
                i === question.correct_index
                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300'
                  : 'bg-muted/50'
              }`}
            >
              {opt.name || '(vide)'}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs space-y-1">
          <p><span className="text-muted-foreground">Réponse :</span> <span className="font-medium">{(question as ExpertQuestion).correct_answer}</span></p>
          {(question as ExpertQuestion).correct_answer_fr && (
            <p><span className="text-muted-foreground">FR :</span> {(question as ExpertQuestion).correct_answer_fr}</p>
          )}
          {(question as ExpertQuestion).alternative_answers && (question as ExpertQuestion).alternative_answers!.length > 0 && (
            <p><span className="text-muted-foreground">Alternatives :</span> {(question as ExpertQuestion).alternative_answers!.join(', ')}</p>
          )}
        </div>
      )}
      {question.explanation && (
        <p className="text-xs text-muted-foreground italic">{question.explanation}</p>
      )}
    </div>
  );
}

// ============ REVIEW DIALOG (read-only + approve/reject) ============

function ReviewDialog({
  quiz,
  onClose,
}: {
  quiz: FeaturedQuiz | null;
  onClose: () => void;
}) {
  const approve = useApproveFeaturedQuiz();
  const reject = useRejectFeaturedQuiz();

  if (!quiz) return null;

  const handleApprove = async () => {
    await approve.mutateAsync(quiz.id);
    onClose();
  };

  const handleReject = async () => {
    await reject.mutateAsync(quiz.id);
    onClose();
  };

  const isPending = approve.isPending || reject.isPending;

  return (
    <Dialog open={!!quiz} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Examiner le quiz</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quiz info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">{quiz.title}</h3>
            {quiz.description && <p className="text-sm text-muted-foreground">{quiz.description}</p>}
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              <Badge variant="outline">{QUIZ_MODE_CONFIG[quiz.mode].label}</Badge>
              {quiz.category && <Badge variant="secondary">{quiz.category}</Badge>}
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{quiz.timer_seconds}s</span>
              <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" />{quiz.question_count} questions</span>
              {quiz.average_rating != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                  {quiz.average_rating.toFixed(1)} ({quiz.rating_count})
                </span>
              )}
              {quiz.profile?.username && <span>par {quiz.profile.username}</span>}
            </div>
            {quiz.image_url && (
              <img src={quiz.image_url} alt="" className="h-32 rounded-lg object-cover" />
            )}
          </div>

          {/* Questions list */}
          <div className="space-y-2">
            <Label>Questions ({quiz.questions_data.length})</Label>
            {quiz.questions_data.map((q, i) => (
              <QuestionViewer key={i} question={q} index={i} mode={quiz.mode} />
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isPending}
          >
            <X className="h-4 w-4 mr-1" />
            Rejeter
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Approuver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ CLASSIQUE QUESTION EDITOR ============

function ClassiqueQuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: ClassiqueQuestion;
  index: number;
  onChange: (q: ClassiqueQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline">Question {index + 1}</Badge>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Input
          value={question.question}
          onChange={(e) => onChange({ ...question, question: e.target.value })}
          placeholder="Texte de la question..."
        />

        <div className="space-y-2">
          <Label className="text-xs">Options (cochez la bonne réponse)</Label>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${index}`}
                checked={question.correct_index === i}
                onChange={() => onChange({ ...question, correct_index: i })}
                className="accent-green-600"
              />
              <Input
                value={question.options[i]?.name || ''}
                onChange={(e) => {
                  const newOptions = [...question.options];
                  while (newOptions.length <= i) newOptions.push({ name: '' });
                  newOptions[i] = { name: e.target.value };
                  onChange({ ...question, options: newOptions });
                }}
                placeholder={`Option ${i + 1}`}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>

        <Input
          value={question.image_url || ''}
          onChange={(e) => onChange({ ...question, image_url: e.target.value || null })}
          placeholder="URL image (optionnel)"
          className="h-8 text-sm"
        />

        <Input
          value={question.explanation || ''}
          onChange={(e) => onChange({ ...question, explanation: e.target.value })}
          placeholder="Explication (optionnel)"
          className="h-8 text-sm"
        />
      </CardContent>
    </Card>
  );
}

// ============ EXPERT QUESTION EDITOR ============

function ExpertQuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: ExpertQuestion;
  index: number;
  onChange: (q: ExpertQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline">Question {index + 1}</Badge>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Input
          value={question.question}
          onChange={(e) => onChange({ ...question, question: e.target.value })}
          placeholder="Texte de la question..."
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Réponse correcte *</Label>
            <Input
              value={question.correct_answer}
              onChange={(e) => onChange({ ...question, correct_answer: e.target.value })}
              placeholder="Réponse EN"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Réponse FR (optionnel)</Label>
            <Input
              value={question.correct_answer_fr || ''}
              onChange={(e) => onChange({ ...question, correct_answer_fr: e.target.value || undefined })}
              placeholder="Réponse FR"
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Alternative answers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Réponses alternatives</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onChange({
                ...question,
                alternative_answers: [...(question.alternative_answers || []), ''],
              })}
            >
              <Plus className="h-3 w-3 mr-1" />Ajouter
            </Button>
          </div>
          {question.alternative_answers?.map((alt, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={alt}
                onChange={(e) => {
                  const updated = [...(question.alternative_answers || [])];
                  updated[i] = e.target.value;
                  onChange({ ...question, alternative_answers: updated });
                }}
                placeholder="Nom alternatif..."
                className="h-7 text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive"
                onClick={() => {
                  const updated = (question.alternative_answers || []).filter((_, idx) => idx !== i);
                  onChange({ ...question, alternative_answers: updated.length > 0 ? updated : undefined });
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <Input
          value={question.image_url || ''}
          onChange={(e) => onChange({ ...question, image_url: e.target.value || null })}
          placeholder="URL image (optionnel)"
          className="h-8 text-sm"
        />

        <Input
          value={question.explanation || ''}
          onChange={(e) => onChange({ ...question, explanation: e.target.value })}
          placeholder="Explication (optionnel)"
          className="h-8 text-sm"
        />
      </CardContent>
    </Card>
  );
}

// ============ QUIZ FORM DIALOG ============

const getDefaultClassiqueQuestion = (): ClassiqueQuestion => ({
  type: 'rating',
  question: '',
  options: [{ name: '' }, { name: '' }, { name: '' }, { name: '' }],
  correct_index: 0,
  image_url: null,
  explanation: '',
  is_manual: true,
});

const getDefaultExpertQuestion = (): ExpertQuestion => ({
  type: 'rating',
  question: '',
  options: [],
  correct_index: 0,
  correct_answer: '',
  correct_answer_fr: undefined,
  alternative_answers: undefined,
  image_url: null,
  explanation: '',
  is_manual: true,
});

function QuizFormDialog({
  open,
  onOpenChange,
  editQuiz,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editQuiz: FeaturedQuiz | null;
}) {
  const isEditing = !!editQuiz;
  const createQuiz = useCreateFeaturedQuiz();
  const updateQuiz = useUpdateFeaturedQuiz();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<FeaturedQuizMode>('classique');
  const [timerSeconds, setTimerSeconds] = useState(15);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [questions, setQuestions] = useState<FeaturedQuizQuestion[]>([]);

  useEffect(() => {
    if (open) {
      if (editQuiz) {
        setTitle(editQuiz.title);
        setDescription(editQuiz.description || '');
        setImageUrl(editQuiz.image_url || '');
        setCategory(editQuiz.category || '');
        setMode(editQuiz.mode);
        setTimerSeconds(editQuiz.timer_seconds);
        setIsActive(editQuiz.is_active);
        setIsFeatured(editQuiz.is_featured);
        setQuestions(editQuiz.questions_data || []);
      } else {
        setTitle('');
        setDescription('');
        setImageUrl('');
        setCategory('');
        setMode('classique');
        setTimerSeconds(15);
        setIsActive(true);
        setIsFeatured(false);
        setQuestions([]);
      }
    }
  }, [open, editQuiz]);

  const addQuestion = () => {
    if (mode === 'classique') {
      setQuestions(prev => [...prev, getDefaultClassiqueQuestion()]);
    } else {
      setQuestions(prev => [...prev, getDefaultExpertQuestion()]);
    }
  };

  const updateQuestion = (index: number, q: FeaturedQuizQuestion) => {
    setQuestions(prev => prev.map((existing, i) => i === index ? q : existing));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }
    if (questions.length === 0) {
      toast.error('Ajoutez au moins une question');
      return;
    }

    // Clean alternative_answers in expert mode
    const cleanedQuestions = questions.map(q => {
      if ('correct_answer' in q) {
        const cleaned = { ...q };
        if (cleaned.alternative_answers) {
          cleaned.alternative_answers = cleaned.alternative_answers.filter(a => a.trim());
          if (cleaned.alternative_answers.length === 0) cleaned.alternative_answers = undefined;
        }
        return cleaned;
      }
      return q;
    });

    const formData: FeaturedQuizFormData = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      category: category.trim(),
      mode,
      timer_seconds: Math.max(5, Math.min(60, timerSeconds)),
      questions_data: cleanedQuestions,
      is_active: isActive,
      is_featured: isFeatured,
    };

    if (isEditing && editQuiz) {
      await updateQuiz.mutateAsync({ id: editQuiz.id, data: formData });
    } else {
      await createQuiz.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const isPending = createQuiz.isPending || updateQuiz.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le quiz' : 'Nouveau quiz'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Quiz Catan" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description du quiz..." rows={2} />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image de couverture</Label>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              bucket="quiz-images"
              folder="featured"
              maxSizeKB={100}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Thématique</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une thématique..." />
              </SelectTrigger>
              <SelectContent>
                {QUIZ_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode + Timer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={mode}
                onValueChange={(v) => {
                  setMode(v as FeaturedQuizMode);
                  // Clear questions when switching mode
                  if (questions.length > 0) {
                    setQuestions([]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classique">Classique (QCM)</SelectItem>
                  <SelectItem value="expert">Expert (texte libre)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timer (secondes)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={timerSeconds}
                onChange={(e) => setTimerSeconds(parseInt(e.target.value) || 15)}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="quiz-active" />
              <Label htmlFor="quiz-active">Actif</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="quiz-featured" />
              <Label htmlFor="quiz-featured">Mis en avant</Label>
            </div>
          </div>

          {/* Questions editor */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>Questions ({questions.length})</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Ajouter une question
              </Button>
            </div>

            {questions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune question. Cliquez sur "Ajouter" pour commencer.
              </p>
            )}

            {questions.map((q, i) =>
              mode === 'classique' ? (
                <ClassiqueQuestionEditor
                  key={i}
                  question={q as ClassiqueQuestion}
                  index={i}
                  onChange={(updated) => updateQuestion(i, updated)}
                  onRemove={() => removeQuestion(i)}
                />
              ) : (
                <ExpertQuestionEditor
                  key={i}
                  question={q as ExpertQuestion}
                  index={i}
                  onChange={(updated) => updateQuestion(i, updated)}
                  onRemove={() => removeQuestion(i)}
                />
              )
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Enregistrer</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN PAGE ============

export function FeaturedQuizzesPage() {
  const [tab, setTab] = useState('submissions');
  const [filters, setFilters] = useState<FeaturedQuizFilters>({ status: 'all', search: '', is_featured: false });
  const [searchInput, setSearchInput] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editQuiz, setEditQuiz] = useState<FeaturedQuiz | null>(null);
  const [reviewQuiz, setReviewQuiz] = useState<FeaturedQuiz | null>(null);

  const { data: pendingCount } = usePendingQuizzesCount();
  const { data: pendingQuizzes, isLoading: pendingLoading } = useFeaturedQuizzes({ status: 'pending' });
  const { data: allQuizzes, isLoading: allLoading } = useFeaturedQuizzes(filters);

  const toggleActive = useToggleFeaturedQuizActive();
  const toggleFeatured = useToggleFeaturedQuizFeatured();
  const deleteQuiz = useDeleteFeaturedQuiz();

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setTimeout(() => setFilters(f => ({ ...f, search: value })), 300);
  };

  const handleCreate = () => {
    setEditQuiz(null);
    setFormOpen(true);
  };

  const handleEdit = (quiz: FeaturedQuiz) => {
    setEditQuiz(quiz);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Star className="h-7 w-7" />
            Quizzes personnalisés
          </h1>
          <p className="text-muted-foreground">
            Gérer les quizzes soumis par les joueurs et créer des quizzes admin
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau quiz
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="submissions" className="gap-2">
            Soumissions
            {(pendingCount ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[20px]">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Tous les quizzes</TabsTrigger>
        </TabsList>

        {/* ============ TAB: SOUMISSIONS ============ */}
        <TabsContent value="submissions" className="space-y-4">
          {pendingLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : !pendingQuizzes?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune soumission en attente</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                    <span>Titre</span>
                    <span className="w-24 text-center">Thématique</span>
                    <span className="w-20 text-center">Mode</span>
                    <span className="w-16 text-center">Questions</span>
                    <span className="w-16 text-center">Timer</span>
                    <span className="w-20 text-center">Actions</span>
                  </div>
                  {pendingQuizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-3 py-2 items-center hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate font-medium">{quiz.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {quiz.profile?.username || 'Anonyme'} · {new Date(quiz.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <span className="w-24 text-center">
                        {quiz.category ? (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{quiz.category}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </span>
                      <Badge variant="outline" className="w-20 justify-center text-[10px]">
                        {quiz.mode === 'classique' ? 'QCM' : 'Expert'}
                      </Badge>
                      <span className="w-16 text-center text-xs">{quiz.question_count}</span>
                      <span className="w-16 text-center text-xs">{quiz.timer_seconds}s</span>
                      <div className="w-20 flex justify-center">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setReviewQuiz(quiz)}>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Examiner
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ============ TAB: TOUS LES QUIZZES ============ */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Rechercher par titre..."
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => setFilters(f => ({ ...f, status: v as FeaturedQuizFilters['status'] }))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="approved">Approuvés</SelectItem>
                    <SelectItem value="rejected">Rejetés</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.category || 'all'}
                  onValueChange={(v) => setFilters(f => ({ ...f, category: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Thématique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes thématiques</SelectItem>
                    {QUIZ_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={filters.is_featured ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(f => ({ ...f, is_featured: !f.is_featured }))}
                  className="gap-1.5"
                >
                  <Star className="h-3.5 w-3.5" />
                  Mis en avant
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          {allLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                {!allQuizzes?.length ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Aucun quiz</p>
                    <Button onClick={handleCreate}>
                      <Plus className="h-4 w-4 mr-2" />Créer un quiz
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y">
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                      <span>Titre / Auteur</span>
                      <span className="w-24 text-center">Thématique</span>
                      <span className="w-20 text-center">Mode</span>
                      <span className="w-12 text-center">Nb Q</span>
                      <span className="w-16 text-center">Note</span>
                      <span className="w-28 text-center">Statut</span>
                      <span className="w-28 text-center">Actions</span>
                    </div>
                    {allQuizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 px-3 py-2 items-center hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm truncate">{quiz.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {quiz.profile?.username || 'Admin'} · {new Date(quiz.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>

                        <span className="w-24 text-center">
                          {quiz.category ? (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{quiz.category}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </span>

                        <Badge variant="outline" className="w-20 justify-center text-[10px]">
                          {quiz.mode === 'classique' ? 'QCM' : 'Expert'}
                        </Badge>

                        <span className="w-12 text-center text-xs">{quiz.question_count}</span>

                        <span className="w-16 text-center text-xs">
                          {quiz.average_rating != null ? (
                            <span className="flex items-center justify-center gap-0.5">
                              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                              {quiz.average_rating.toFixed(1)}
                              <span className="text-muted-foreground">({quiz.rating_count})</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>

                        <div className="w-28 flex items-center justify-center gap-1">
                          <Badge variant={QUIZ_STATUS_CONFIG[quiz.status].variant} className="text-[10px] px-1.5 py-0">
                            {QUIZ_STATUS_CONFIG[quiz.status].label}
                          </Badge>
                          {quiz.is_active && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">On</Badge>
                          )}
                          {quiz.is_featured && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>

                        <div className="w-28 flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(quiz)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={quiz.is_active ? 'Désactiver' : 'Activer'}
                            onClick={() => toggleActive.mutate({ id: quiz.id, is_active: !quiz.is_active })}
                          >
                            {quiz.is_active ? <PowerOff className="h-3.5 w-3.5 text-orange-500" /> : <Power className="h-3.5 w-3.5 text-green-500" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={quiz.is_featured ? 'Retirer mise en avant' : 'Mettre en avant'}
                            onClick={() => toggleFeatured.mutate({ id: quiz.id, is_featured: !quiz.is_featured })}
                          >
                            <Star className={`h-3.5 w-3.5 ${quiz.is_featured ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce quiz ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteQuiz.mutate(quiz.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuizFormDialog open={formOpen} onOpenChange={setFormOpen} editQuiz={editQuiz} />
      <ReviewDialog quiz={reviewQuiz} onClose={() => setReviewQuiz(null)} />
    </div>
  );
}
