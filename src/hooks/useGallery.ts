import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type GalleryBucket = 'quiz-images' | 'tournament-images';

export interface GalleryFile {
  name: string;
  folder: string;
  path: string;
  url: string;
  created_at: string;
}

const QUERY_KEY = ['gallery'];

/**
 * List all files in a bucket, recursively exploring subfolders.
 */
async function listAllFiles(bucket: GalleryBucket): Promise<GalleryFile[]> {
  const allFiles: GalleryFile[] = [];
  const cacheBust = Date.now();

  async function listFolder(folder: string) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw error;
    if (!data) return;

    for (const item of data) {
      if (item.id) {
        // It's a file
        const path = folder ? `${folder}/${item.name}` : item.name;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
        allFiles.push({
          name: item.name,
          folder,
          path,
          url: `${urlData.publicUrl}?v=${cacheBust}`,
          created_at: item.created_at,
        });
      } else {
        // It's a subfolder — recurse
        const subFolder = folder ? `${folder}/${item.name}` : item.name;
        await listFolder(subFolder);
      }
    }
  }

  await listFolder('');

  // Sort all files by date desc
  allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return allFiles;
}

export function useGalleryFiles(bucket: GalleryBucket, folder?: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, bucket, folder ?? '__all__'],
    queryFn: async (): Promise<GalleryFile[]> => {
      // If a specific folder is requested (e.g. for GalleryPicker), list just that folder
      if (folder !== undefined) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .list(folder, { limit: 500, sortBy: { column: 'created_at', order: 'desc' } });

        if (error) throw error;
        const cacheBust = Date.now();

        return (data || [])
          .filter((f) => f.id)
          .map((f) => {
            const path = folder ? `${folder}/${f.name}` : f.name;
            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
            return {
              name: f.name,
              folder,
              path,
              url: `${urlData.publicUrl}?v=${cacheBust}`,
              created_at: f.created_at,
            };
          });
      }

      // No folder specified — list ALL files recursively
      return listAllFiles(bucket);
    },
  });
}

export function useDeleteGalleryFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bucket, path }: { bucket: GalleryBucket; path: string }): Promise<void> => {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Image supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useReplaceGalleryFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bucket, path, file }: { bucket: GalleryBucket; path: string; file: File }): Promise<void> => {
      const { error } = await supabase.storage
        .from(bucket)
        .update(path, file, {
          contentType: file.type || 'image/webp',
          upsert: true,
          cacheControl: '0',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Image remplacée (même lien conservé)');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
