import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Game, GameWithStats, GameFormData } from '@/types/database';
import { toast } from 'sonner';

export function useGames() {
  return useQuery({
    queryKey: ['games'],
    queryFn: async (): Promise<GameWithStats[]> => {
      const { data, error } = await supabase
        .from('games_with_stats')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useGame(id: string | undefined) {
  return useQuery({
    queryKey: ['games', id],
    queryFn: async (): Promise<Game | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GameFormData): Promise<Game> => {
      // Utiliser le slug comme ID (plus lisible)
      const id = data.slug || `game-${Date.now()}`;
      
      const { data: game, error } = await supabase
        .from('games')
        .insert([{ id, ...data, order_index: 999 }])
        .select()
        .single();

      if (error) throw error;
      return game;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Jeu créé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GameFormData> }): Promise<Game> => {
      const { data: game, error } = await supabase
        .from('games')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return game;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.invalidateQueries({ queryKey: ['games', variables.id] });
      toast.success('Jeu mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Jeu supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleGamePublished() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('games')
        .update({ published, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleGameFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('games')
        .update({ featured, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Mise en avant mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}