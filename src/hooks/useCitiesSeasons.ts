import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { City, Season } from '@/types/cities-seasons';

// ============ CITIES ============

export function useCities() {
  return useQuery({
    queryKey: ['cities', 'list'],
    queryFn: async (): Promise<City[]> => {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleCityActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cityId, forceActive }: { cityId: string; forceActive: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('cities')
        .update({ force_active: forceActive })
        .eq('id', cityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      toast.success('Ville mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ SEASONS ============

export function useSeasons() {
  return useQuery({
    queryKey: ['seasons', 'list'],
    queryFn: async (): Promise<Season[]> => {
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .order('season_number', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useActivateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seasonId: string): Promise<void> => {
      // Complete the currently active season first
      const { error: completeError } = await supabase
        .from('seasons')
        .update({ status: 'completed' })
        .eq('status', 'active');
      if (completeError) throw completeError;

      // Activate the new season
      const { error } = await supabase
        .from('seasons')
        .update({ status: 'active' })
        .eq('id', seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Saison activée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCompleteSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seasonId: string): Promise<void> => {
      const { error } = await supabase
        .from('seasons')
        .update({ status: 'completed' })
        .eq('id', seasonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Saison terminée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
