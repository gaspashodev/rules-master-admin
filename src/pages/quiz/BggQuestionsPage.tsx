import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  useBggQuestions,
  useBggQuestionsStats,
  useBggQuestion,
  useToggleBggQuestionActive,
  useDeleteBggQuestion,
  useCreateBggQuestion,
  useUpdateBggQuestion,
} from '@/hooks/useBggQuiz';
import { ImageUploader, QuestionTemplateInput } from '@/components/bgg-quiz';
import { GalleryPicker } from '@/components/shared/GalleryPicker';
import { useSearchBggGames } from '@/hooks/useBggQuiz';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import type {
  BggQuestionFilters,
  BggQuestionFormData,
  BggGameOption,
  CustomQuestionData,
} from '@/types/bgg-quiz';
import {
  Plus,
  Trash2,
  Pencil,
  ListTodo,
  Power,
  PowerOff,
  Image,
  Upload,
  X,
  Search,
  Save,
  Loader2,
} from 'lucide-react';

// ============ GAME ANSWER INPUT (free text + BGG autocomplete) ============

function GameAnswerInput({
  value,
  onChange,
  placeholder = 'Nom du jeu...',
}: {
  value: BggGameOption;
  onChange: (game: BggGameOption) => void;
  placeholder?: string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const { data: suggestions } = useSearchBggGames(
    showSuggestions && value.name.length >= 3 ? value.name : ''
  );

  const updatePos = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (showSuggestions) updatePos();
  }, [showSuggestions, value.name, updatePos]);

  useEffect(() => {
    if (!showSuggestions) return;
    const handleScroll = () => updatePos();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showSuggestions, updatePos]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSuggestions = showSuggestions && value.name.length >= 3 && suggestions && suggestions.length > 0;

  return (
    <div ref={inputRef}>
      <Input
        value={value.name}
        onChange={(e) => {
          onChange({ bgg_id: 0, name: e.target.value });
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
      />
      {hasSuggestions && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[100] max-h-48 overflow-auto bg-popover border rounded-md shadow-lg py-1"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {suggestions.map((game) => (
            <button
              key={game.id}
              type="button"
              className="w-full px-3 py-1.5 text-left hover:bg-muted text-sm"
              onClick={() => {
                onChange({ bgg_id: game.bgg_id, name: game.name });
                setShowSuggestions(false);
              }}
            >
              <span className="font-medium">{game.name}</span>
              <span className="text-xs text-muted-foreground ml-2">BGG #{game.bgg_id}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

const emptyGame: BggGameOption = { bgg_id: 0, name: '' };

const getDefaultQuestionData = (): CustomQuestionData => ({
  question: '',
  correct_answer: { ...emptyGame },
  wrong_answers: undefined,
  explanation: '',
  image_url: '',
});

// ============ QUESTION FORM DIALOG ============

function QuestionFormDialog({
  open,
  onOpenChange,
  questionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string | null;
}) {
  const isEditing = !!questionId;
  const { data: existingQuestion } = useBggQuestion(questionId || undefined);
  const createQuestion = useCreateBggQuestion();
  const updateQuestion = useUpdateBggQuestion();

  const [isActive, setIsActive] = useState(true);
  const [questionData, setQuestionData] = useState<CustomQuestionData>(getDefaultQuestionData());
  const [manualWrongAnswers, setManualWrongAnswers] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  // Reset form when dialog opens/closes or question changes
  useEffect(() => {
    if (open) {
      if (existingQuestion) {
        setIsActive(existingQuestion.is_active);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = existingQuestion.question_data as any;
        setQuestionData({
          question: data.question || '',
          correct_answer: data.correct_answer || { ...emptyGame },
          alternative_answers: data.alternative_answers,
          wrong_answers: data.wrong_answers,
          explanation: data.explanation || '',
          image_url: data.image_url || '',
        });
        if (data.wrong_answers && data.wrong_answers.length > 0) {
          setManualWrongAnswers(true);
        }
      } else if (!questionId) {
        // New question — reset form
        setIsActive(true);
        setQuestionData(getDefaultQuestionData());
        setManualWrongAnswers(false);
      }
    }
  }, [open, existingQuestion, questionId]);

  const updateField = <K extends keyof CustomQuestionData>(field: K, value: CustomQuestionData[K]) => {
    setQuestionData(prev => ({ ...prev, [field]: value }));
  };

  const updateWrongAnswer = (index: number, game: BggGameOption) => {
    const newWrongAnswers = [...(questionData.wrong_answers || [{ ...emptyGame }, { ...emptyGame }, { ...emptyGame }])];
    newWrongAnswers[index] = game;
    updateField('wrong_answers', newWrongAnswers);
  };

  const handleManualWrongAnswersToggle = (enabled: boolean) => {
    setManualWrongAnswers(enabled);
    if (enabled && !questionData.wrong_answers) {
      updateField('wrong_answers', [{ ...emptyGame }, { ...emptyGame }, { ...emptyGame }]);
    }
  };

  const handleSubmit = async () => {
    if (!questionData.question.trim()) {
      toast.error('Veuillez saisir une question');
      return;
    }

    if (!questionData.correct_answer.name.trim()) {
      toast.error('Veuillez saisir la bonne réponse');
      return;
    }

    if (manualWrongAnswers && questionData.wrong_answers) {
      const validWrongAnswers = questionData.wrong_answers.filter(a => a.name.trim());
      if (validWrongAnswers.length < 3) {
        toast.error('Veuillez saisir 3 mauvaises réponses');
        return;
      }
    }

    const cleanedAlternatives = questionData.alternative_answers?.filter(a => a.trim());
    const dataToSave: CustomQuestionData = {
      ...questionData,
      alternative_answers: cleanedAlternatives && cleanedAlternatives.length > 0 ? cleanedAlternatives : undefined,
      wrong_answers: manualWrongAnswers ? questionData.wrong_answers : undefined,
    };

    const formData: BggQuestionFormData = {
      type: dataToSave.image_url ? 'photo' : 'custom',
      is_active: isActive,
      question_data: dataToSave,
    };

    if (isEditing && questionId) {
      await updateQuestion.mutateAsync({ id: questionId, data: formData });
    } else {
      await createQuestion.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const isPending = createQuestion.isPending || updateQuestion.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la question' : 'Nouvelle question'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Question text */}
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <QuestionTemplateInput
              value={questionData.question}
              onChange={(value) => updateField('question', value)}
              placeholder="Entrez votre question..."
            />
          </div>

          {/* Image (optional) */}
          <div className="space-y-2">
            <Label>Image (optionnel)</Label>
            {questionData.image_url ? (
              <div className="relative inline-block">
                <img
                  src={questionData.image_url}
                  alt="Question"
                  className="w-40 h-28 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => updateField('image_url', '')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : showUploader ? (
              <div className="space-y-2">
                <ImageUploader
                  value=""
                  onChange={(url) => {
                    updateField('image_url', url);
                    setShowUploader(false);
                  }}
                  maxSizeKB={50}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowUploader(false)}>
                  Annuler
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowUploader(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  Importer
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowGallery(true)}>
                  <Image className="h-4 w-4 mr-1" />
                  Galerie
                </Button>
              </div>
            )}
            <GalleryPicker
              open={showGallery}
              onOpenChange={setShowGallery}
              onSelect={(url) => updateField('image_url', url)}
              bucket="quiz-images"
              folder="jeu"
            />
          </div>

          {/* Correct answer */}
          <div className="space-y-2">
            <Label>Bonne réponse *</Label>
            <GameAnswerInput
              value={questionData.correct_answer}
              onChange={(game) => updateField('correct_answer', game)}
              placeholder="Tapez un nom ou recherchez un jeu BGG..."
            />
          </div>

          {/* Alternative correct answers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Réponses alternatives acceptées</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateField('alternative_answers', [
                  ...(questionData.alternative_answers || []),
                  '',
                ])}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Synonymes ou variantes du nom acceptés comme bonne réponse
            </p>
            {questionData.alternative_answers?.map((alt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={alt}
                  onChange={(e) => {
                    const updated = [...(questionData.alternative_answers || [])];
                    updated[index] = e.target.value;
                    updateField('alternative_answers', updated);
                  }}
                  placeholder={`Ex: nom alternatif, abréviation...`}
                  className="h-8 text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-destructive"
                  onClick={() => {
                    const updated = (questionData.alternative_answers || []).filter((_, i) => i !== index);
                    updateField('alternative_answers', updated.length > 0 ? updated : undefined);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Manual wrong answers toggle */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <Switch
                checked={manualWrongAnswers}
                onCheckedChange={handleManualWrongAnswersToggle}
                id="manual-wrong"
              />
              <div>
                <Label htmlFor="manual-wrong">Choisir les mauvaises réponses</Label>
                <p className="text-xs text-muted-foreground">
                  Par défaut, 3 jeux aléatoires seront proposés
                </p>
              </div>
            </div>

            {manualWrongAnswers && (
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <Label>Mauvaises réponses (3)</Label>
                {[0, 1, 2].map((index) => (
                  <GameAnswerInput
                    key={index}
                    value={questionData.wrong_answers?.[index] || emptyGame}
                    onChange={(game) => updateWrongAnswer(index, game)}
                    placeholder={`Mauvaise réponse ${index + 1}...`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label htmlFor="explanation">Explication (optionnel)</Label>
            <Textarea
              id="explanation"
              value={questionData.explanation}
              onChange={(e) => updateField('explanation', e.target.value)}
              placeholder="Explication affichée après la réponse..."
              rows={3}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              id="is-active"
            />
            <Label htmlFor="is-active">Question active</Label>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
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

export function BggQuestionsPage() {
  const [filters, setFilters] = useState<BggQuestionFilters>({
    is_active: 'all',
    has_photo: false,
    search: '',
  });
  const [searchInput, setSearchInput] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editQuestionId, setEditQuestionId] = useState<string | null>(null);

  const { data: questions, isLoading } = useBggQuestions(filters);
  const { data: stats } = useBggQuestionsStats();

  const toggleActive = useToggleBggQuestionActive();
  const deleteQuestion = useDeleteBggQuestion();

  // Client-side filtering for search and photo (operates on JSONB fields)
  const filteredQuestions = useMemo(() => {
    if (!questions) return [];
    let result = questions;

    if (filters.has_photo) {
      result = result.filter(q => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = q.question_data as any;
        return !!data?.image_url;
      });
    }

    if (filters.search && filters.search.length >= 2) {
      const term = filters.search.toLowerCase();
      result = result.filter(q => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = q.question_data as any;
        const answer = data?.correct_answer?.name?.toLowerCase() || '';
        const question = data?.question?.toLowerCase() || '';
        return answer.includes(term) || question.includes(term);
      });
    }

    return result;
  }, [questions, filters.has_photo, filters.search]);

  const hasActiveFilter =
    filters.is_active !== 'all' ||
    filters.has_photo ||
    (filters.search && filters.search.length >= 2);

  const clearFilters = () => {
    setFilters({ is_active: 'all', has_photo: false, search: '' });
    setSearchInput('');
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setTimeout(() => {
      setFilters(f => ({ ...f, search: value }));
    }, 300);
  };

  const handleCreate = () => {
    setEditQuestionId(null);
    setFormOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditQuestionId(id);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <ListTodo className="h-7 w-7" />
            Questions Quiz BGG
          </h1>
          <p className="text-muted-foreground">
            {stats?.total || 0} questions ({stats?.active || 0} actives)
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle question
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Rechercher par question ou réponse..."
                className="pl-9"
              />
            </div>
            <Select
              value={
                filters.is_active === 'all'
                  ? 'all'
                  : filters.is_active
                    ? 'active'
                    : 'inactive'
              }
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  is_active: v === 'all' ? 'all' : v === 'active',
                }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actives</SelectItem>
                <SelectItem value="inactive">Inactives</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={filters.has_photo ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters(f => ({ ...f, has_photo: !f.has_photo }))}
              className="gap-1.5"
            >
              <Image className="h-3.5 w-3.5" />
              Avec photo
            </Button>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Effacer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des questions */}
      {isLoading ? (
        <div className="space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucune question {hasActiveFilter && 'avec ces filtres'}
                </p>
                {!hasActiveFilter && (
                  <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une question
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                  <span>Question / Réponse</span>
                  <span className="w-16 text-center">Stats</span>
                  <span className="w-12 text-center">Statut</span>
                  <span className="w-24 text-center">Actions</span>
                </div>
                {filteredQuestions.map((question) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const data = question.question_data as any;
                  const answerName = data?.correct_answer?.name || '';
                  const questionText = data?.question || 'Question sans titre';
                  const hasImage = !!data?.image_url;
                  const successRate =
                    question.times_used > 0
                      ? Math.round((question.times_correct / question.times_used) * 100)
                      : null;

                  return (
                    <div
                      key={question.id}
                      className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 items-center hover:bg-muted/50 transition-colors group"
                    >
                      {/* Question + answer */}
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          {hasImage && <Image className="h-3.5 w-3.5 inline mr-1.5 text-muted-foreground" />}
                          {questionText}
                        </p>
                        {answerName && (
                          <p className="text-xs text-muted-foreground truncate">
                            → {answerName}
                          </p>
                        )}
                      </div>

                      {/* Stats */}
                      <span className="w-16 text-center text-xs text-muted-foreground">
                        {question.times_used > 0
                          ? `${question.times_used}x${successRate !== null ? ` (${successRate}%)` : ''}`
                          : '—'}
                      </span>

                      {/* Status */}
                      <div className="w-12 flex justify-center">
                        {question.is_active ? (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-green-600">On</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-600">Off</Badge>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="w-24 flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(question.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={question.is_active ? 'Désactiver' : 'Activer'}
                          onClick={() =>
                            toggleActive.mutate({
                              id: question.id,
                              is_active: !question.is_active,
                            })
                          }
                        >
                          {question.is_active ? (
                            <PowerOff className="h-3.5 w-3.5 text-orange-500" />
                          ) : (
                            <Power className="h-3.5 w-3.5 text-green-500" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
                                onClick={() => deleteQuestion.mutate(question.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question Form Dialog */}
      <QuestionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        questionId={editQuestionId}
      />
    </div>
  );
}
