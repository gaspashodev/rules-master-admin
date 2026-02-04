import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DashboardStats {
  totalGames: number;
  publishedGames: number;
  draftGames: number;
  featuredGames: number;
  totalConcepts: number;
  totalSections: number;
  totalBggGames: number;
  totalTcgCards: number;
  recentGames: RecentGame[];
  cardsByTcgType: { name: string; count: number }[];
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
        .select('id, name, cover_image_url, published, featured, created_at')
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

      // Fetch BGG games count
      const { count: bggGamesCount, error: bggError } = await supabase
        .from('bgg_games_cache')
        .select('*', { count: 'exact', head: true });

      if (bggError) throw bggError;

      // Fetch TCG cards count
      const { count: tcgCardsCount, error: tcgError } = await supabase
        .from('tcg_cards_cache')
        .select('*', { count: 'exact', head: true });

      if (tcgError) throw tcgError;

      // Fetch TCG cards count by type (separate count queries to avoid row limits)
      const [pokemonCount, yugiohCount, lorcanaCount, magicCount] = await Promise.all([
        supabase.from('tcg_cards_cache').select('*', { count: 'exact', head: true }).eq('tcg_type', 'pokemon'),
        supabase.from('tcg_cards_cache').select('*', { count: 'exact', head: true }).eq('tcg_type', 'yugioh'),
        supabase.from('tcg_cards_cache').select('*', { count: 'exact', head: true }).eq('tcg_type', 'lorcana'),
        supabase.from('tcg_cards_cache').select('*', { count: 'exact', head: true }).eq('tcg_type', 'magic'),
      ]);

      // Calculate stats
      const totalGames = games?.length || 0;
      const publishedGames = games?.filter((g) => g.published).length || 0;
      const draftGames = totalGames - publishedGames;
      const featuredGames = games?.filter((g) => g.featured).length || 0;
      const totalConcepts = concepts?.length || 0;
      const totalSections = sections?.length || 0;
      const totalBggGames = bggGamesCount || 0;
      const totalTcgCards = tcgCardsCount || 0;

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

      // Cards by TCG type
      const cardsByTcgType = [
        { name: 'Pokémon', count: pokemonCount.count || 0 },
        { name: 'Yu-Gi-Oh!', count: yugiohCount.count || 0 },
        { name: 'Lorcana', count: lorcanaCount.count || 0 },
        { name: 'Magic', count: magicCount.count || 0 },
      ].filter(t => t.count > 0);

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
        totalBggGames,
        totalTcgCards,
        recentGames,
        cardsByTcgType,
        contentOverTime,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}