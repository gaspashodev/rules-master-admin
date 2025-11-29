import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  featuredGames: number;
  totalConcepts: number;
  totalSections: number;
  totalQuizzes: number;
  totalQuestions: number;
  recentGames: RecentGame[];
  gamesByDifficulty: { difficulty: string; count: number }[];
  contentOverTime: { date: string; games: number; concepts: number }[];
}

export interface RecentGame {
  id: string;
  name: string;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  concept_count: number;
}

export function useStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      // Fetch games
      const { data: games, error: gamesError } = await supabase
        .from('games')
        .select('id, name, cover_image_url, published, featured, difficulty, created_at')
        .order('created_at', { ascending: false });

      if (gamesError) throw gamesError;

      // Fetch concepts count per game
      const { data: concepts, error: conceptsError } = await supabase
        .from('concepts')
        .select('id, game_id, created_at');

      if (conceptsError) throw conceptsError;

      // Fetch sections count
      const { data: sections, error: sectionsError } = await supabase
        .from('lesson_sections')
        .select('id');

      if (sectionsError) throw sectionsError;

      // Fetch quizzes and questions
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select('id');

      if (quizzesError) throw quizzesError;

      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('id');

      if (questionsError) throw questionsError;

      // Calculate stats
      const totalGames = games?.length || 0;
      const publishedGames = games?.filter((g) => g.published).length || 0;
      const draftGames = totalGames - publishedGames;
      const featuredGames = games?.filter((g) => g.featured).length || 0;
      const totalConcepts = concepts?.length || 0;
      const totalSections = sections?.length || 0;
      const totalQuizzes = quizzes?.length || 0;
      const totalQuestions = questions?.length || 0;

      // Concepts count per game
      const conceptCountByGame = (concepts || []).reduce((acc, c) => {
        acc[c.game_id] = (acc[c.game_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Recent games with concept count
      const recentGames: RecentGame[] = (games || []).slice(0, 5).map((g) => ({
        id: g.id,
        name: g.name,
        cover_image_url: g.cover_image_url,
        published: g.published,
        created_at: g.created_at,
        concept_count: conceptCountByGame[g.id] || 0,
      }));

      // Games by difficulty
      const difficultyCount = (games || []).reduce((acc, g) => {
        acc[g.difficulty] = (acc[g.difficulty] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const gamesByDifficulty = [
        { difficulty: 'Débutant', count: difficultyCount['beginner'] || 0 },
        { difficulty: 'Intermédiaire', count: difficultyCount['intermediate'] || 0 },
        { difficulty: 'Expert', count: difficultyCount['expert'] || 0 },
      ];

      // Content over time (last 6 months)
      const now = new Date();
      const contentOverTime = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        const monthStart = date.toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

        const gamesInMonth = (games || []).filter(
          (g) => g.created_at >= monthStart && g.created_at <= monthEnd
        ).length;
        const conceptsInMonth = (concepts || []).filter(
          (c) => c.created_at >= monthStart && c.created_at <= monthEnd
        ).length;

        contentOverTime.push({
          date: monthStr,
          games: gamesInMonth,
          concepts: conceptsInMonth,
        });
      }

      return {
        totalGames,
        publishedGames,
        draftGames,
        featuredGames,
        totalConcepts,
        totalSections,
        totalQuizzes,
        totalQuestions,
        recentGames,
        gamesByDifficulty,
        contentOverTime,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}