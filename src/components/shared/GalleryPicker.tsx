import { Image as ImageIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGalleryFiles, type GalleryBucket } from '@/hooks/useGallery';

interface GalleryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  bucket: GalleryBucket;
  folder?: string;
}

export function GalleryPicker({ open, onOpenChange, onSelect, bucket, folder }: GalleryPickerProps) {
  const { data: files = [], isLoading } = useGalleryFiles(bucket, folder);

  function handleSelect(url: string) {
    onSelect(url);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Sélectionner une image
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-muted/20 animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Aucune image disponible
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {files.map((file) => (
              <button
                key={file.path}
                type="button"
                className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors cursor-pointer"
                onClick={() => handleSelect(file.url)}
              >
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
