import { useState, useRef } from 'react';
import { Megaphone, Trash2, Loader2, Bell, BellOff, ExternalLink, Trophy, Bold, Italic, Underline } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
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
import { ImageUploader } from '@/components/bgg-quiz/ImageUploader';
import { useBroadcasts, useCreateBroadcast, useDeleteBroadcast } from '@/hooks/useBroadcast';
import type { BroadcastFormData } from '@/types/broadcast';

function getDefaultForm(): BroadcastFormData {
  return { content: '', image_url: '', link: '', send_push: false, type: 'annonce' };
}

function applyFormat(
  textarea: HTMLTextAreaElement | null,
  marker: string,
  content: string,
  setContent: (v: string) => void,
) {
  if (!textarea) return;
  const { selectionStart: start, selectionEnd: end } = textarea;
  const selected = content.slice(start, end);
  const formatted = `${marker}${selected || 'texte'}${marker}`;
  const newValue = content.slice(0, start) + formatted + content.slice(end);
  setContent(newValue);
  requestAnimationFrame(() => {
    textarea.focus();
    const cursorStart = selected ? start : start + marker.length;
    const cursorEnd = selected ? start + formatted.length : start + marker.length + 5;
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

export function BroadcastPage() {
  const [form, setForm] = useState<BroadcastFormData>(getDefaultForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const fmt = (marker: string) =>
    applyFormat(contentRef.current, marker, form.content, (v) => setForm((f) => ({ ...f, content: v })));

  const { data: broadcasts = [], isLoading } = useBroadcasts();
  const create = useCreateBroadcast();
  const deleteMutation = useDeleteBroadcast();

  function handleSend() {
    if (!form.content.trim()) return;
    create.mutate(form, {
      onSuccess: () => setForm(getDefaultForm()),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Diffusion</h1>
          <p className="text-sm text-muted-foreground">
            Envoyer un message visible par tous les joueurs
          </p>
        </div>
      </div>

      {/* Compose */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Type de message</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v as 'annonce' | 'concours' }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="annonce">
                  <span className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    Annonce
                  </span>
                </SelectItem>
                <SelectItem value="concours">
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    Concours
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label>Message *</Label>
            <div className="flex items-center gap-1 p-1 rounded-md border bg-muted/30 w-fit">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Gras (**texte**)" onClick={() => fmt('**')}>
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Italique (*texte*)" onClick={() => fmt('*')}>
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Souligné (__texte__)" onClick={() => fmt('__')}>
                <Underline className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Textarea
              ref={contentRef}
              placeholder="Écrivez votre message ici..."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Syntaxe : <code>**gras**</code> · <code>*italique*</code> · <code>__souligné__</code></p>
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label>Image (optionnel)</Label>
            <ImageUploader
              value={form.image_url || undefined}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
              bucket="broadcast-images"
              folder="broadcast"
              maxSizeKB={150}
            />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <Label>Lien (optionnel)</Label>
            <Input
              placeholder="https://... ou /page-interne"
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
            />
          </div>

          {/* Push notification toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Switch
              checked={form.send_push}
              onCheckedChange={(v) => setForm((f) => ({ ...f, send_push: v }))}
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Notification push mobile</p>
              <p className="text-xs text-muted-foreground">
                Envoyer aussi une notification push sur les appareils mobiles
              </p>
            </div>
            {form.send_push ? (
              <Bell className="h-4 w-4 text-primary" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Send button */}
          <div className="flex justify-end">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!form.content.trim() || create.isPending}>
                  {create.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Megaphone className="h-4 w-4 mr-2" />
                  Envoyer à tous les joueurs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la diffusion</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ce message de type <strong>{form.type === 'concours' ? 'Concours' : 'Annonce'}</strong> sera visible par tous les joueurs.
                    {form.send_push && ' Une notification push sera également envoyée sur mobile.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="rounded-md border p-3 bg-muted/50 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{form.content}</p>
                  {form.image_url && (
                    <img src={form.image_url} alt="" className="w-full max-h-40 object-cover rounded" />
                  )}
                  {form.link && (
                    <p className="text-xs text-primary flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {form.link}
                    </p>
                  )}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSend}>
                    Confirmer l'envoi
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Historique ({broadcasts.length})
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 rounded-lg border bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucun message diffusé
          </div>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((msg) => (
              <div key={msg.id} className="rounded-lg border p-4 flex items-start gap-4">
                <Megaphone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.image_url && (
                    <img src={msg.image_url} alt="" className="w-40 h-24 object-cover rounded border" />
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={msg.type === 'concours' ? 'default' : 'secondary'}
                      className="gap-1 text-xs"
                    >
                      {msg.type === 'concours' ? (
                        <><Trophy className="h-3 w-3" />Concours</>
                      ) : (
                        <><Megaphone className="h-3 w-3" />Annonce</>
                      )}
                    </Badge>
                    {msg.link && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" />
                        {msg.link}
                      </Badge>
                    )}
                    {msg.send_push && (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Bell className="h-3 w-3" />
                        Push envoyé
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => setDeleteId(msg.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le message ne sera plus visible par les joueurs.
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
