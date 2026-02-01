import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  useToggleBggQuestionActive,
  useDeleteBggQuestion,
} from '@/hooks/useBggQuiz';
import type { BggQuestionType, BggQuestionDifficulty, BggQuestionFilters } from '@/types/bgg-quiz';
import { QUESTION_TYPE_CONFIG, DIFFICULTY_CONFIG } from '@/types/bgg-quiz';
import {
  Plus,
  Trash2,
  Pencil,
  ListTodo,
  Power,
  PowerOff,
  Star,
  Palette,
  Users,
  Puzzle,
  Clock,
  FileText,
  Image,
  Trophy,
  Edit,
  TrendingUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';

const typeIcons: Record<BggQuestionType, React.ElementType> = {
  rating: Star,
  designer: Palette,
  players: Users,
  complexity: Puzzle,
  duration: Clock,
  description: FileText,
  photo: Image,
  award: Trophy,
  custom: Edit,
};

export function BggQuestionsPage() {
  const [filters, setFilters] = useState<BggQuestionFilters>({
    type: 'all',
    difficulty: 'all',
    is_manual: 'all',
    is_active: 'all',
  });

  const { data: questions, isLoading } = useBggQuestions(filters);
  const { data: stats } = useBggQuestionsStats();

  const toggleActive = useToggleBggQuestionActive();
  const deleteQuestion = useDeleteBggQuestion();

  const hasActiveFilter =
    filters.type !== 'all' ||
    filters.difficulty !== 'all' ||
    filters.is_manual !== 'all' ||
    filters.is_active !== 'all';

  const clearFilters = () => {
    setFilters({
      type: 'all',
      difficulty: 'all',
      is_manual: 'all',
      is_active: 'all',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ListTodo className="h-8 w-8" />
            Questions Quiz BGG
          </h1>
          <p className="text-muted-foreground">
            {stats?.total || 0} questions au total
            {stats && (
              <span className="ml-2 text-sm">
                ({stats.manual} manuelles, {stats.auto} auto-générées)
              </span>
            )}
          </p>
        </div>
        <Link to="/quiz/questions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle question
          </Button>
        </Link>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">Filtrer:</span>
            <Select
              value={filters.type?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, type: v as BggQuestionType | 'all' }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(QUESTION_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.difficulty?.toString() || 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  difficulty: v as BggQuestionDifficulty | 'all',
                }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Difficulté" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="easy">Facile</SelectItem>
                <SelectItem value="advanced">Avancé</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={
                filters.is_manual === 'all'
                  ? 'all'
                  : filters.is_manual
                    ? 'manual'
                    : 'auto'
              }
              onValueChange={(v) =>
                setFilters((f) => ({
                  ...f,
                  is_manual: v === 'all' ? 'all' : v === 'manual',
                }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="manual">Manuelles</SelectItem>
                <SelectItem value="auto">Auto-générées</SelectItem>
              </SelectContent>
            </Select>
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
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Effacer les filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liste des questions */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {questions?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    Aucune question {hasActiveFilter && 'avec ces filtres'}
                  </p>
                  {!hasActiveFilter && (
                    <Link to="/quiz/questions/new">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Créer une question
                      </Button>
                    </Link>
                  )}
                </div>
              )}
              {questions?.map((question) => {
                const TypeIcon = typeIcons[question.type] || Edit;
                const typeConfig = QUESTION_TYPE_CONFIG[question.type];
                const diffConfig = DIFFICULTY_CONFIG[question.difficulty];
                const successRate =
                  question.times_used > 0
                    ? Math.round(
                        (question.times_correct / question.times_used) * 100
                      )
                    : null;

                return (
                  <div
                    key={question.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header avec badges */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <TypeIcon className="h-3 w-3" />
                            {typeConfig?.label || question.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              diffConfig?.color === 'green'
                                ? 'border-green-500 text-green-600'
                                : 'border-orange-500 text-orange-600'
                            }
                          >
                            {diffConfig?.label || question.difficulty}
                          </Badge>
                          <Badge variant={question.is_manual ? 'secondary' : 'outline'}>
                            {question.is_manual ? 'Manuelle' : 'Auto'}
                          </Badge>
                          {question.is_active ? (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-orange-600">
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                        </div>

                        {/* Question text */}
                        <p className="font-medium mb-2 line-clamp-2">
                          {question.question_data?.question || 'Question sans titre'}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Utilisée {question.times_used}x
                          </span>
                          {successRate !== null && (
                            <>
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {question.times_correct} ({successRate}%)
                              </span>
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-3.5 w-3.5" />
                                {question.times_incorrect}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link to={`/quiz/questions/${question.id}`}>
                          <Button variant="outline" size="icon" className="h-9 w-9">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          title={question.is_active ? 'Désactiver' : 'Activer'}
                          onClick={() =>
                            toggleActive.mutate({
                              id: question.id,
                              is_active: !question.is_active,
                            })
                          }
                        >
                          {question.is_active ? (
                            <PowerOff className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Power className="h-4 w-4 text-green-500" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive h-9 w-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La question sera définitivement supprimée.
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
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
