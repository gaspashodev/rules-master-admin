import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useFlaggedQuestions,
  useFlaggedQuestionsStats,
  useUpdateFlagStatus,
  useDeleteFlaggedQuestion,
  useToggleBggQuestionActive,
} from '@/hooks/useBggQuiz';
import type { FlagStatus, FlagReason, BggQuizFlagged } from '@/types/bgg-quiz';
import { FLAG_STATUS_CONFIG, FLAG_REASON_CONFIG, QUESTION_TYPE_CONFIG } from '@/types/bgg-quiz';
import {
  Trash2,
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  HelpCircle,
  Ban,
  Copy,
  Power,
  PowerOff,
} from 'lucide-react';

const statusIcons: Record<FlagStatus, React.ElementType> = {
  pending: Clock,
  reviewed: Eye,
  fixed: CheckCircle,
  dismissed: XCircle,
};

const reasonIcons: Record<FlagReason, React.ElementType> = {
  incorrect: AlertTriangle,
  unclear: HelpCircle,
  offensive: Ban,
  duplicate: Copy,
};

export function FlaggedQuestionsPage() {
  const [statusFilter, setStatusFilter] = useState<FlagStatus | 'all'>('all');
  const [reasonFilter, setReasonFilter] = useState<FlagReason | 'all'>('all');
  const [selectedFlag, setSelectedFlag] = useState<BggQuizFlagged | null>(null);

  const { data: flags, isLoading } = useFlaggedQuestions({
    status: statusFilter,
    reason: reasonFilter,
  });
  const { data: stats } = useFlaggedQuestionsStats();

  const updateStatus = useUpdateFlagStatus();
  const deleteFlag = useDeleteFlaggedQuestion();
  const toggleActive = useToggleBggQuestionActive();

  const hasActiveFilter = statusFilter !== 'all' || reasonFilter !== 'all';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Flag className="h-8 w-8" />
          Questions signalées
        </h1>
        <p className="text-muted-foreground">
          Questions du quiz BGG signalées par les utilisateurs
        </p>
      </div>

      {/* Stats par statut */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className={statusFilter === 'pending' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.byStatus.pending || 0}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => {
                setStatusFilter('pending');
                setReasonFilter('all');
              }}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'reviewed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Examinés</CardTitle>
            <Eye className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.byStatus.reviewed || 0}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => {
                setStatusFilter('reviewed');
                setReasonFilter('all');
              }}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'fixed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corrigés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.byStatus.fixed || 0}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => {
                setStatusFilter('fixed');
                setReasonFilter('all');
              }}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
        <Card className={statusFilter === 'dismissed' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejetés</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats?.byStatus.dismissed || 0}
            </div>
            <Button
              variant="link"
              className="p-0 h-auto text-xs"
              onClick={() => {
                setStatusFilter('dismissed');
                setReasonFilter('all');
              }}
            >
              Voir
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats par raison - compact */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <span className="text-muted-foreground">Par raison :</span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
          <span className="font-medium text-red-700 dark:text-red-400">
            {stats?.byReason.incorrect || 0}
          </span>
          <span className="text-red-600/70 dark:text-red-400/70">incorrect</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-100 dark:bg-yellow-900/30">
          <HelpCircle className="h-3.5 w-3.5 text-yellow-600" />
          <span className="font-medium text-yellow-700 dark:text-yellow-400">
            {stats?.byReason.unclear || 0}
          </span>
          <span className="text-yellow-600/70 dark:text-yellow-400/70">pas clair</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
          <Ban className="h-3.5 w-3.5 text-purple-600" />
          <span className="font-medium text-purple-700 dark:text-purple-400">
            {stats?.byReason.offensive || 0}
          </span>
          <span className="text-purple-600/70 dark:text-purple-400/70">offensant</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
          <Copy className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-medium text-blue-700 dark:text-blue-400">
            {stats?.byReason.duplicate || 0}
          </span>
          <span className="text-blue-600/70 dark:text-blue-400/70">doublon</span>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filtrer:</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as FlagStatus | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente ({stats?.byStatus.pending || 0})</SelectItem>
              <SelectItem value="reviewed">Examinés ({stats?.byStatus.reviewed || 0})</SelectItem>
              <SelectItem value="fixed">Corrigés ({stats?.byStatus.fixed || 0})</SelectItem>
              <SelectItem value="dismissed">Rejetés ({stats?.byStatus.dismissed || 0})</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={reasonFilter}
            onValueChange={(v) => setReasonFilter(v as FlagReason | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Raison" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les raisons</SelectItem>
              <SelectItem value="incorrect">Incorrect ({stats?.byReason.incorrect || 0})</SelectItem>
              <SelectItem value="unclear">Pas clair ({stats?.byReason.unclear || 0})</SelectItem>
              <SelectItem value="offensive">Offensant ({stats?.byReason.offensive || 0})</SelectItem>
              <SelectItem value="duplicate">Doublon ({stats?.byReason.duplicate || 0})</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter('all');
              setReasonFilter('all');
            }}
          >
            Effacer les filtres
          </Button>
        )}
      </div>

      {/* Liste des signalements */}
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
              {flags?.length === 0 && (
                <p className="text-muted-foreground text-center py-12">
                  Aucun signalement
                  {hasActiveFilter && ' avec ces filtres'}
                </p>
              )}
              {flags?.map((flag) => {
                const StatusIcon = statusIcons[flag.status];
                const ReasonIcon = reasonIcons[flag.reason];
                const statusConfig = FLAG_STATUS_CONFIG[flag.status];
                const reasonConfig = FLAG_REASON_CONFIG[flag.reason];
                const questionType = flag.question?.type
                  ? QUESTION_TYPE_CONFIG[flag.question.type]
                  : null;

                return (
                  <div
                    key={flag.id}
                    className="p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-${reasonConfig.color}-100 dark:bg-${reasonConfig.color}-900/30 text-${reasonConfig.color}-700 dark:text-${reasonConfig.color}-400`}
                            style={{
                              backgroundColor:
                                reasonConfig.color === 'red'
                                  ? 'rgb(254 226 226)'
                                  : reasonConfig.color === 'yellow'
                                    ? 'rgb(254 249 195)'
                                    : reasonConfig.color === 'purple'
                                      ? 'rgb(243 232 255)'
                                      : 'rgb(219 234 254)',
                            }}
                          >
                            <ReasonIcon className="h-3 w-3" />
                            {reasonConfig.label}
                          </div>
                          <Badge
                            variant={
                              statusConfig.color === 'destructive'
                                ? 'destructive'
                                : statusConfig.color === 'secondary'
                                  ? 'secondary'
                                  : statusConfig.color === 'outline'
                                    ? 'outline'
                                    : 'default'
                            }
                            className="gap-1"
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </Badge>
                          {questionType && (
                            <Badge variant="outline" className="gap-1">
                              {questionType.label}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(flag.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {/* Question preview */}
                        {flag.question && (
                          <div className="text-sm mb-2">
                            <span className="font-medium">
                              {flag.question.question_data?.question || 'Question sans titre'}
                            </span>
                            {flag.question.is_active === false && (
                              <Badge variant="outline" className="ml-2 text-orange-600">
                                Désactivée
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Commentaire */}
                        {flag.comment && (
                          <p className="text-sm text-muted-foreground italic">
                            "{flag.comment}"
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedFlag(flag)}
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Select
                          value={flag.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({ id: flag.id, status: v as FlagStatus })
                          }
                        >
                          <SelectTrigger className="w-[140px] h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">En attente</SelectItem>
                            <SelectItem value="reviewed">Examiné</SelectItem>
                            <SelectItem value="fixed">Corrigé</SelectItem>
                            <SelectItem value="dismissed">Rejeté</SelectItem>
                          </SelectContent>
                        </Select>
                        {flag.question && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            title={flag.question.is_active ? 'Désactiver la question' : 'Activer la question'}
                            onClick={() =>
                              toggleActive.mutate({
                                id: flag.question!.id,
                                is_active: !flag.question!.is_active,
                              })
                            }
                          >
                            {flag.question.is_active ? (
                              <PowerOff className="h-4 w-4 text-orange-500" />
                            ) : (
                              <Power className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        )}
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
                              <AlertDialogTitle>Supprimer ce signalement ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. La question associée ne sera pas supprimée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFlag.mutate(flag.id)}
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

      {/* Modal détails */}
      <Dialog open={!!selectedFlag} onOpenChange={() => setSelectedFlag(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du signalement</DialogTitle>
          </DialogHeader>
          {selectedFlag && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Raison</p>
                  <p className="font-medium">{FLAG_REASON_CONFIG[selectedFlag.reason].label}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <p className="font-medium">{FLAG_STATUS_CONFIG[selectedFlag.status].label}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p>
                    {new Date(selectedFlag.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {selectedFlag.reviewed_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Examiné le</p>
                    <p>
                      {new Date(selectedFlag.reviewed_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {selectedFlag.comment && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Commentaire</p>
                  <p className="bg-muted p-3 rounded-lg">{selectedFlag.comment}</p>
                </div>
              )}

              {selectedFlag.question && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Question signalée</p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {QUESTION_TYPE_CONFIG[selectedFlag.question.type]?.label || selectedFlag.question.type}
                      </Badge>
                      <Badge variant={selectedFlag.question.is_active ? 'default' : 'secondary'}>
                        {selectedFlag.question.is_active ? 'Active' : 'Désactivée'}
                      </Badge>
                      <Badge variant="outline">
                        {selectedFlag.question.difficulty === 'easy' ? 'Facile' : 'Avancé'}
                      </Badge>
                    </div>
                    <p className="font-medium">
                      {selectedFlag.question.question_data?.question || 'Question sans titre'}
                    </p>
                    {selectedFlag.question.question_data?.explanation && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Explication:</span>{' '}
                        {selectedFlag.question.question_data.explanation}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>Utilisée: {selectedFlag.question.times_used}x</span>
                      <span>Correctes: {selectedFlag.question.times_correct}</span>
                      <span>Incorrectes: {selectedFlag.question.times_incorrect}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
