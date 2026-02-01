import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBggQuestion,
  useCreateBggQuestion,
  useUpdateBggQuestion,
} from '@/hooks/useBggQuiz';
import { BggGameSearch, ImageUploader, QuestionTemplateInput } from '@/components/bgg-quiz';
import { toast } from 'sonner';
import type {
  BggQuestionDifficulty,
  BggQuestionFormData,
  BggGameOption,
  CustomQuestionData,
} from '@/types/bgg-quiz';
import { ArrowLeft, Save } from 'lucide-react';

const emptyGame: BggGameOption = { bgg_id: 0, name: '' };

const getDefaultQuestionData = (): CustomQuestionData => ({
  type: 'custom',
  question: '',
  correct_answer: { ...emptyGame },
  wrong_answers: undefined,
  explanation: '',
  image_url: '',
});

export function BggQuestionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: existingQuestion, isLoading: questionLoading } = useBggQuestion(id);
  const createQuestion = useCreateBggQuestion();
  const updateQuestion = useUpdateBggQuestion();

  const [difficulty, setDifficulty] = useState<BggQuestionDifficulty>('easy');
  const [isActive, setIsActive] = useState(true);
  const [questionData, setQuestionData] = useState<CustomQuestionData>(getDefaultQuestionData());
  const [manualWrongAnswers, setManualWrongAnswers] = useState(false);

  // Load existing question data
  useEffect(() => {
    if (existingQuestion) {
      setDifficulty(existingQuestion.difficulty);
      setIsActive(existingQuestion.is_active);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = existingQuestion.question_data as any;
      setQuestionData({
        type: 'custom',
        question: data.question || '',
        correct_answer: data.correct_answer || { ...emptyGame },
        wrong_answers: data.wrong_answers,
        explanation: data.explanation || '',
        image_url: data.image_url || '',
      });
      // If wrong_answers exist, enable manual mode
      if (data.wrong_answers && data.wrong_answers.length > 0) {
        setManualWrongAnswers(true);
      }
    }
  }, [existingQuestion]);

  const handleSubmit = async () => {
    if (!questionData.question.trim()) {
      toast.error('Veuillez saisir une question');
      return;
    }

    if (!questionData.correct_answer.bgg_id || !questionData.correct_answer.name) {
      toast.error('Veuillez sélectionner la bonne réponse');
      return;
    }

    // Validate wrong answers if manual mode is enabled
    if (manualWrongAnswers && questionData.wrong_answers) {
      const validWrongAnswers = questionData.wrong_answers.filter(a => a.bgg_id && a.name);
      if (validWrongAnswers.length < 3) {
        toast.error('Veuillez sélectionner 3 mauvaises réponses');
        return;
      }
    }

    const dataToSave: CustomQuestionData = {
      ...questionData,
      wrong_answers: manualWrongAnswers ? questionData.wrong_answers : undefined,
    };

    const formData: BggQuestionFormData = {
      type: 'custom',
      difficulty,
      is_active: isActive,
      question_data: dataToSave,
    };

    if (isEditing && id) {
      await updateQuestion.mutateAsync({ id, data: formData });
    } else {
      await createQuestion.mutateAsync(formData);
    }
    navigate('/quiz/questions');
  };

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

  const isPending = createQuestion.isPending || updateQuestion.isPending;

  if (questionLoading && isEditing) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Modifier la question' : 'Nouvelle question'}
            </h1>
            <p className="text-muted-foreground">
              Question personnalisée pour le quiz BGG
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="space-y-2">
                <Label>Difficulté</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as BggQuestionDifficulty)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Facile</SelectItem>
                    <SelectItem value="advanced">Avancé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="is-active"
                />
                <Label htmlFor="is-active">Question active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question content */}
        <Card>
          <CardHeader>
            <CardTitle>Contenu de la question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <ImageUploader
                value={questionData.image_url || ''}
                onChange={(url) => updateField('image_url', url)}
              />
            </div>

            {/* Correct answer */}
            <div className="space-y-2">
              <Label>Bonne réponse *</Label>
              <BggGameSearch
                value={{
                  bgg_id: questionData.correct_answer.bgg_id,
                  name: questionData.correct_answer.name,
                }}
                onChange={(game) => updateField('correct_answer', {
                  bgg_id: game.bgg_id,
                  name: game.name,
                })}
                placeholder="Rechercher le jeu (bonne réponse)..."
              />
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

              {/* Wrong answers (if manual mode) */}
              {manualWrongAnswers && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>Mauvaises réponses (3)</Label>
                  {[0, 1, 2].map((index) => (
                    <BggGameSearch
                      key={index}
                      value={{
                        bgg_id: questionData.wrong_answers?.[index]?.bgg_id || 0,
                        name: questionData.wrong_answers?.[index]?.name || '',
                      }}
                      onChange={(game) => updateWrongAnswer(index, {
                        bgg_id: game.bgg_id,
                        name: game.name,
                      })}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
