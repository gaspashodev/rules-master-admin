import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface ChampionResult {
  city_name: string;
  champion_username: string;
  tier_awarded: number;
}

export interface RecentChampionAchievement {
  user_id: string;
  username: string | null;
  tier: number;
  earned_at: string;
}

// ============ CHECK FUNCTION EXISTS ============

export function useCheckChampionFunction() {
  return useQuery({
    queryKey: ['champions', 'function-exists'],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('information_schema.routines' as never)
        .select('routine_name')
        .eq('routine_name', 'award_season_champions')
        .maybeSingle() as unknown as { data: { routine_name: string } | null; error: unknown };

      if (error) {
        // Fallback: try via rpc call signature check
        return false;
      }
      return !!data;
    },
    retry: false,
  });
}

// ============ AWARD SEASON CHAMPIONS ============

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

// ============ RECENT CHAMPION ACHIEVEMENTS ============

export function useRecentChampionAchievements() {
  return useQuery({
    queryKey: ['champions', 'recent-achievements'],
    queryFn: async (): Promise<RecentChampionAchievement[]> => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          user_id,
          tier,
          earned_at,
          profile:profiles!user_id(username)
        `)
        .eq('achievement_type', 'champion')
        .order('earned_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return ((data || []).map((row: Record<string, unknown>) => ({
        user_id: row.user_id as string,
        username: (row.profile as { username: string | null } | null)?.username ?? null,
        tier: row.tier as number,
        earned_at: row.earned_at as string,
      })));
    },
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
