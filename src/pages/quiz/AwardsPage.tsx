import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  useBggAwards,
  useCreateBggAward,
  useUpdateBggAward,
  useDeleteBggAward,
} from '@/hooks/useBggQuiz';
import type { BggAward, BggAwardFormData, AwardName, AwardCategory } from '@/types/bgg-quiz';
import { AWARD_NAMES, AWARD_CATEGORIES_BY_AWARD } from '@/types/bgg-quiz';
import {
  Plus,
  Trash2,
  Pencil,
  Trophy,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface GroupedAwards {
  [award: string]: {
    [year: number]: BggAward[];
  };
}

const defaultFormData: BggAwardFormData = {
  award: "As d'Or",
  category: 'Tout public',
  year: new Date().getFullYear(),
  bgg_id: 0,
  game_name: '',
};

export function AwardsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<BggAward | null>(null);
  const [formData, setFormData] = useState<BggAwardFormData>(defaultFormData);
  const [expandedAwards, setExpandedAwards] = useState<Set<string>>(
    new Set(["As d'Or", 'Spiel des Jahres'])
  );

  const { data: awards, isLoading } = useBggAwards();
  const createAward = useCreateBggAward();
  const updateAward = useUpdateBggAward();
  const deleteAward = useDeleteBggAward();

  // Group awards by award type, then by year
  const groupedAwards: GroupedAwards = {};
  awards?.forEach((award) => {
    if (!groupedAwards[award.award]) {
      groupedAwards[award.award] = {};
    }
    if (!groupedAwards[award.award][award.year]) {
      groupedAwards[award.award][award.year] = [];
    }
    groupedAwards[award.award][award.year].push(award);
  });

  const toggleAwardExpanded = (award: string) => {
    const newExpanded = new Set(expandedAwards);
    if (newExpanded.has(award)) {
      newExpanded.delete(award);
    } else {
      newExpanded.add(award);
    }
    setExpandedAwards(newExpanded);
  };

  const openCreateDialog = () => {
    setEditingAward(null);
    setFormData(defaultFormData);
    setIsDialogOpen(true);
  };

  const openEditDialog = (award: BggAward) => {
    setEditingAward(award);
    // Normaliser le nom du prix pour correspondre aux clés de AWARD_CATEGORIES_BY_AWARD
    const normalizedAward: AwardName = AWARD_NAMES.includes(award.award as AwardName)
      ? (award.award as AwardName)
      : "As d'Or";
    const availableCategories = AWARD_CATEGORIES_BY_AWARD[normalizedAward];
    // Vérifier si la catégorie existe dans les catégories disponibles
    const normalizedCategory = availableCategories.includes(award.category as AwardCategory)
      ? award.category
      : availableCategories[0];
    setFormData({
      award: normalizedAward,
      category: normalizedCategory,
      year: award.year,
      bgg_id: award.bgg_id,
      game_name: award.game_name,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingAward) {
      await updateAward.mutateAsync({ id: editingAward.id, data: formData });
    } else {
      await createAward.mutateAsync(formData);
    }
    setIsDialogOpen(false);
  };

  const isPending = createAward.isPending || updateAward.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            Prix & Récompenses
          </h1>
          <p className="text-muted-foreground">
            Gérer les jeux primés utilisés dans le quiz
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un prix
        </Button>
      </div>

      {/* Liste des prix */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.keys(groupedAwards).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Aucun prix enregistré</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter le premier prix
                </Button>
              </CardContent>
            </Card>
          )}
          {Object.entries(groupedAwards).map(([awardName, yearGroups]) => {
            const isExpanded = expandedAwards.has(awardName);
            const totalCount = Object.values(yearGroups).flat().length;

            return (
              <Card key={awardName}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleAwardExpanded(awardName)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      {awardName}
                    </CardTitle>
                    <Badge variant="secondary">{totalCount} prix</Badge>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {Object.entries(yearGroups)
                        .sort(([a], [b]) => Number(b) - Number(a))
                        .map(([year, awardsInYear]) => (
                          <div key={year}>
                            <h3 className="font-semibold text-lg mb-2 text-muted-foreground">
                              {year}
                            </h3>
                            <div className="grid gap-2">
                              {awardsInYear.map((award) => (
                                <div
                                  key={award.id}
                                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="outline">{award.category}</Badge>
                                      <span className="font-medium">{award.game_name}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                                            <a
                                        href={`https://boardgamegeek.com/boardgame/${award.bgg_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        BGG #{award.bgg_id}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditDialog(award)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="text-destructive h-8 w-8"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>
                                            Supprimer ce prix ?
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Cette action est irréversible.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteAward.mutate(award.id)}
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
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de création/édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAward ? 'Modifier le prix' : 'Ajouter un prix'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix</Label>
                <Select
                  value={formData.award}
                  onValueChange={(v) => {
                    const newAward = v as AwardName;
                    const availableCategories = AWARD_CATEGORIES_BY_AWARD[newAward];
                    setFormData((f) => ({
                      ...f,
                      award: newAward,
                      category: availableCategories[0],
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AWARD_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) =>
                    setFormData((f) => ({ ...f, category: v as AwardCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(AWARD_CATEGORIES_BY_AWARD[formData.award] || []).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Année</Label>
              <Input
                type="number"
                min={1978}
                max={new Date().getFullYear() + 1}
                value={formData.year}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, year: parseInt(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nom du jeu</Label>
              <Input
                value={formData.game_name}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, game_name: e.target.value }))
                }
                placeholder="Ex: Cascadia"
              />
            </div>
            <div className="space-y-2">
              <Label>BGG ID</Label>
              <Input
                type="number"
                min={1}
                value={formData.bgg_id || ''}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, bgg_id: parseInt(e.target.value) || 0 }))
                }
                placeholder="Ex: 295947"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending || !formData.game_name}
            >
              {isPending ? 'Enregistrement...' : editingAward ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
