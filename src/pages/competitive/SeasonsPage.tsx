import { useState } from 'react';
import { Calendar, Plus, Pencil, AlertTriangle, Loader2, CheckCircle2, Users, Swords } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  useSeasons,
  useActivateSeason,
  useCompleteSeason,
  useUpdateSeasonEndDate,
  useCreateSeason,
  useSeasonStats,
} from '@/hooks/useCitiesSeasons';
import { SEASON_STATUS_CONFIG } from '@/types/cities-seasons';
import type { Season } from '@/types/cities-seasons';

function StatItem({ icon: Icon, label, value, warn }: { icon: React.ElementType; label: string; value: number; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${warn && value > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'bg-muted/30'}`}>
      <Icon className={`h-5 w-5 ${warn && value > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold text-lg">{value}</p>
      </div>
    </div>
  );
}

function SeasonStatsPanel({ season }: { season: Season }) {
  const { data: stats, isLoading } = useSeasonStats(season);

  if (isLoading) return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Implications de la clôture :</p>
      <div className="grid grid-cols-3 gap-3">
        <StatItem icon={Swords} label="Parties terminées" value={stats.completed_matches} />
        <StatItem icon={AlertTriangle} label="Parties en cours" value={stats.active_matches} warn />
        <StatItem icon={Users} label="Joueurs participants" value={stats.total_players} />
      </div>
      {stats.active_matches > 0 && (
        <p className="text-sm text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-4 w-4" />
          {stats.active_matches} partie{stats.active_matches > 1 ? 's' : ''} en cours seront impactée{stats.active_matches > 1 ? 's' : ''} par la clôture.
        </p>
      )}
    </div>
  );
}

