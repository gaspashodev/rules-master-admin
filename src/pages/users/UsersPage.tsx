import { useState } from 'react';
import { Users, Search, ShieldAlert, Ban, SendHorizonal, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
import { useUsers, useSendDirectMessage, useUpdateReliabilityScore, useBanUser, useUnbanUser } from '@/hooks/useUsers';
import { useSeasons } from '@/hooks/useCitiesSeasons';
import { useResetPlayerSeasonPv } from '@/hooks/useCompetitive';
import { useAuth } from '@/hooks/useAuth';
import type { UserProfile } from '@/types/users';

function getReliabilityVariant(score: number): 'default' | 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { data: users, isLoading, isFetching } = useUsers({ search: debouncedSearch });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  };

  const hasSearch = debouncedSearch.length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="h-7 w-7" />
          Gestion des joueurs
        </h1>
        <p className="text-muted-foreground">Recherchez un joueur par pseudo ou adresse email</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par pseudo ou email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
          {search.length > 0 && search.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">Tapez au moins 2 caractères pour lancer la recherche</p>
          )}
        </CardContent>
      </Card>

      {hasSearch && (
        <div className="space-y-2">
          {isLoading || isFetching ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)
          ) : !users?.length ? (
            <p className="text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{users.length} résultat{users.length > 1 ? 's' : ''}</p>
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.username || 'Sans pseudo'}</p>
                      {user.email && (
                        <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                      )}
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge variant={getReliabilityVariant(user.reliability_score)}>
                        Fiabilité: {user.reliability_score}
                      </Badge>
                      {user.is_banned && (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Banni
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserUpdated={(updated) => setSelectedUser(updated)}
        />
      )}
    </div>
  );
}

function UserDetailDialog({
  user,
  onClose,
  onUserUpdated,
}: {
  user: UserProfile;
  onClose: () => void;
  onUserUpdated: (user: UserProfile) => void;
}) {
  const { user: authUser } = useAuth();
  const { data: seasons } = useSeasons();

  const sendMessage = useSendDirectMessage();
  const updateReliability = useUpdateReliabilityScore();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const resetPv = useResetPlayerSeasonPv();

  const [messageContent, setMessageContent] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [newReliabilityScore, setNewReliabilityScore] = useState(String(user.reliability_score));

  const handleSendMessage = () => {
    if (!messageContent.trim() || !authUser) return;
    sendMessage.mutate(
      { senderId: authUser.id, receiverId: user.id, content: messageContent.trim() },
      { onSuccess: () => setMessageContent('') }
    );
  };

  const handleResetPv = () => {
    if (!selectedSeasonId) return;
    resetPv.mutate({ userId: user.id, seasonId: selectedSeasonId });
  };

  const handleUpdateReliability = () => {
    const score = parseInt(newReliabilityScore, 10);
    if (isNaN(score)) return;
    updateReliability.mutate(
      { userId: user.id, newScore: score },
      {
        onSuccess: () => {
          onUserUpdated({ ...user, reliability_score: Math.max(0, Math.min(100, score)) });
        },
      }
    );
  };

  const handleBan = () => {
    banUser.mutate(user.id, {
      onSuccess: () => onUserUpdated({ ...user, is_banned: true }),
    });
  };

  const handleUnban = () => {
    unbanUser.mutate(user.id, {
      onSuccess: () => onUserUpdated({ ...user, is_banned: false }),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user.username || 'Utilisateur'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Profile Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Pseudo</Label>
              <p className="font-medium">{user.username || 'Sans pseudo'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Rôle</Label>
              <p className="font-medium">{user.role}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date d'inscription</Label>
              <p className="font-medium">
                {new Date(user.created_at).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Score de fiabilité</Label>
              <Badge variant={getReliabilityVariant(user.reliability_score)} className="mt-1">
                {user.reliability_score} / 100
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Statut</Label>
              <p className="font-medium">
                {user.is_banned ? (
                  <Badge variant="destructive" className="gap-1">
                    <Ban className="h-3 w-3" /> Banni
                  </Badge>
                ) : (
                  <Badge variant="success">Actif</Badge>
                )}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">ID</Label>
              <p className="font-mono text-xs text-muted-foreground break-all">{user.id}</p>
            </div>
          </div>

          <Separator />

          {/* Send Message */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <SendHorizonal className="h-4 w-4" />
              Envoyer un message
            </h3>
            <Textarea
              placeholder="Écrire un message au joueur..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={3}
            />
            <Button
              size="sm"
              className="mt-2"
              onClick={handleSendMessage}
              disabled={!messageContent.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Envoyer
            </Button>
          </div>

          <Separator />

          {/* Reset PV */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset PV saison
            </h3>
            <div className="flex items-center gap-2">
              <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Choisir une saison" />
                </SelectTrigger>
                <SelectContent>
                  {(seasons || []).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      Saison {s.season_number} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!selectedSeasonId || resetPv.isPending}>
                    {resetPv.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Reset PV
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset PV pour cette saison ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tous les PV de ce joueur pour la saison sélectionnée seront réinitialisés. Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetPv} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Confirmer le reset
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Separator />

          {/* Reliability Score */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Score de fiabilité
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={newReliabilityScore}
                onChange={(e) => setNewReliabilityScore(e.target.value)}
                className="w-[120px]"
              />
              <span className="text-sm text-muted-foreground">/ 100</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleUpdateReliability}
                disabled={updateReliability.isPending}
              >
                {updateReliability.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Modifier
              </Button>
            </div>
          </div>

          <Separator />

          {/* Ban / Unban */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Bannissement
            </h3>
            {user.is_banned ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={unbanUser.isPending}>
                    {unbanUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Débannir le joueur
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Débannir {user.username} ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le joueur pourra à nouveau accéder à l'application.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnban}>Débannir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={banUser.isPending}>
                    {banUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Bannir le joueur
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Bannir {user.username} ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le joueur sera exclu de l'application. Cette action peut être annulée ultérieurement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBan}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmer le ban
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
