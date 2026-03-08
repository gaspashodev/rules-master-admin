import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ChampionResult {
  city_name: string;
  champion_username: string;
  tier_awarded: number;
  is_global: boolean;
}

export interface SeasonCityChampion {
  id: string;
  season_id: string;
  city_id: string;
  user_id: string;
  tier_awarded: number;
  is_global_champion: boolean;
  elo_snapshot: number | null;
  created_at: string;
  city?: { name: string } | null;
  champion?: { username: string | null } | null;
}

// ============ AWARD SEASON CHAMPIONS (RPC) ============

export function useAwardSeasonChampions() {
  return useMutation({
    mutationFn: async (seasonId: string): Promise<ChampionResult[]> => {
      const { data, error } = await supabase.rpc('award_season_champions', {
        p_season_id: seasonId,
      });
      if (error) throw error;
      return (data as ChampionResult[]) || [];
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors de l'attribution : ${error.message}`);
    },
  });
}

// ============ SEASON CITY CHAMPIONS (from table) ============

export function useSeasonChampions(seasonId: string | undefined) {
  return useQuery({
    queryKey: ['champions', 'season', seasonId],
    queryFn: async (): Promise<SeasonCityChampion[]> => {
      const { data, error } = await supabase
        .from('season_city_champions')
        .select(`
          *,
          city:cities!city_id(name),
          champion:profiles!user_id(username)
        `)
        .eq('season_id', seasonId!)
        .order('is_global_champion', { ascending: false })
        .order('tier_awarded', { ascending: false });

      if (error) throw error;
      return (data as unknown as SeasonCityChampion[]) || [];
    },
    enabled: !!seasonId,
  });
}

// ============ MARK SEASON AS COMPLETED ============

export function useCompleteSeasonForChampions() {
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
      toast.success('Saison marquée comme terminée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });
}