function EditEndDateDialog({
  season,
  open,
  onClose,
}: {
  season: Season;
  open: boolean;
  onClose: () => void;
}) {
  const currentEnd = season.ends_at.split('T')[0];
  const [endsAt, setEndsAt] = useState(currentEnd);
  const [message, setMessage] = useState('');
  const updateEndDate = useUpdateSeasonEndDate();

  const hasChanged = endsAt !== currentEnd;

  const handleSubmit = () => {
    updateEndDate.mutate(
      {
        seasonId: season.id,
        endsAt: new Date(endsAt).toISOString(),
        broadcastMessage: message || undefined,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier la date de fin — Saison {season.season_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date de fin actuelle</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(season.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ends_at">Nouvelle date de fin</Label>
            <Input
              id="ends_at"
              type="date"
              value={endsAt}
              min={season.starts_at.split('T')[0]}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>

          {hasChanged && (
            <div className="space-y-2">
              <Label htmlFor="message">
                Message aux joueurs{' '}
                <span className="text-muted-foreground font-normal">(recommandé)</span>
              </Label>
              <Textarea
                id="message"
                placeholder={`Ex: La date de fin de la saison ${season.season_number} a été modifiée au ${endsAt ? new Date(endsAt).toLocaleDateString('fr-FR') : '...'}. Profitez-en pour accumuler vos points !`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Ce message sera envoyé à tous les joueurs ayant participé à cette saison.
              </p>
            </div>
          )}

          {!hasChanged && (
            <p className="text-sm text-muted-foreground">Modifiez la date pour pouvoir enregistrer.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!hasChanged || updateEndDate.isPending}
          >
            {updateEndDate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateSeasonDialog({
  open,
  onClose,
  nextSeasonNumber,
}: {
  open: boolean;
  onClose: () => void;
  nextSeasonNumber: number;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [seasonNumber, setSeasonNumber] = useState(String(nextSeasonNumber));
  const [startsAt, setStartsAt] = useState(today);
  const [endsAt, setEndsAt] = useState('');
  const [startNow, setStartNow] = useState(false);

  const createSeason = useCreateSeason();

  const handleSubmit = () => {
    if (!endsAt) return;
    createSeason.mutate(
      {
        season_number: parseInt(seasonNumber),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status: startNow ? 'active' : 'upcoming',
      },
      { onSuccess: onClose }
    );
  };

  const isValid = endsAt && startsAt && endsAt > startsAt && parseInt(seasonNumber) > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle saison</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="season_number">Numéro de saison</Label>
            <Input
              id="season_number"
              type="number"
              min={1}
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value)}
              className="w-32"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Date de début</Label>
              <Input
                id="starts_at"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Date de fin</Label>
              <Input
                id="ends_at"
                type="date"
                value={endsAt}
                min={startsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Statut initial</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStartNow(false)}
                className={`flex-1 rounded-lg border p-3 text-sm text-left transition-colors ${!startNow ? 'border-primary bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <p className="font-medium">Programmer</p>
                <p className="text-xs mt-0.5 opacity-70">Statut : À venir</p>
              </button>
              <button
                type="button"
                onClick={() => setStartNow(true)}
                className={`flex-1 rounded-lg border p-3 text-sm text-left transition-colors ${startNow ? 'border-primary bg-primary/5 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                <p className="font-medium">Démarrer maintenant</p>
                <p className="text-xs mt-0.5 opacity-70">Statut : Active</p>
              </button>
            </div>
            {startNow && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Assurez-vous qu'aucune autre saison n'est déjà active.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!isValid || createSeason.isPending}>
            {createSeason.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {startNow ? 'Créer et démarrer' : 'Programmer la saison'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SeasonsPage() {
  const { data: seasons, isLoading } = useSeasons();
  const activateSeason = useActivateSeason();
  const completeSeason = useCompleteSeason();

  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [closingSeason, setClosingSeason] = useState<Season | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const nextSeasonNumber = seasons ? Math.max(...seasons.map(s => s.season_number), 0) + 1 : 1;
  const hasActiveSeason = seasons?.some(s => s.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Calendar className="h-7 w-7" />
            Saisons
          </h1>
          <p className="text-muted-foreground">Gestion des saisons compétitives</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle saison
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saisons compétitives</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !seasons?.length ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-muted-foreground">Aucune saison enregistrée</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer la première saison
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {seasons.map(season => (
                <div key={season.id} className="rounded-lg border p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Saison {season.season_number}</span>
                      <Badge variant={SEASON_STATUS_CONFIG[season.status]?.variant || 'outline'}>
                        {SEASON_STATUS_CONFIG[season.status]?.label}
                      </Badge>
                      {season.status === 'completed' && (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Edit end date — available for active and upcoming */}
                      {season.status !== 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSeason(season)}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Modifier fin
                        </Button>
                      )}

                      {/* Activate upcoming */}
                      {season.status === 'upcoming' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={hasActiveSeason}>
                              Activer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Activer la saison {season.season_number} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                La saison active actuelle sera clôturée et cette saison deviendra la saison active.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => activateSeason.mutate(season.id)}>
                                Activer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Close active season */}
                      {season.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                          onClick={() => setClosingSeason(season)}
                        >
                          Terminer la saison
                        </Button>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Du {new Date(season.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' — '}
                    Au {new Date(season.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit end date dialog */}
      {editingSeason && (
        <EditEndDateDialog
          season={editingSeason}
          open={!!editingSeason}
          onClose={() => setEditingSeason(null)}
        />
      )}

      {/* Close season dialog with stats */}
      {closingSeason && (
        <AlertDialog open onOpenChange={(o) => !o && setClosingSeason(null)}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Terminer la saison {closingSeason.season_number} ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. La saison sera marquée comme terminée.
                Pensez ensuite à attribuer les succès CHAMPION depuis la rubrique Champions.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <SeasonStatsPanel season={closingSeason} />

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setClosingSeason(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { completeSeason.mutate(closingSeason.id); setClosingSeason(null); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmer la clôture
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Create season dialog */}
      <CreateSeasonDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        nextSeasonNumber={nextSeasonNumber}
      />
    </div>
  );
}
