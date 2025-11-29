import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { VideoResource, VideoResourceFormData, GameRule, GameRuleFormData } from '@/types/database';
import { toast } from 'sonner';

// ============ VIDEO RESOURCES ============

export function useVideoResources(gameId: string | undefined) {
  return useQuery({
    queryKey: ['video-resources', gameId],
    queryFn: async (): Promise<VideoResource[]> => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from('video_resources')
        .select('*')
        .eq('game_id', gameId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gameId,
  });
}

export function useCreateVideoResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: VideoResourceFormData }): Promise<VideoResource> => {
      // ID auto-généré par Supabase (uuid)
      const { data: video, error } = await supabase
        .from('video_resources')
        .insert([{ game_id: gameId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return video;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video-resources', data.game_id] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Vidéo ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateVideoResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gameId, data }: { id: string; gameId: string; data: Partial<VideoResourceFormData> }): Promise<VideoResource> => {
      const { data: video, error } = await supabase
        .from('video_resources')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return video;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['video-resources', data.game_id] });
      toast.success('Vidéo mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteVideoResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gameId }: { id: string; gameId: string }): Promise<void> => {
      const { error } = await supabase
        .from('video_resources')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['video-resources', params.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Vidéo supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useReorderVideoResources() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { gameId: string; videos: { id: string; order_index: number }[] }): Promise<void> => {
      for (const v of params.videos) {
        const { error } = await supabase
          .from('video_resources')
          .update({ order_index: v.order_index })
          .eq('id', v.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['video-resources', params.gameId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ GAME RULES (PDF) ============

export function useGameRules(gameId: string | undefined) {
  return useQuery({
    queryKey: ['game-rules', gameId],
    queryFn: async (): Promise<GameRule[]> => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from('game_rules')
        .select('*')
        .eq('game_id', gameId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gameId,
  });
}

export function useCreateGameRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: GameRuleFormData }): Promise<GameRule> => {
      // ID auto-généré par Supabase (uuid)
      const { data: rule, error } = await supabase
        .from('game_rules')
        .insert([{ game_id: gameId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-rules', data.game_id] });
      toast.success('Règle PDF ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateGameRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gameId, data }: { id: string; gameId: string; data: Partial<GameRuleFormData> }): Promise<GameRule> => {
      const { data: rule, error } = await supabase
        .from('game_rules')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return rule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['game-rules', data.game_id] });
      toast.success('Règle PDF mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteGameRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gameId }: { id: string; gameId: string }): Promise<void> => {
      const { error } = await supabase
        .from('game_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['game-rules', params.gameId] });
      toast.success('Règle PDF supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useReorderGameRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { gameId: string; rules: { id: string; order_index: number }[] }): Promise<void> => {
      for (const r of params.rules) {
        const { error } = await supabase
          .from('game_rules')
          .update({ order_index: r.order_index })
          .eq('id', r.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['game-rules', params.gameId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}