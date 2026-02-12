import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalBggGames: number;
  totalQuizQuestions: number;
  activeQuizQuestions: number;
  totalAwards: number;
  pendingFlagged: number;
}

export function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const [bggGames, quizQuestions, awards, flagged] = await Promise.all([
        supabase.from('bgg_games_cache').select('*', { count: 'exact', head: true }),
        supabase.from('bgg_quiz_questions').select('id, is_active'),
        supabase.from('bgg_awards').select('*', { count: 'exact', head: true }),
        supabase.from('bgg_quiz_flagged').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      return {
        totalBggGames: bggGames.count || 0,
        totalQuizQuestions: quizQuestions.data?.length || 0,
        activeQuizQuestions: quizQuestions.data?.filter(q => q.is_active).length || 0,
        totalAwards: awards.count || 0,
        pendingFlagged: flagged.count || 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
