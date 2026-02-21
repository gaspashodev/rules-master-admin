import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Plus, Search, Star, Trash2, Pencil, Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { Pagination } from '@/components/ui/pagination';
import {
  useTournamentTemplates,
  useDeleteTournamentTemplate,
} from '@/hooks/useTournamentTemplates';
import { isDraft, type TournamentTemplate } from '@/types/tournament-templates';
import { BracketPreview } from './TournamentFormPage';

const PAGE_SIZE = 50;

// ============ DETAIL DIALOG ============

function TournamentDetailDialog({
  open,
  onOpenChange,
  template,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TournamentTemplate | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!template) return null;

  const draft = isDraft(template);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {template.custom_title || template.share_code}
            {draft && <Badge variant="secondary">Brouillon</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Code de partage</Label>
              <p className="font-mono font-medium">{template.share_code}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Taille</Label>
              <p className="font-medium">{template.size} jeux {draft && <span className="text-muted-foreground">({template.all_games.length} remplis)</span>}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Cree le</Label>
              <p className="font-medium">{new Date(template.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            {template.custom_title && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Titre</Label>
                <p className="font-medium">{template.custom_title}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Mis en avant</Label>
              <p className="font-medium">{template.is_featured ? 'Oui' : 'Non'}</p>
            </div>
            {template.description && (
              <div className="col-span-3">
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm">{template.description}</p>
              </div>
            )}
            {template.expires_at && (
              <div>
                <Label className="text-muted-foreground">Expire le</Label>
                <p className="font-medium">{new Date(template.expires_at).toLocaleDateString('fr-FR')}</p>
              </div>
            )}
            {template.custom_image_url && (
              <div>
                <Label className="text-muted-foreground">Image de couverture</Label>
                <img src={template.custom_image_url} alt="" className="h-20 rounded object-cover mt-1" />
              </div>
            )}
            {template.custom_share_image_url && (
              <div>
                <Label className="text-muted-foreground">Image de partage</Label>
                <img src={template.custom_share_image_url} alt="" className="h-20 rounded object-cover mt-1" />
              </div>
            )}
          </div>

          <Separator />

          {/* Games list */}
          <div>
            <h3 className="font-semibold mb-3">Jeux ({template.all_games.length}/{template.size})</h3>
            <div className="space-y-1">
              {template.all_games.map((game, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                  <span className="text-xs text-muted-foreground w-7 text-right font-mono">{i + 1}.</span>
                  {game.image_url && (
                    <img src={game.image_url} alt="" className="h-7 w-7 rounded object-cover" />
                  )}
                  <span className="flex-1 font-medium truncate">{game.name}</span>
                  <Badge variant={game.is_custom ? 'secondary' : 'outline'} className="text-xs">
                    {game.is_custom ? 'Custom' : 'BGG'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {template.all_games.length >= 2 && (
            <>
              <Separator />
              <BracketPreview games={template.all_games} />
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce tournoi ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Le tournoi "{template.share_code}" sera supprime definitivement. Les resultats lies ne seront pas affectes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN PAGE ============

export function TournamentTemplatesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TournamentTemplate | null>(null);

  const { data, isLoading } = useTournamentTemplates({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
  });

  const deleteTemplate = useDeleteTournamentTemplate();

  const totalPages = Math.ceil((data?.count || 0) / PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const handleOpenEdit = () => {
    if (selectedTemplate) {
      navigate(`/tournament/templates/${selectedTemplate.id}`);
      setSelectedTemplate(null);
    }
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;
    deleteTemplate.mutate(selectedTemplate.id, {
      onSuccess: () => setSelectedTemplate(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="h-7 w-7" />
            Tournois personnalises
          </h1>
          <p className="text-muted-foreground">{data?.count || 0} tournois</p>
        </div>
        <Button onClick={() => navigate('/tournament/templates/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau tournoi
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher par code ou titre..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des tournois</CardTitle>
        </CardHeader>
        <CardContent>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

          <div className="space-y-2 mt-4">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : !data?.data?.length ? (
              <p className="text-muted-foreground text-center py-8">Aucun tournoi trouve</p>
            ) : (
              data.data.map(t => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedTemplate(t)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">{t.share_code}</code>
                      <Badge variant="outline">{t.all_games.length}/{t.size} jeux</Badge>
                      {isDraft(t) && (
                        <Badge variant="secondary">Brouillon</Badge>
                      )}
                      {t.is_featured && (
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Featured
                        </Badge>
                      )}
                      {t.expires_at && new Date(t.expires_at) < new Date() && (
                        <Badge variant="destructive">Expire</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{t.custom_title || '(sans titre)'}</span>
                      <span>{new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedTemplate(t); }}>
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

      {/* Detail Dialog */}
      <TournamentDetailDialog
        open={!!selectedTemplate}
        onOpenChange={(open) => !open && setSelectedTemplate(null)}
        template={selectedTemplate}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
