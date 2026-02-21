import { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, X, Crop, Image as ImageIcon, Loader2, Clipboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  maxSizeKB?: number;
  aspectRatio?: number;
  className?: string;
}

// Helper to create image from source
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

// Get cropped image as blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxSizeKB: number = 50
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  // Set canvas size to crop area
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Cap dimensions to 800px max before compression
  const MAX_DIM = 800;
  if (canvas.width > MAX_DIM || canvas.height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / canvas.width, MAX_DIM / canvas.height);
    const newW = Math.round(canvas.width * ratio);
    const newH = Math.round(canvas.height * ratio);
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = newW;
    tmpCanvas.height = newH;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (tmpCtx) {
      tmpCtx.drawImage(canvas, 0, 0, newW, newH);
      canvas.width = newW;
      canvas.height = newH;
      ctx.drawImage(tmpCanvas, 0, 0);
    }
  }

  // Compress iteratively until under max size
  let quality = 0.85;
  let blob: Blob | null = null;
  const maxBytes = maxSizeKB * 1024;

  while (quality > 0.05) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
    });

    if (blob && blob.size <= maxBytes) {
      break;
    }

    quality -= 0.05;
  }

  // If still too large, progressively resize
  if (blob && blob.size > maxBytes) {
    let scale = 0.8;
    while (scale >= 0.3 && blob && blob.size > maxBytes) {
      const newWidth = Math.round(canvas.width * scale);
      const newHeight = Math.round(canvas.height * scale);

      const resizedCanvas = document.createElement('canvas');
      resizedCanvas.width = newWidth;
      resizedCanvas.height = newHeight;
      const resizedCtx = resizedCanvas.getContext('2d');

      if (resizedCtx) {
        resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        blob = await new Promise<Blob | null>((resolve) => {
          resizedCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7);
        });
      }
      scale -= 0.1;
    }
  }

  if (!blob) {
    throw new Error('Failed to create blob');
  }

  return blob;
}

export function ImageUploader({
  value,
  onChange,
  bucket = 'quiz-images',
  folder = 'jeu',
  maxSizeKB = 50,
  aspectRatio,
  className,
}: ImageUploaderProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setIsDialogOpen(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFileSelect]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle crop complete
  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Upload cropped image
  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);

    try {
      // Get cropped and compressed blob
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, maxSizeKB);

      // Generate unique filename
      const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);

      onChange(urlData.publicUrl);
      setIsDialogOpen(false);
      setImageSrc(null);
      toast.success('Image uploadée');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove current image
  const handleRemove = () => {
    onChange('');
  };

  // Close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setImageSrc(null);
  };

  return (
    <>
      <div className={cn('space-y-2', className)}>
        {value ? (
          // Show current image
          <div className="relative inline-block">
            <img
              src={value}
              alt="Uploaded"
              className="w-32 h-32 object-cover rounded-lg border"
            />
            <div className="absolute -top-2 -right-2 flex gap-1">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-6 w-6"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          // Upload zone
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
          >
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="flex gap-2">
                <Upload className="h-8 w-8" />
                <Clipboard className="h-8 w-8" />
              </div>
              <div>
                <p className="font-medium">Cliquer, glisser ou coller</p>
                <p className="text-xs">
                  L'image sera compressée à {maxSizeKB}Ko max
                </p>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />

        {/* Quick actions when image exists */}
        {value && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Changer
            </Button>
          </div>
        )}
      </div>

      {/* Crop Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="h-5 w-5" />
              Recadrer l'image
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Crop area */}
            <div className="relative w-full h-80 bg-black rounded-lg overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              )}
            </div>

            {/* Zoom slider */}
            <div className="space-y-2">
              <Label>Zoom</Label>
              <Slider
                value={[zoom]}
                onValueChange={([value]) => setZoom(value)}
                min={1}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              Déplacez et zoomez pour sélectionner la zone à conserver.
              L'image sera compressée à moins de {maxSizeKB}Ko.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Annuler
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Valider et uploader
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
