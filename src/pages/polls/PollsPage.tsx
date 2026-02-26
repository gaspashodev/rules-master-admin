import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Vote, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Search, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import {
  usePolls,
  useCreatePoll,
  useUpdatePoll,
  useDeletePoll,
  useTogglePollActive,
} from '@/hooks/usePolls';
import type { Poll, PollFormData, PollOptionFormData } from '@/types/polls';

function toLocalDatetimeString(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

const EMPTY_OPTION: PollOptionFormData = { label: '', is_free_text: false };

function getDefaultForm(): PollFormData {
  return {
    question: '',
    is_active: false,
    ends_at: '',
    options: [
      { label: '', is_free_text: false },
      { label: '', is_free_text: false },
    ],
  };
}

/* ── Form Dialog ──────────────────────────────────────────────── */

function PollFormDialog({
  open,
  onOpenChange,
  poll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poll?: Poll;
}) {
  const create = useCreatePoll();
  const update = useUpdatePoll();

  const [form, setForm] = useState<PollFormData>(() => {
    if (poll) {
      return {
        question: poll.question,
        is_active: poll.is_active,
        ends_at: toLocalDatetimeString(poll.ends_at),
        options: poll.options.map((o) => ({ label: o.label, is_free_text: o.is_free_text })),
      };
    }
    return getDefaultForm();
  });

  function setField<K extends keyof PollFormData>(key: K, value: PollFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setOption(index: number, field: keyof PollOptionFormData, value: any) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? { ...o, [field]: value } : o)),
    }));
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm((prev) => ({ ...prev, options: [...prev.options, { ...EMPTY_OPTION }] }));
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;
    setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate
    const validOptions = form.options.filter((o) => o.label.trim() || o.is_free_text);
    if (validOptions.length < 2) return;

    const data = {
      ...form,
      options: validOptions.map((o) => ({
        label: o.is_free_text ? (o.label.trim() || 'Autre (champ libre)') : o.label.trim(),
        is_free_text: o.is_free_text,
      })),
    };

    if (poll) {
      await update.mutateAsync({ id: poll.id, data });
    } else {
      await create.mutateAsync(data);
    }
    onOpenChange(false);
  }

  const isPending = create.isPending || update.isPending;
  const hasFreeText = form.options.some((o) => o.is_free_text);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{poll ? 'Modifier le sondage' : 'Nouveau sondage'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question */}
          <div className="space-y-2">
            <Label>Question *</Label>
            <Input
              value={form.question}
              onChange={(e) => setField('question', e.target.value)}
              placeholder="Ex: Quel type d'événement préférez-vous ?"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options ({form.options.length}/6)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={form.options.length >= 6}
              >
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground w-4 flex-shrink-0">{i + 1}.</span>

                  <Input
                    value={opt.label}
                    onChange={(e) => setOption(i, 'label', e.target.value)}
                    placeholder={opt.is_free_text ? 'Autre (champ libre)' : `Option ${i + 1}`}
                    className={cn('flex-1', opt.is_free_text && 'border-dashed')}
                  />

                  {/* Toggle free text (only one allowed) */}
                  {(!hasFreeText || opt.is_free_text) && (
                    <Button
                      type="button"
                      variant={opt.is_free_text ? 'default' : 'ghost'}
                      size="sm"
                      className="text-xs flex-shrink-0"
                      onClick={() => setOption(i, 'is_free_text', !opt.is_free_text)}
                      title="Champ libre"
                    >
                      Libre
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => removeOption(i)}
                    disabled={form.options.length <= 2}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* End date */}
          <div className="space-y-2">
            <Label>Date de fin (optionnel)</Label>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setField('ends_at', e.target.value)}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active}
              onCheckedChange={(v) => setField('is_active', v)}
            />
            <Label>Actif immédiatement</Label>
          </div>

          <Button type="submit" className="w-full" disabled={isPending || !form.question.trim()}>
            {isPending ? 'Enregistrement...' : poll ? 'Mettre à jour' : 'Créer le sondage'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */

export function PollsPage() {
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPoll, setEditPoll] = useState<Poll | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: polls = [], isLoading } = usePolls({
    search: search.length >= 2 ? search : undefined,
    is_active: showActiveOnly ? true : 'all',
  });

  const deleteMutation = useDeletePoll();
  const toggleActive = useTogglePollActive();

  function openCreate() {
    setEditPoll(undefined);
    setDialogOpen(true);
  }

  function openEdit(poll: Poll) {
    setEditPoll(poll);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Vote className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sondages</h1>
            <p className="text-sm text-muted-foreground">
              {polls.length} sondage{polls.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau sondage
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} />
          <span className="text-sm text-muted-foreground">Actifs uniquement</span>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun sondage trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              onEdit={() => openEdit(poll)}
              onDelete={() => setDeleteId(poll.id)}
              onToggle={() => toggleActive.mutate({ id: poll.id, is_active: !poll.is_active })}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <PollFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          poll={editPoll}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce sondage ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les votes associés seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Poll Card ────────────────────────────────────────────────── */

function PollCard({
  poll,
  onEdit,
  onDelete,
  onToggle,
}: {
  poll: Poll;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.vote_count, 0);
  const isExpired = poll.ends_at && new Date(poll.ends_at) < new Date();

  return (
    <div className="rounded-lg border p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{poll.question}</h3>
            {poll.is_active && !isExpired ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Actif</Badge>
            ) : isExpired ? (
              <Badge variant="secondary">Expiré</Badge>
            ) : (
              <Badge variant="outline">Inactif</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
            {poll.ends_at && (
              <> · Fin : {new Date(poll.ends_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onToggle} title={poll.is_active ? 'Désactiver' : 'Activer'}>
            {poll.is_active ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Options with vote bars */}
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          return (
            <div key={opt.id} className="flex items-center gap-3">
              <div className="flex-1 relative h-7 rounded-md bg-muted/50 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-primary/15 rounded-md transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between h-full px-2.5">
                  <span className="text-xs font-medium text-foreground">
                    {opt.is_free_text ? '💬 ' : ''}{opt.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{opt.vote_count}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
