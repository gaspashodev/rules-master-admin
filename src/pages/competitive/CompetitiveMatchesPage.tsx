import { useState } from 'react';
import {
  Swords, Eye, CheckCircle, XCircle, Clock,
  Ban, MoreHorizontal, Crown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pagination } from '@/components/ui/pagination';
import {
  useCompetitiveMatches,
  useMatchParticipants,
  useForceConfirmResults,
  useCancelMatch,
  useModifyPlayerPv,
  useResetPlayerSeasonPv,
} from '@/hooks/useCompetitive';
import { useCities } from '@/hooks/useCitiesSeasons';
import { MATCH_STATUS_CONFIG, MATCH_TYPE_CONFIG } from '@/types/competitive';
import type { CompetitiveMatch, MatchParticipant, MatchStatus, MatchType } from '@/types/competitive';

const PAGE_SIZE = 50;

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? `${String(m).padStart(2, '0')}` : ''}`;
  return `${m}min`;
}

export function CompetitiveMatchesPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<MatchStatus | 'all'>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchType | 'all'>('all');
  const [selectedMatch, setSelectedMatch] = useState<CompetitiveMatch | null>(null);
  const [modifyPvTarget, setModifyPvTarget] = useState<MatchParticipant | null>(null);
  const [newElo, setNewElo] = useState<string>('');
  const [resetPvTarget, setResetPvTarget] = useState<MatchParticipant | null>(null);

  const { data, isLoading } = useCompetitiveMatches({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    city_id: cityFilter,
    match_type: matchTypeFilter,
  });

  const { data: cities } = useCities();
  const { data: participants } = useMatchParticipants(selectedMatch?.id);

  const forceConfirm = useForceConfirmResults();
  const cancelMatch = useCancelMatch();
  const modifyPv = useModifyPlayerPv();
  const resetPv = useResetPlayerSeasonPv();

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const handleModifyPv = () => {
    if (!modifyPvTarget || !selectedMatch || !newElo) return;
    modifyPv.mutate({
      userId: modifyPvTarget.user_id,
      cityId: selectedMatch.city_id || '',
      seasonId: selectedMatch.season_id || '',
      gameId: selectedMatch.game_id,
      newElo: parseInt(newElo, 10),
    }, {
      onSuccess: () => {
        setModifyPvTarget(null);
        setNewElo('');
      },
    });
  };

  const handleResetPv = () => {
    if (!resetPvTarget || !selectedMatch) return;
    resetPv.mutate({
      userId: resetPvTarget.user_id,
      seasonId: selectedMatch.season_id || '',
    }, {
      onSuccess: () => setResetPvTarget(null),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Crown className="h-7 w-7" />
          Matchs compétitifs
        </h1>
        <p className="text-muted-foreground">{data?.count || 0} matchs</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as MatchStatus | 'all'); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.entries(MATCH_STATUS_CONFIG) as [MatchStatus, { label: string }][]).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities?.map(city => (
                  <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={matchTypeFilter} onValueChange={(v) => { setMatchTypeFilter(v as MatchType | 'all'); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {(Object.entries(MATCH_TYPE_CONFIG) as [MatchType, { label: string }][]).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Matches List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des matchs</CardTitle>
        </CardHeader>
        <CardContent>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          <div className="space-y-2 mt-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : !data?.data?.length ? (
              <p className="text-muted-foreground text-center py-8">Aucun match trouvé</p>
            ) : (
              data.data.map(match => (
                <div
                  key={match.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">{match.join_code}</code>
                      <Badge variant={MATCH_STATUS_CONFIG[match.status]?.variant || 'outline'}>
                        {MATCH_STATUS_CONFIG[match.status]?.label || match.status}
                      </Badge>
                      <Badge variant="outline">{MATCH_TYPE_CONFIG[match.match_type]?.label || match.match_type}</Badge>
                      {match.results_pending_confirmation && (
                        <Badge variant="warning">Confirmation en attente</Badge>
                      )}
                      {match.is_draw && <Badge variant="secondary">Égalité</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{match.game?.name_fr || match.game?.name || 'Jeu inconnu'}</span>
                      {match.city?.name && <span>{match.city.name}</span>}
                      <span>{match.creator?.username || 'Inconnu'}</span>
                      <span>{new Date(match.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      {match.duration_seconds && <span>{formatDuration(match.duration_seconds)}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedMatch(match); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </CardContent>
      </Card>

      {/* Match Detail Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Match {selectedMatch?.join_code} — {selectedMatch?.game?.name_fr || selectedMatch?.game?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              {/* Match Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Statut</Label>
                  <div className="mt-1">
                    <Badge variant={MATCH_STATUS_CONFIG[selectedMatch.status]?.variant || 'outline'}>
                      {MATCH_STATUS_CONFIG[selectedMatch.status]?.label || selectedMatch.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{MATCH_TYPE_CONFIG[selectedMatch.match_type]?.label || selectedMatch.match_type}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Ville</Label>
                  <p className="font-medium">{selectedMatch.city?.name || 'Non spécifié'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Créateur</Label>
                  <p className="font-medium">{selectedMatch.creator?.username || 'Inconnu'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Début</Label>
                  <p className="font-medium">
                    {selectedMatch.started_at
                      ? new Date(selectedMatch.started_at).toLocaleString('fr-FR')
                      : 'Non démarré'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Durée</Label>
                  <p className="font-medium">
                    {selectedMatch.duration_seconds ? formatDuration(selectedMatch.duration_seconds) : '-'}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Égalité</Label>
                  <p className="font-medium">{selectedMatch.is_draw ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Arbitre</Label>
                  <p className="font-medium">{selectedMatch.has_referee ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Confirmation</Label>
                  <p className="font-medium">{selectedMatch.results_pending_confirmation ? 'En attente' : 'OK'}</p>
                </div>
              </div>

              <Separator />

              {/* Participants */}
              <div>
                <h3 className="font-semibold mb-3">Participants ({participants?.length || 0})</h3>
                {!participants?.length ? (
                  <p className="text-muted-foreground text-sm">Aucun participant</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <div className="grid grid-cols-7 gap-2 p-3 bg-muted text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <span>Joueur</span>
                      <span>Rôle</span>
                      <span>Équipe</span>
                      <span>Place</span>
                      <span>PV</span>
                      <span>Vote</span>
                      <span></span>
                    </div>
                    {participants.map(p => (
                      <div key={p.id} className="grid grid-cols-7 gap-2 p-3 border-t items-center text-sm">
                        <span className="font-medium truncate">{p.profile?.username || 'Inconnu'}</span>
                        <span>{p.role === 'referee' ? 'Arbitre' : 'Joueur'}</span>
                        <span>{p.team_id ?? '-'}</span>
                        <span className="font-medium">{p.placement ?? '-'}</span>
                        <span>
                          {p.elo_before != null && p.elo_after != null ? (
                            <span>
                              {p.elo_before} → {p.elo_after}{' '}
                              <span className={
                                (p.elo_change || 0) > 0 ? 'text-green-600' :
                                (p.elo_change || 0) < 0 ? 'text-red-600' : ''
                              }>
                                ({(p.elo_change || 0) > 0 ? '+' : ''}{p.elo_change || 0})
                              </span>
                            </span>
                          ) : '-'}
                        </span>
                        <span>
                          {p.result_confirmed === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {p.result_confirmed === false && <XCircle className="h-4 w-4 text-red-500" />}
                          {p.result_confirmed === null && <Clock className="h-4 w-4 text-muted-foreground" />}
                        </span>
                        <span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setModifyPvTarget(p);
                                setNewElo(String(p.elo_after ?? p.elo_before ?? 0));
                              }}>
                                Modifier PV
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setResetPvTarget(p)}
                              >
                                Reset PV saison
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Admin Actions */}
              <div className="flex gap-2 flex-wrap">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={selectedMatch.status === 'completed' || selectedMatch.status === 'cancelled'}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Forcer confirmation
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Forcer la confirmation des résultats ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tous les votes seront marqués comme confirmés. Les PV seront appliqués si le front-end détecte la majorité.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => forceConfirm.mutate(selectedMatch.id)}>
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={selectedMatch.status === 'cancelled'}>
                      <Ban className="h-4 w-4 mr-2" />
                      Annuler le match
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Annuler ce match ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le match sera marqué comme annulé et tous les PV gagnés ou perdus seront reversés. Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => cancelMatch.mutate(selectedMatch.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Annuler le match
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modify PV Dialog */}
      <Dialog open={!!modifyPvTarget} onOpenChange={(open) => { if (!open) { setModifyPvTarget(null); setNewElo(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier PV de {modifyPvTarget?.profile?.username}</DialogTitle>
          </DialogHeader>
          {modifyPvTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">PV avant</Label>
                  <p className="font-medium">{modifyPvTarget.elo_before ?? '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">PV actuel (après)</Label>
                  <p className="font-medium">{modifyPvTarget.elo_after ?? '-'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nouveau PV</Label>
                <Input
                  type="number"
                  value={newElo}
                  onChange={(e) => setNewElo(e.target.value)}
                  min={0}
                />
                {newElo && modifyPvTarget.elo_before != null && (
                  <p className="text-xs text-muted-foreground">
                    Delta: {parseInt(newElo, 10) - (modifyPvTarget.elo_before || 0)}{' '}
                    (était {modifyPvTarget.elo_change ?? 0})
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setModifyPvTarget(null); setNewElo(''); }}>
              Annuler
            </Button>
            <Button onClick={handleModifyPv} disabled={!newElo || modifyPv.isPending}>
              Modifier et recalculer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset PV AlertDialog */}
      <AlertDialog open={!!resetPvTarget} onOpenChange={(open) => !open && setResetPvTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Réinitialiser les PV de {resetPvTarget?.profile?.username} pour la saison ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les PV du joueur pour cette saison seront remis à zéro dans toutes les villes et tous les jeux.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPv}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
