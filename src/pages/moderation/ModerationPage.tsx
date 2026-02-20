import { useState } from 'react';
import { ShieldAlert, Loader2, Users, CheckCircle, XCircle, Trophy, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { useContestations, useResolveContestation, usePlayerReports, useResolveReport, usePlayerReportHistory } from '@/hooks/useModeration';
import { useMatchParticipants } from '@/hooks/useCompetitive';
import { useUserProfile } from '@/hooks/useUsers';
import { CONTESTATION_STATUS_CONFIG, REPORT_STATUS_CONFIG } from '@/types/moderation';
import { MATCH_TYPE_CONFIG } from '@/types/competitive';
import type { MatchContestation, PlayerReport } from '@/types/moderation';

const PAGE_SIZE = 50;

export function ModerationPage() {
  // Contestations state
  const [contestationStatus, setContestationStatus] = useState('all');
  const [contestationPage, setContestationPage] = useState(0);
  const [selectedContestation, setSelectedContestation] = useState<MatchContestation | null>(null);

  // Reports state
  const [reportStatus, setReportStatus] = useState('all');
  const [reportPage, setReportPage] = useState(0);
  const [selectedReport, setSelectedReport] = useState<PlayerReport | null>(null);

  const { data: contestationsData, isLoading: contestationsLoading } = useContestations({
    status: contestationStatus,
    page: contestationPage,
    pageSize: PAGE_SIZE,
  });

  const { data: reportsData, isLoading: reportsLoading } = usePlayerReports({
    status: reportStatus,
    page: reportPage,
    pageSize: PAGE_SIZE,
  });

  const contestationsTotalPages = Math.ceil((contestationsData?.count || 0) / PAGE_SIZE);
  const reportsTotalPages = Math.ceil((reportsData?.count || 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <ShieldAlert className="h-7 w-7" />
          Modération
        </h1>
        <p className="text-muted-foreground">Contestations de matchs et signalements de joueurs</p>
      </div>

      <Tabs defaultValue="contestations">
        <TabsList>
          <TabsTrigger value="contestations">
            Contestations ({contestationsData?.count || 0})
          </TabsTrigger>
          <TabsTrigger value="reports">
            Signalements ({reportsData?.count || 0})
          </TabsTrigger>
        </TabsList>

        {/* Contestations Tab */}
        <TabsContent value="contestations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Contestations de matchs</CardTitle>
                <Select value={contestationStatus} onValueChange={(v) => { setContestationStatus(v); setContestationPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="resolved_cancelled">Match annulé</SelectItem>
                    <SelectItem value="resolved_dismissed">Rejetée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Pagination page={contestationPage} totalPages={contestationsTotalPages} onPageChange={setContestationPage} />

              <div className="space-y-2 mt-4">
                {contestationsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : !contestationsData?.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">Aucune contestation</p>
                ) : (
                  contestationsData.data.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedContestation(c)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{c.contestant?.username || 'Inconnu'}</p>
                          <Badge variant="outline" className="font-mono text-xs">
                            {c.match?.join_code || c.match_id.slice(0, 8)}
                          </Badge>
                          <Badge variant={CONTESTATION_STATUS_CONFIG[c.status]?.variant || 'outline'}>
                            {CONTESTATION_STATUS_CONFIG[c.status]?.label || c.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {c.reason}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <Pagination page={contestationPage} totalPages={contestationsTotalPages} onPageChange={setContestationPage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Signalements de joueurs</CardTitle>
                <Select value={reportStatus} onValueChange={(v) => { setReportStatus(v); setReportPage(0); }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrer par statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="resolved_warned">Averti</SelectItem>
                    <SelectItem value="resolved_suspended">Suspendu</SelectItem>
                    <SelectItem value="resolved_banned">Banni</SelectItem>
                    <SelectItem value="resolved_dismissed">Rejeté</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Pagination page={reportPage} totalPages={reportsTotalPages} onPageChange={setReportPage} />

              <div className="space-y-2 mt-4">
                {reportsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
                ) : !reportsData?.data?.length ? (
                  <p className="text-muted-foreground text-center py-8">Aucun signalement</p>
                ) : (
                  reportsData.data.map(r => (
                    <div
                      key={r.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedReport(r)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">{r.reported_user?.username || 'Inconnu'}</p>
                          <span className="text-sm text-muted-foreground">signalé par</span>
                          <p className="font-medium">{r.reporter?.username || 'Inconnu'}</p>
                          <Badge variant={REPORT_STATUS_CONFIG[r.status]?.variant || 'outline'}>
                            {REPORT_STATUS_CONFIG[r.status]?.label || r.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {r.reason}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4">
                <Pagination page={reportPage} totalPages={reportsTotalPages} onPageChange={setReportPage} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contestation Resolution Dialog */}
      {selectedContestation && (
        <ContestationDialog
          contestation={selectedContestation}
          onClose={() => setSelectedContestation(null)}
        />
      )}

      {/* Report Resolution Dialog */}
      {selectedReport && (
        <ReportDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

// ============ Contestation Resolution Dialog ============

function ContestationDialog({
  contestation,
  onClose,
}: {
  contestation: MatchContestation;
  onClose: () => void;
}) {
  const resolveContestation = useResolveContestation();
  const { data: participants, isLoading: participantsLoading } = useMatchParticipants(contestation.match_id);
  const [resolution, setResolution] = useState<'resolved_cancelled' | 'resolved_dismissed' | ''>('');
  const [adminNote, setAdminNote] = useState('');

  const handleResolve = () => {
    if (!resolution) return;
    resolveContestation.mutate(
      {
        contestationId: contestation.id,
        matchId: contestation.match_id,
        resolution,
        adminNote,
      },
      { onSuccess: () => onClose() }
    );
  };

  const isPending = contestation.status === 'pending';
  const match = contestation.match;
  const gameName = match?.game?.name_fr || match?.game?.name || 'Jeu inconnu';
  const matchTypeLabel = match?.match_type ? (MATCH_TYPE_CONFIG[match.match_type as keyof typeof MATCH_TYPE_CONFIG]?.label || match.match_type) : '';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contestation de match</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match info header with game image */}
          <div className="flex gap-4 p-3 rounded-lg bg-muted/30 border">
            {match?.game?.image_url && (
              <img
                src={match.game.image_url}
                alt={gameName}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{gameName}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {match?.join_code || contestation.match_id.slice(0, 8)}
                </Badge>
                {matchTypeLabel && <Badge variant="secondary">{matchTypeLabel}</Badge>}
                {match?.is_draw && <Badge variant="outline">Egalite</Badge>}
                <Badge variant={CONTESTATION_STATUS_CONFIG[contestation.status]?.variant || 'outline'}>
                  {CONTESTATION_STATUS_CONFIG[contestation.status]?.label || contestation.status}
                </Badge>
              </div>
              {match?.completed_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Joue le {new Date(match.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Contestation info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Contestataire</Label>
              <p className="font-medium">{contestation.contestant?.username || 'Inconnu'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date de contestation</Label>
              <p className="text-sm">
                {new Date(contestation.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Raison</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{contestation.reason}</p>
          </div>

          {/* Participants table */}
          <div>
            <Label className="text-muted-foreground flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              Participants du match
            </Label>
            {participantsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : !participants?.length ? (
              <p className="text-sm text-muted-foreground">Aucun participant trouve</p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Joueur</th>
                      <th className="text-center px-3 py-2 font-medium">Place</th>
                      <th className="text-center px-3 py-2 font-medium">PV</th>
                      <th className="text-center px-3 py-2 font-medium">Confirme</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => {
                      const isContestant = p.user_id === contestation.user_id;
                      const pvChange = p.elo_before !== null && p.elo_after !== null
                        ? p.elo_after - p.elo_before
                        : null;
                      return (
                        <tr key={p.id} className={isContestant ? 'bg-warning/10' : ''}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className={isContestant ? 'font-semibold' : ''}>
                                {p.profile?.username || 'Inconnu'}
                              </span>
                              {isContestant && (
                                <Badge variant="warning" className="text-xs">Contestataire</Badge>
                              )}
                              {p.role === 'referee' && (
                                <Badge variant="secondary" className="text-xs">Arbitre</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.placement !== null ? (
                              <div className="flex items-center justify-center gap-1">
                                {p.placement === 1 && <Trophy className="h-3.5 w-3.5 text-yellow-500" />}
                                <span>{p.placement}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {pvChange !== null ? (
                              <span className={pvChange > 0 ? 'text-green-600 font-medium' : pvChange < 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                                {pvChange > 0 ? '+' : ''}{pvChange}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.result_confirmed === true ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : p.result_confirmed === false ? (
                              <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                            ) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {contestation.admin_note && (
            <div>
              <Label className="text-muted-foreground">Note admin</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{contestation.admin_note}</p>
            </div>
          )}

          {isPending && (
            <>
              <Separator />

              <div>
                <Label className="mb-2 block">Resolution</Label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved_cancelled">Annuler le match + rollback PV</SelectItem>
                    <SelectItem value="resolved_dismissed">Rejeter la contestation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block">Note admin (optionnel)</Label>
                <Textarea
                  placeholder="Commentaire sur la resolution..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>

              {resolution === 'resolved_cancelled' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={!resolution || resolveContestation.isPending}
                      className="w-full"
                    >
                      {resolveContestation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Annuler le match et reverser les PV
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer l'annulation du match ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le match sera annule et tous les PV associes seront reverses. Cette action est irreversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResolve}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={handleResolve}
                  disabled={!resolution || resolveContestation.isPending}
                  className="w-full"
                >
                  {resolveContestation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Resoudre
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Player Profile Card (for reports) ============

function PlayerProfileCard({ userId, label, username }: { userId: string; label: string; username: string | null }) {
  const { data: profile, isLoading } = useUserProfile(userId);

  if (isLoading) return <Skeleton className="h-20" />;

  const reliabilityScore = profile?.reliability_score ?? 100;
  const reliabilityColor = reliabilityScore >= 80 ? 'text-green-600' : reliabilityScore >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="p-3 rounded-lg border bg-muted/20">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <p className="font-semibold mt-0.5">{username || profile?.username || 'Inconnu'}</p>
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">{profile?.role || 'user'}</Badge>
        <span className={`text-xs font-medium ${reliabilityColor}`}>
          Fiabilite : {reliabilityScore}/100
        </span>
        {profile?.is_banned && (
          <Badge variant="destructive" className="text-xs">Banni</Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Inscrit le {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </p>
    </div>
  );
}

// ============ Report Resolution Dialog ============

function ReportDialog({
  report,
  onClose,
}: {
  report: PlayerReport;
  onClose: () => void;
}) {
  const resolveReport = useResolveReport();
  const { data: reportHistory, isLoading: historyLoading } = usePlayerReportHistory(report.reported_user_id);
  const [resolution, setResolution] = useState<'resolved_warned' | 'resolved_suspended' | 'resolved_banned' | 'resolved_dismissed' | ''>('');
  const [adminNote, setAdminNote] = useState('');
  const [reliabilityPenalty, setReliabilityPenalty] = useState('50');

  // Exclude current report from history
  const pastReports = (reportHistory || []).filter(r => r.id !== report.id);

  const handleResolve = () => {
    if (!resolution) return;
    resolveReport.mutate(
      {
        reportId: report.id,
        reportedUserId: report.reported_user_id,
        resolution,
        adminNote,
        reliabilityPenalty: resolution === 'resolved_suspended' ? parseInt(reliabilityPenalty, 10) : undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  const isPending = report.status === 'pending';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Signalement de joueur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Player profiles side by side */}
          <div className="grid grid-cols-2 gap-4">
            <PlayerProfileCard
              userId={report.reported_user_id}
              label="Joueur signale"
              username={report.reported_user?.username || null}
            />
            <PlayerProfileCard
              userId={report.reporter_id}
              label="Signale par"
              username={report.reporter?.username || null}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Date du signalement</Label>
              <p className="text-sm">
                {new Date(report.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Statut</Label>
              <Badge variant={REPORT_STATUS_CONFIG[report.status]?.variant || 'outline'}>
                {REPORT_STATUS_CONFIG[report.status]?.label || report.status}
              </Badge>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground">Raison</Label>
            <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{report.reason}</p>
          </div>

          {report.admin_note && (
            <div>
              <Label className="text-muted-foreground">Note admin</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">{report.admin_note}</p>
            </div>
          )}

          {/* Report history for this player */}
          <div>
            <Label className="text-muted-foreground flex items-center gap-2 mb-2">
              <History className="h-4 w-4" />
              Historique des signalements ({pastReports.length})
            </Label>
            {historyLoading ? (
              <Skeleton className="h-16" />
            ) : pastReports.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                Aucun signalement precedent pour ce joueur
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pastReports.map(r => (
                  <div key={r.id} className="p-2.5 rounded-lg border bg-muted/20 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={REPORT_STATUS_CONFIG[r.status as keyof typeof REPORT_STATUS_CONFIG]?.variant || 'outline'} className="text-xs">
                        {REPORT_STATUS_CONFIG[r.status as keyof typeof REPORT_STATUS_CONFIG]?.label || r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        par {r.reporter?.username || 'Inconnu'} — {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{r.reason}</p>
                    {r.admin_note && (
                      <p className="text-xs mt-1 italic text-muted-foreground">Note: {r.admin_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isPending && (
            <>
              <Separator />

              <div>
                <Label className="mb-2 block">Resolution</Label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as typeof resolution)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resolved_warned">Avertir le joueur</SelectItem>
                    <SelectItem value="resolved_suspended">Suspendre (penalite fiabilite)</SelectItem>
                    <SelectItem value="resolved_banned">Bannir le joueur</SelectItem>
                    <SelectItem value="resolved_dismissed">Rejeter le signalement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resolution === 'resolved_suspended' && (
                <div>
                  <Label className="mb-2 block">Nouveau score de fiabilite</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={reliabilityPenalty}
                      onChange={(e) => setReliabilityPenalty(e.target.value)}
                      className="w-[120px]"
                    />
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-2 block">Note admin (optionnel)</Label>
                <Textarea
                  placeholder="Commentaire sur la resolution..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                />
              </div>

              {resolution === 'resolved_banned' ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={!resolution || resolveReport.isPending}
                      className="w-full"
                    >
                      {resolveReport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Bannir le joueur
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer le bannissement ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le joueur {report.reported_user?.username} sera exclu de l'application. Cette action peut etre annulee depuis la page de gestion des joueurs.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleResolve}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmer le ban
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  onClick={handleResolve}
                  disabled={!resolution || resolveReport.isPending}
                  className="w-full"
                >
                  {resolveReport.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Resoudre
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
