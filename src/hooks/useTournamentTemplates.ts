import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { TournamentTemplate, TournamentTemplatesFilters, TournamentGame, TournamentSize, TournamentStatus } from '@/types/tournament-templates';

/** Compress an image to WebP, capped at maxSizeKB. */
async function compressToWebP(file: File, maxSizeKB: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

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
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);

  const maxBytes = maxSizeKB * 1024;
  let quality = 0.85;
  let blob: Blob | null = null;

  while (quality > 0.05) {
    blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
    if (blob && blob.size <= maxBytes) break;
    quality -= 0.05;
  }

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
  return blob;
}

export async function uploadTournamentImage(file: File, folder: string, maxSizeKB: number): Promise<string> {
  const blob = await compressToWebP(file, maxSizeKB);
  const path = `${folder}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from('tournament-images')
    .upload(path, blob, { contentType: 'image/webp', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('tournament-images').getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteTournamentImage(url: string): Promise<void> {
  // Extract path from public URL
  const marker = '/tournament-images/';
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.substring(idx + marker.length);
  await supabase.storage.from('tournament-images').remove([path]);
}

export function useTournamentTemplates(filters?: TournamentTemplatesFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const search = filters?.search || '';

  return useQuery({
    queryKey: ['tournament-templates', 'list', { page, pageSize, search }],
    queryFn: async (): Promise<{ data: TournamentTemplate[]; count: number }> => {
      let query = supabase
        .from('tournament_templates')
        .select('*', { count: 'exact' });

      // Only show back-office templates (created_by is null)
      query = query.is('created_by', null);

      if (search && search.length >= 2) {
        query = query.or(`share_code.ilike.%${search}%,custom_title.ilike.%${search}%`);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data as unknown as TournamentTemplate[]) || [], count: count || 0 };
    },
  });
}

export function useTournamentTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['tournament-templates', 'detail', id],
    queryFn: async (): Promise<TournamentTemplate | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('tournament_templates')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as TournamentTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateTournamentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: {
      share_code: string;
      size: TournamentSize;
      all_games: TournamentGame[];
      status: TournamentStatus;
      is_featured?: boolean;
      custom_title?: string | null;
      custom_image_url?: string | null;
      custom_share_image_url?: string | null;
      description?: string | null;
      expires_at?: string | null;
    }): Promise<void> => {
      const { error } = await supabase
        .from('tournament_templates')
        .insert({
          share_code: template.share_code,
          size: template.size,
          all_games: template.all_games as unknown as Record<string, unknown>[],
          status: template.status,
          created_by: null,
          is_featured: template.is_featured ?? false,
          custom_title: template.custom_title || null,
          custom_image_url: template.custom_image_url || null,
          custom_share_image_url: template.custom_share_image_url || null,
          description: template.description || null,
          expires_at: template.expires_at || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-templates'] });
      toast.success('Tournoi créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateTournamentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string;
      share_code?: string;
      size?: TournamentSize;
      all_games?: TournamentGame[];
      status?: TournamentStatus;
      is_featured?: boolean;
      custom_title?: string | null;
      custom_image_url?: string | null;
      custom_share_image_url?: string | null;
      description?: string | null;
      expires_at?: string | null;
    }): Promise<void> => {
      const updateData: Record<string, unknown> = {};
      if (data.share_code !== undefined) updateData.share_code = data.share_code;
      if (data.size !== undefined) updateData.size = data.size;
      if (data.all_games !== undefined) updateData.all_games = data.all_games;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.is_featured !== undefined) updateData.is_featured = data.is_featured;
      if (data.custom_title !== undefined) updateData.custom_title = data.custom_title || null;
      if (data.custom_image_url !== undefined) updateData.custom_image_url = data.custom_image_url || null;
      if (data.custom_share_image_url !== undefined) updateData.custom_share_image_url = data.custom_share_image_url || null;
      if (data.description !== undefined) updateData.description = data.description || null;
      if (data.expires_at !== undefined) updateData.expires_at = data.expires_at || null;

      const { error } = await supabase
        .from('tournament_templates')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-templates'] });
      toast.success('Tournoi mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleStatusTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TournamentStatus }): Promise<void> => {
      const { error } = await supabase
        .from('tournament_templates')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleFeaturedTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('tournament_templates')
        .update({ is_featured })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-templates'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteTournamentTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('tournament_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament-templates'] });
      toast.success('Tournoi supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
