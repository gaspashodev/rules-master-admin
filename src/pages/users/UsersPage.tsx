import { useState } from 'react';
import {
  Users, Search, ShieldAlert, Ban, SendHorizonal, RotateCcw, Loader2,
  BadgeCheck, Trophy, Star, BarChart3, ArrowUpDown,
} from 'lucide-react';
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
import {
  useUsers,
  useAdminMessages,
  useSendDirectMessage,
  useUpdateReliabilityScore,
  useBanUser,
  useUnbanUser,
  useToggleCertified,
  useUserContributions,
  useUserAchievements,
  useGrantAchievement,
} from '@/hooks/useUsers';
import { useSeasons } from '@/hooks/useCitiesSeasons';
import { useResetPlayerSeasonPv } from '@/hooks/useCompetitive';
import type { UserProfile, UserSortBy, UserSortDir } from '@/types/users';

function getReliabilityVariant(score: number): 'default' | 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

const SORT_OPTIONS: { value: UserSortBy; label: string }[] = [
  { value: 'date', label: "Date d'inscription" },
  { value: 'fiabilite', label: 'Score de fiabilité' },
  { value: 'contributions', label: 'Points de contribution' },
  { value: 'dons', label: 'Montant donné' },
];

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState<UserSortBy>('date');
  const [sortDir, setSortDir] = useState<UserSortDir>('desc');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const { data: users, isLoading, isFetching } = useUsers({ search: debouncedSearch, sortBy, sortDir });

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  const isSearching = debouncedSearch.length >= 2;
  const showResults = isSearching || debouncedSearch.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Users className="h-7 w-7" />
          Gestion des joueurs
        </h1>
        <p className="text-muted-foreground">Top 20 joueurs · Recherchez par pseudo pour cibler un joueur</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par pseudo..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            {!isSearching && (
              <>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as UserSortBy)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  title={sortDir === 'desc' ? 'Décroissant → cliquer pour croissant' : 'Croissant → cliquer pour décroissant'}
                  onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                >
                  <ArrowUpDown className={`h-4 w-4 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
                </Button>
              </>
            )}
          </div>
          {search.length > 0 && search.length < 2 && (
            <p className="text-xs text-muted-foreground mt-2">Tapez au moins 2 caractères pour lancer la recherche</p>
          )}
        </CardContent>
      </Card>

      {showResults && (
        <div className="space-y-2">
          {isLoading || isFetching ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14" />)
          ) : !users?.length ? (
            <p className="text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {isSearching
                  ? `${users.length} résultat${users.length > 1 ? 's' : ''}`
                  : `Top ${users.length} · ${SORT_OPTIONS.find(o => o.value === sortBy)?.label}`}
              </p>
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedUser(user)}
                >
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username || ''}
                      className="h-9 w-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-medium text-muted-foreground">
                      {(user.username?.[0] ?? '?').toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{user.username || 'Sans pseudo'}</p>
                      {user.role && <Badge variant="outline">{user.role}</Badge>}
                      {user.reliability_score != null && (
                        <Badge variant={getReliabilityVariant(user.reliability_score)}>
                          Fiabilité: {user.reliability_score}
                        </Badge>
                      )}
                      {user.score != null && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />
                          {user.score} pts
                        </Badge>
                      )}
                      {user.donations_pts != null && user.score == null && (
                        <Badge variant="secondary" className="gap-1">
                          <Trophy className="h-3 w-3" />
                          {user.donations_pts} pts dons
                        </Badge>
                      )}
                      {user.is_certified && (
                        <Badge variant="default" className="gap-1 bg-blue-500">
                          <BadgeCheck className="h-3 w-3" />
                          Certifié
                        </Badge>
                      )}
                      {user.is_banned && (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" />
                          Banni
                        </Badge>
                      )}
                    </div>
                    {user.created_at && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Inscrit le {new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
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
  const { data: seasons } = useSeasons();
  const { data: adminMessages } = useAdminMessages(user.id);
  const { data: contributions } = useUserContributions(user.id);
  const { data: achievements = [] } = useUserAchievements(user.id);

  const sendMessage = useSendDirectMessage();
  const updateReliability = useUpdateReliabilityScore();
  const toggleCertified = useToggleCertified();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const resetPv = useResetPlayerSeasonPv();
  const grantAchievement = useGrantAchievement();

  const [messageContent, setMessageContent] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [newReliabilityScore, setNewReliabilityScore] = useState(String(user.reliability_score));
  const [reliabilityReason, setReliabilityReason] = useState('');
  const [banMessage, setBanMessage] = useState('');
  const [unbanMessage, setUnbanMessage] = useState('');
  const [resetPvMessage, setResetPvMessage] = useState('');

  const hasPionnier = achievements.some(a => a.achievement_type === 'pionnier' && a.tier === 1);

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessage.mutate(
      { recipientId: user.id, content: messageContent.trim() },
      { onSuccess: () => setMessageContent('') }
    );
  };

  const handleResetPv = () => {
    if (!selectedSeasonId || !resetPvMessage.trim()) return;
    resetPv.mutate(
      { userId: user.id, seasonId: selectedSeasonId, message: resetPvMessage.trim() },
      { onSuccess: () => setResetPvMessage('') }
    );
  };

  const handleUpdateReliability = () => {
    const score = parseInt(newReliabilityScore, 10);
    if (isNaN(score)) return;
    updateReliability.mutate(
      { userId: user.id, newScore: score, message: reliabilityReason },
      {
        onSuccess: () => {
          onUserUpdated({ ...user, reliability_score: Math.max(0, Math.min(100, score)) });
          setReliabilityReason('');
        },
      }
    );
  };

  const handleBan = () => {
    banUser.mutate(
      { userId: user.id, message: banMessage },
      {
        onSuccess: () => {
          onUserUpdated({ ...user, is_banned: true });
          setBanMessage('');
        },
      }
    );
  };

  const handleUnban = () => {
    unbanUser.mutate(
      { userId: user.id, message: unbanMessage },
      {
        onSuccess: () => {
          onUserUpdated({ ...user, is_banned: false });
          setUnbanMessage('');
        },
      }
    );
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
              <Label className="text-muted-foreground">Certification</Label>
              <p className="font-medium">
                {user.is_certified ? (
                  <Badge variant="default" className="gap-1 bg-blue-500">
                    <BadgeCheck className="h-3 w-3" /> Certifié
                  </Badge>
                ) : (
                  <Badge variant="outline">Non certifié</Badge>
                )}
              </p>
            </div>
            <div className="col-span-2">
              <Label className="text-muted-foreground">ID</Label>
              <p className="font-mono text-xs text-muted-foreground break-all">{user.id}</p>
            </div>
          </div>

          <Separator />

          {/* Contributions */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Contributions
            </h3>
            {contributions ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Événements organisés</span>
                  <span className="font-medium">{contributions.events_organized}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Événements participés</span>
                  <span className="font-medium">{contributions.events_participated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quiz créés</span>
                  <span className="font-medium">{contributions.quizzes_created}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matchs joués</span>
                  <span className="font-medium">{contributions.matches_played}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sondages répondus</span>
                  <span className="font-medium">{contributions.polls_answered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connexions mensuelles</span>
                  <span className="font-medium">{contributions.monthly_logins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points dons</span>
                  <span className="font-medium">{contributions.donations_pts}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    Score total
                  </span>
                  <span>{contributions.score}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune contribution enregistrée.</p>
            )}
          </div>

          <Separator />

          {/* Achievements */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Succès
            </h3>
            <div className="flex items-center gap-3">
              {hasPionnier ? (
                <Badge variant="default" className="gap-1 bg-yellow-500 text-white">
                  <Trophy className="h-3 w-3" />
                  Badge Pionnier (Tier 1) — attribué
                </Badge>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={grantAchievement.isPending}>
                      {grantAchievement.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      <Trophy className="h-4 w-4 mr-2" />
                      Attribuer badge Pionnier
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Attribuer le badge Pionnier ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le badge secret <strong>Pionnier (Tier Or)</strong> sera attribué à <strong>{user.username}</strong>.
                        Il apparaîtra automatiquement sur son profil.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => grantAchievement.mutate({ userId: user.id, achievementType: 'pionnier', tier: 1 })}
                      >
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {achievements.length > 0 && (
                <span className="text-xs text-muted-foreground">{achievements.length} succès au total</span>
              )}
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

            {adminMessages && adminMessages.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Messages envoyés ({adminMessages.length})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {adminMessages.map(msg => (
                    <div key={msg.id} className="text-sm p-2 rounded bg-muted">
                      <p>{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <Textarea
                    placeholder="Raison du reset (envoyée au joueur)..."
                    value={resetPvMessage}
                    onChange={(e) => setResetPvMessage(e.target.value)}
                    rows={2}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetPv}
                      disabled={!resetPvMessage.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
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
              <Badge variant={getReliabilityVariant(user.reliability_score)}>
                Actuel : {user.reliability_score} / 100
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    {updateReliability.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Modifier
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Modifier le score de fiabilité</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le nouveau score et la raison seront envoyés au joueur.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3">
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
                    </div>
                    <Textarea
                      placeholder="Raison de la modification (obligatoire)..."
                      value={reliabilityReason}
                      onChange={(e) => setReliabilityReason(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleUpdateReliability}
                      disabled={!reliabilityReason.trim() || updateReliability.isPending}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Separator />

          {/* Certification */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <BadgeCheck className="h-4 w-4" />
              Certification
            </h3>
            <div className="flex items-center gap-3">
              <Badge variant={user.is_certified ? 'default' : 'outline'} className={user.is_certified ? 'bg-blue-500' : ''}>
                {user.is_certified ? 'Certifié' : 'Non certifié'}
              </Badge>
              <Button
                size="sm"
                variant={user.is_certified ? 'outline' : 'default'}
                className={!user.is_certified ? 'bg-blue-500 hover:bg-blue-600' : ''}
                disabled={toggleCertified.isPending}
                onClick={() => {
                  const newValue = !user.is_certified;
                  toggleCertified.mutate(
                    { userId: user.id, certified: newValue },
                    { onSuccess: () => onUserUpdated({ ...user, is_certified: newValue }) }
                  );
                }}
              >
                {toggleCertified.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {user.is_certified ? 'Retirer la certification' : 'Certifier le joueur'}
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
                  <Textarea
                    placeholder="Raison du débannissement (obligatoire)..."
                    value={unbanMessage}
                    onChange={(e) => setUnbanMessage(e.target.value)}
                    rows={2}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnban} disabled={!unbanMessage.trim()}>Débannir</AlertDialogAction>
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
                  <Textarea
                    placeholder="Raison du bannissement (obligatoire)..."
                    value={banMessage}
                    onChange={(e) => setBanMessage(e.target.value)}
                    rows={2}
                  />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBan}
                      disabled={!banMessage.trim()}
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
