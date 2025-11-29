import { useRef, useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useStorage, getPathFromUrl } from '@/hooks/useStorage';
import { Upload, X, Image as ImageIcon, Loader2, Link, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type BucketName = 'game-covers' | 'lesson-images' | 'quiz-images';

// Dimensions cibles par bucket
const RESIZE_CONFIG: Record<BucketName, { width: number; height: number }> = {
  'game-covers': { width: 800, height: 450 }, // 16:9
  'lesson-images': { width: 1200, height: 675 }, // 16:9
  'quiz-images': { width: 800, height: 450 }, // 16:9
};

interface ImageUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: BucketName;
  folder?: string;
  label?: string;
  aspectRatio?: 'video' | 'square' | 'portrait';
  className?: string;
  showUrlInput?: boolean;
}

/**
 * Crée l'image recadrée à partir des paramètres de crop
 */
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth: number,
  targetHeight: number
): Promise<File> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve) => (image.onload = resolve));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Impossible de créer le contexte canvas');
  }

  // Dessiner la partie recadrée de l'image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Échec de la conversion'));
          return;
        }
        const file = new File([blob], 'cropped.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        resolve(file);
      },
      'image/jpeg',
      0.9
    );
  });
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  folder,
  label = 'Image',
  aspectRatio = 'video',
  className,
  showUrlInput = true,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, remove, isUploading, progress } = useStorage();
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  
  // États pour le cropping
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  };

  const aspectRatioValue = {
    video: 16 / 9,
    square: 1,
    portrait: 3 / 4,
  };

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (file: File) => {
    // Créer une URL pour l'image et ouvrir l'éditeur de crop
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleCropConfirm = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const config = RESIZE_CONFIG[bucket];
      const croppedFile = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        config.width,
        config.height
      );

      const result = await upload(croppedFile, bucket, folder);
      if (result) {
        onChange(result.url);
      }
    } catch (error) {
      console.error('Erreur lors du recadrage:', error);
    } finally {
      setIsProcessing(false);
      setImageToCrop(null);
      URL.revokeObjectURL(imageToCrop);
    }
  };

  const handleCropCancel = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input pour permettre de re-sélectionner le même fichier
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleRemove = async () => {
    if (value) {
      const path = getPathFromUrl(value, bucket);
      if (path) {
        await remove(path, bucket);
      }
      onChange(null);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setMode('upload');
    }
  };

  // Affichage de l'éditeur de crop
  if (imageToCrop) {
    return (
      <div className={cn('space-y-4', className)}>
        <Label>{label} - Recadrage</Label>
        
        <div className="relative h-64 bg-black rounded-lg overflow-hidden">
          <Cropper
            image={imageToCrop}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatioValue[aspectRatio]}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Zoom</Label>
          <Slider
            value={[zoom]}
            onValueChange={(values: number[]) => setZoom(values[0])}
            min={1}
            max={3}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCropCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleCropConfirm}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Valider
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label>{label}</Label>

      {value ? (
        // Preview with remove button
        <div className={cn('relative rounded-lg overflow-hidden bg-muted', aspectClasses[aspectRatio])}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Changer
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        // Upload zone
        <div className="space-y-3">
          {showUrlInput && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('upload')}
              >
                <Upload className="h-4 w-4 mr-1" />
                Upload
              </Button>
              <Button
                type="button"
                variant={mode === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('url')}
              >
                <Link className="h-4 w-4 mr-1" />
                URL
              </Button>
            </div>
          )}

          {mode === 'upload' ? (
            <div
              className={cn(
                'relative rounded-lg border-2 border-dashed transition-colors',
                aspectClasses[aspectRatio],
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                isUploading && 'pointer-events-none'
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && inputRef.current?.click()}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                {isUploading ? (
                  <>
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">Upload en cours... {progress}%</p>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground text-center px-4">
                      Glissez une image ici ou <span className="text-primary">parcourir</span>
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      JPG, PNG, WebP • Max 2 Mo
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://exemple.com/image.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleUrlSubmit())}
              />
              <Button type="button" onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                OK
              </Button>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}