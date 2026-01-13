import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type BucketName = 'game-covers' | 'lesson-images' | 'quiz-images';

interface UploadResult {
  url: string;
  path: string;
}

interface UseStorageReturn {
  upload: (file: File, bucket: BucketName, folder?: string, filePrefix?: string) => Promise<UploadResult | null>;
  remove: (path: string, bucket: BucketName) => Promise<boolean>;
  isUploading: boolean;
  progress: number;
}

export function useStorage(): UseStorageReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (
    file: File,
    bucket: BucketName,
    folder?: string,
    filePrefix?: string
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Validate file type (matching Supabase bucket config)
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Format non supporté. Utilisez JPG, PNG ou WebP.');
        return null;
      }

      // Validate file size (max 2MB - matching Supabase bucket config)
      const maxSize = 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Fichier trop volumineux. Maximum 2 Mo.');
        return null;
      }

      // Generate unique filename with optional prefix
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Slugify le préfixe pour éviter les caractères spéciaux
      const slugifiedPrefix = filePrefix 
        ? filePrefix
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Enlever accents
            .replace(/[^a-z0-9]+/g, '-')     // Remplacer caractères spéciaux par -
            .replace(/^-|-$/g, '')            // Enlever - au début/fin
        : null;
      
      const filename = slugifiedPrefix
        ? `${slugifiedPrefix}-${timestamp}-${randomStr}.${extension}`
        : `${timestamp}-${randomStr}.${extension}`;
      const path = folder ? `${folder}/${filename}` : filename;

      setProgress(30);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Erreur d'upload: ${error.message}`);
        return null;
      }

      setProgress(80);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setProgress(100);
      toast.success('Image uploadée avec succès');

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const remove = async (path: string, bucket: BucketName): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
        toast.error(`Erreur de suppression: ${error.message}`);
        return false;
      }

      toast.success('Image supprimée');
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  return {
    upload,
    remove,
    isUploading,
    progress,
  };
}

// Helper to extract path from Supabase URL
export function getPathFromUrl(url: string, bucket: BucketName): string | null {
  try {
    const bucketPath = `/storage/v1/object/public/${bucket}/`;
    const index = url.indexOf(bucketPath);
    if (index === -1) return null;
    return url.substring(index + bucketPath.length);
  } catch {
    return null;
  }
}