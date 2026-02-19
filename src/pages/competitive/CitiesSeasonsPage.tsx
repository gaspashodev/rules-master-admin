import { MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useCities, useToggleCityActive, useSeasons, useActivateSeason, useCompleteSeason } from '@/hooks/useCitiesSeasons';
import { SEASON_STATUS_CONFIG } from '@/types/cities-seasons';

export function CitiesSeasonsPage() {
  const { data: cities, isLoading: citiesLoading } = useCities();
  const { data: seasons, isLoading: seasonsLoading } = useSeasons();
  const toggleActive = useToggleCityActive();
  const activateSeason = useActivateSeason();
  const completeSeason = useCompleteSeason();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MapPin className="h-7 w-7" />
          Villes & Saisons
        </h1>
        <p className="text-muted-foreground">Gestion des villes et saisons compétitives</p>
      </div>

      <Tabs defaultValue="cities">
        <TabsList>
          <TabsTrigger value="cities">Villes ({cities?.length || 0})</TabsTrigger>
          <TabsTrigger value="seasons">Saisons ({seasons?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="cities">
          <Card>
            <CardHeader>
              <CardTitle>Villes enregistrées</CardTitle>
            </CardHeader>
            <CardContent>
              {citiesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !cities?.length ? (
                <p className="text-muted-foreground text-center py-8">Aucune ville enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {cities.map(city => (
                    <div key={city.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{city.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-muted-foreground">Forcer active</Label>
                          <Switch
                            checked={city.force_active}
                            onCheckedChange={(checked) =>
                              toggleActive.mutate({ cityId: city.id, forceActive: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasons">
          <Card>
            <CardHeader>
              <CardTitle>Saisons compétitives</CardTitle>
            </CardHeader>
            <CardContent>
              {seasonsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : !seasons?.length ? (
                <p className="text-muted-foreground text-center py-8">Aucune saison enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {seasons.map(season => (
                    <div key={season.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Saison {season.season_number}</p>
                          <Badge variant={SEASON_STATUS_CONFIG[season.status]?.variant || 'outline'}>
                            {SEASON_STATUS_CONFIG[season.status]?.label || season.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(season.starts_at).toLocaleDateString('fr-FR')} — {new Date(season.ends_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {season.status === 'upcoming' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">Activer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Activer la saison {season.season_number} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  La saison active actuelle sera terminée et cette saison deviendra la saison active.
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
                        {season.status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">Terminer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Terminer la saison {season.season_number} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action marquera la saison comme terminée. Cette action est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => completeSeason.mutate(season.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Terminer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
