import { useState, useRef } from 'react';
import { Image as ImageIcon, Trash2, Copy, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  useGalleryFiles,
  useDeleteGalleryFile,
  useReplaceGalleryFile,
  type GalleryBucket,
  type GalleryFile,
} from '@/hooks/useGallery';

const BUCKETS: { value: GalleryBucket; label: string }[] = [
  { value: 'quiz-images', label: 'Quiz' },
  { value: 'tournament-images', label: 'Tournois' },
];

const MAX_SIZE_KB = 150;

/** Compress an image File to WebP, capped at MAX_SIZE_KB. */
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  // Cap dimensions to 800px
  const MAX_DIM = 800;
  let w = bitmap.width;
  let h = bitmap.height;
  if (w > MAX_DIM || h > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const maxBytes = MAX_SIZE_KB * 1024;

  // Iteratively reduce quality
  let quality = 0.85;
  let blob: Blob | null = null;
  while (quality > 0.05) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
    if (blob && blob.size <= maxBytes) break;
    quality -= 0.05;
  }

  // If still too large, progressively resize
  if (blob && blob.size > maxBytes) {
    let scale = 0.8;
    while (scale >= 0.3 && blob.size > maxBytes) {
      const nw = Math.round(w * scale);
      const nh = Math.round(h * scale);
      const rc = document.createElement('canvas');
      rc.width = nw;
      rc.height = nh;
      rc.getContext('2d')!.drawImage(canvas, 0, 0, nw, nh);
      blob = await new Promise<Blob | null>((r) => rc.toBlob(r, 'image/webp', 0.7));
      scale -= 0.1;
    }
  }

  if (!blob) throw new Error('Compression échouée');

  // Keep the same base name but force .webp extension
  const baseName = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
}

export function GalleryPage() {
  const [bucketIndex, setBucketIndex] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<string>('__all__');
  const [deleteTarget, setDeleteTarget] = useState<{ bucket: GalleryBucket; path: string } | null>(null);

  const current = BUCKETS[bucketIndex];
  const { data: files = [], isLoading } = useGalleryFiles(current.value);
  const deleteMutation = useDeleteGalleryFile();
  const replaceMutation = useReplaceGalleryFile();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceTarget, setReplaceTarget] = useState<{ bucket: GalleryBucket; path: string } | null>(null);

  function copyLink(url: string) {
    // Strip cache-busting param to give a clean permanent URL
    const clean = url.replace(/\?v=\d+$/, '');
    navigator.clipboard.writeText(clean);
    toast.success('Lien copié');
  }

  function openReplace(bucket: GalleryBucket, path: string) {
    setReplaceTarget({ bucket, path });
    // Trigger file input after state update
    setTimeout(() => replaceInputRef.current?.click(), 0);
  }

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0];
    e.target.value = '';
    if (!raw || !replaceTarget) {
      setReplaceTarget(null);
      return;
    }
    try {
      const compressed = await compressImage(raw);
      replaceMutation.mutate({ ...replaceTarget, file: compressed });
    } catch {
      toast.error('Impossible de compresser l\'image');
    }
    setReplaceTarget(null);
  }

  // Folders for sub-tabs
  const folders = [...new Set(files.map((f) => f.folder))].sort();
  const visibleFiles =
    selectedFolder === '__all__'
      ? files
      : files.filter((f) => f.folder === selectedFolder);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ImageIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Galerie</h1>
          <p className="text-sm text-muted-foreground">
            Images stockées dans Supabase Storage
          </p>
        </div>
      </div>

      {/* Bucket selector */}
      <Tabs
        value={String(bucketIndex)}
        onValueChange={(v) => {
          setBucketIndex(Number(v));
          setSelectedFolder('__all__');
        }}
      >
        <TabsList>
          {BUCKETS.map((b, i) => (
            <TabsTrigger key={b.value} value={String(i)}>
              {b.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Folder sub-tabs */}
      {!isLoading && folders.length > 1 && (
        <Tabs value={selectedFolder} onValueChange={setSelectedFolder}>
          <TabsList>
            <TabsTrigger value="__all__">
              Tous ({files.length})
            </TabsTrigger>
            {folders.map((f) => (
              <TabsTrigger key={f || '__root__'} value={f}>
                {f || 'racine'} ({files.filter((fi) => fi.folder === f).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {visibleFiles.length} image{visibleFiles.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : visibleFiles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          Aucune image dans ce bucket
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {visibleFiles.map((file) => (
            <ImageCard
              key={file.path}
              file={file}
              bucket={current.value}
              onCopy={copyLink}
              onDelete={(path) => setDeleteTarget({ bucket: current.value, path })}
              onReplace={(path) => openReplace(current.value, path)}
              isReplacing={replaceMutation.isPending && replaceTarget?.path === file.path}
            />
          ))}
        </div>
      )}

      {/* Hidden file input for replace */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette image ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'image sera définitivement supprimée du storage. Si elle est utilisée quelque part, le lien sera cassé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
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

/* ── Image Card ─────────────────────────────────────────────────── */

function ImageCard({
  file,
  bucket,
  onCopy,
  onDelete,
  onReplace,
  isReplacing,
}: {
  file: GalleryFile;
  bucket: GalleryBucket;
  onCopy: (url: string) => void;
  onDelete: (path: string) => void;
  onReplace: (path: string) => void;
  isReplacing: boolean;
}) {
  return (
    <div className="group relative rounded-lg overflow-hidden border bg-muted/20">
      <div className="aspect-square">
        <img
          src={file.url}
          alt={file.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Replacing overlay */}
      {isReplacing && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
        <div className="flex gap-1.5">
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => onCopy(file.url)}
            title="Copier le lien"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8"
            onClick={() => onReplace(file.path)}
            title="Remplacer (même lien)"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8"
            onClick={() => onDelete(file.path)}
            title="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Footer info */}
      <div className="px-2 py-1.5 border-t bg-card">
        <p className="text-[11px] font-medium truncate" title={file.name}>{file.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(file.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
