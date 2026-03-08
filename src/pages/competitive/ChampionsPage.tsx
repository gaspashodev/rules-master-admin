import { useState } from 'react';
import { Crown, CheckCircle2, Circle, AlertTriangle, Loader2, Play, RefreshCw, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useSeasons } from '@/hooks/useCitiesSeasons';
import {
  useAwardSeasonChampions,
  useRecentChampionAchievements,
  useCompleteSeasonForChampions,
  type ChampionResult,
} from '@/hooks/useChampions';
import { SEASON_STATUS_CONFIG } from '@/types/cities-seasons';

const TIER_CONFIG: Record<number, { label: string; badge: string; className: string }> = {
  1: { label: 'Bronze', badge: '🥉', className: 'text-amber-700 bg-amber-100 border-amber-300' },
  2: { label: 'Argent', badge: '🥈', className: 'text-slate-600 bg-slate-100 border-slate-300' },
  3: { label: 'Or', badge: '🥇', className: 'text-yellow-600 bg-yellow-100 border-yellow-300' },
};

function StepIndicator({ step, current, label, done }: { step: number; current: number; label: string; done: boolean }) {
  const isActive = step === current;
  const isPast = step < current || done;
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${isActive ? 'text-foreground' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50'}`}>
      {isPast ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <Circle className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground/30'}`} />
      )}
      <span className={isActive ? 'text-primary font-semibold' : ''}>{step}. {label}</span>
    </div>
  );
}

export function ChampionsPage() {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [step, setStep] = useState(1);
  const [results, setResults] = useState<ChampionResult[] | null>(null);

  const { data: seasons } = useSeasons();
  const completeSeason = useCompleteSeasonForChampions();
  const awardChampions = useAwardSeasonChampions();
  const { data: recentAchievements, refetch: refetchAchievements, isFetching: isFetchingAchievements } = useRecentChampionAchievements();

  const selectedSeason = seasons?.find(s => s.id === selectedSeasonId);

  const handleCompleteSeason = () => {
    completeSeason.mutate(selectedSeasonId, {
      onSuccess: () => setStep(3),
    });
  };

  const handleAwardChampions = async () => {
    const data = await awardChampions.mutateAsync(selectedSeasonId);
    setResults(data);
    setStep(4);
    refetchAchievements();
  };

  const handleReset = () => {
    setStep(1);
    setSelectedSeasonId('');
    setResults(null);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Crown className="h-7 w-7 text-yellow-500" />
            Attribution des Champions
          </h1>
          <p className="text-muted-foreground">Clôture de saison — Attribution manuelle des succès CHAMPION</p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        )}
      </div>

      {/* Progression */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4">
            <StepIndicator step={1} current={step} label="Sélectionner la saison" done={step > 1} />
            <StepIndicator step={2} current={step} label="Clôturer la saison" done={step > 2} />
            <StepIndicator step={3} current={step} label="Attribuer les champions" done={step > 3} />
            <StepIndicator step={4} current={step} label="Vérifier les résultats" done={false} />
          </div>
        </CardContent>
      </Card>

      {/* ÉTAPE 1 — Sélection de la saison */}
      <Card className={step !== 1 ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {step > 1 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-primary" />}
            Étape 1 — Sélectionner la saison à clôturer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId} disabled={step !== 1}>
            <SelectTrigger className="w-full max-w-sm">
              <SelectValue placeholder="Choisir une saison..." />
            </SelectTrigger>
            <SelectContent>
              {(seasons || []).map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    Saison {s.season_number}
                    <Badge variant={SEASON_STATUS_CONFIG[s.status]?.variant || 'outline'} className="text-xs">
                      {SEASON_STATUS_CONFIG[s.status]?.label}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSeason && (
            <div className="text-sm text-muted-foreground space-y-0.5">
              <p>Du {new Date(selectedSeason.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Au {new Date(selectedSeason.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          )}

          {step === 1 && (
            <Button
              disabled={!selectedSeasonId}
              onClick={() => setStep(selectedSeason?.status === 'completed' ? 3 : 2)}
            >
              Continuer
            </Button>
          )}

          {step === 1 && selectedSeason?.status === 'completed' && (
            <p className="text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Cette saison est déjà terminée — vous pouvez relancer l'attribution (idempotente).
            </p>
          )}
        </CardContent>
      </Card>

      {/* ÉTAPE 2 — Clôturer la saison */}
      {step >= 2 && (
        <Card className={step !== 2 ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {step > 2 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-primary" />}
              Étape 2 — Clôturer la saison
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La saison doit être passée en <code className="bg-muted px-1 rounded text-xs">completed</code> avant d'attribuer les champions.
              Cette opération est irréversible.
            </p>
            {step === 2 && (
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={completeSeason.isPending}>
                      {completeSeason.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Clôturer la saison {selectedSeason?.season_number}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clôturer la saison {selectedSeason?.season_number} ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        La saison sera marquée comme terminée (<code>status = 'completed'</code>).
                        Cette action ne peut pas être annulée via cette interface.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCompleteSeason}>
                        Confirmer la clôture
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            {step > 2 && (
              <Badge variant="success">Saison {selectedSeason?.season_number} clôturée</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* ÉTAPE 3 — Attribuer les champions */}
      {step >= 3 && (
        <Card className={step !== 3 ? 'opacity-60' : ''}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {step > 3 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-primary" />}
              Étape 3 — Attribuer les champions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Appelle la fonction SQL <code className="bg-muted px-1 rounded text-xs">award_season_champions</code>.
              L'opération est idempotente : relancer ne crée pas de doublons.
            </p>
            {step === 3 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={awardChampions.isPending} className="gap-2">
                    {awardChampions.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Lancer l'attribution
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Attribuer les champions ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      La fonction <code>award_season_champions</code> va analyser toutes les villes de la saison {selectedSeason?.season_number} et attribuer les succès CHAMPION aux joueurs éligibles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAwardChampions}>
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}

      {/* ÉTAPE 4 — Résultats */}
      {step >= 4 && results !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Résultats de l'attribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Aucune ville n'avait suffisamment de joueurs éligibles cette saison.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-3">
                  {results.length} ville{results.length > 1 ? 's' : ''} traitée{results.length > 1 ? 's' : ''}
                </p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ville</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Champion</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Palier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => {
                        const tier = TIER_CONFIG[r.tier_awarded];
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2 font-medium">{r.city_name}</td>
                            <td className="px-4 py-2">{r.champion_username}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${tier?.className}`}>
                                {tier?.badge} {tier?.label ?? `Palier ${r.tier_awarded}`}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Vérification post-appel */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Vérification — 20 dernières attributions</h4>
                <Button variant="ghost" size="sm" onClick={() => refetchAchievements()} disabled={isFetchingAchievements}>
                  {isFetchingAchievements ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </Button>
              </div>
              {!recentAchievements?.length ? (
                <p className="text-sm text-muted-foreground">Aucune attribution trouvée.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Joueur</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Palier</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAchievements.map((a, i) => {
                        const tier = TIER_CONFIG[a.tier];
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2">{a.username ?? <span className="text-muted-foreground italic">Inconnu</span>}</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${tier?.className}`}>
                                {tier?.badge} {tier?.label ?? `Palier ${a.tier}`}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {new Date(a.earned_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
