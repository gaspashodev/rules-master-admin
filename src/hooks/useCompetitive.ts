import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { CompetitiveMatch, MatchParticipant, CompetitiveMatchesFilters } from '@/types/competitive';

// ============ MATCHES LIST ============

export function useCompetitiveMatches(filters?: CompetitiveMatchesFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const status = filters?.status || 'all';
  const cityId = filters?.city_id || 'all';
  const matchType = filters?.match_type || 'all';

  return useQuery({
    queryKey: ['competitive', 'matches', 'list', { page, pageSize, status, cityId, matchType }],
    queryFn: async (): Promise<{ data: CompetitiveMatch[]; count: number }> => {
      let query = supabase
        .from('competitive_matches')
        .select(`
          *,
          city:cities!city_id(id, name),
          game:bgg_games_cache!game_id(bgg_id, name, name_fr, image_url),
          creator:profiles!creator_id(username)
        `, { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      if (cityId && cityId !== 'all') {
        query = query.eq('city_id', cityId);
      }
      if (matchType && matchType !== 'all') {
        query = query.eq('match_type', matchType);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data as unknown as CompetitiveMatch[]) || [], count: count || 0 };
    },
  });
}

// ============ MATCH PARTICIPANTS ============

export function useMatchParticipants(matchId: string | undefined) {
  return useQuery({
    queryKey: ['competitive', 'matches', 'participants', matchId],
    queryFn: async (): Promise<MatchParticipant[]> => {
      const { data, error } = await supabase
        .from('competitive_match_participants')
        .select(`
          *,
          profile:profiles!user_id(username)
        `)
        .eq('match_id', matchId!)
        .order('placement', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data as unknown as MatchParticipant[]) || [];
    },
    enabled: !!matchId,
  });
}

// ============ ADMIN ACTIONS ============

export function useForceConfirmResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string): Promise<void> => {
      const { error } = await supabase
        .from('competitive_match_participants')
        .update({ result_confirmed: true })
        .eq('match_id', matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive', 'matches'] });
      toast.success('Résultats confirmés pour tous les participants');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCancelMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (matchId: string): Promise<void> => {
      // 1. Fetch match info to get city_id, season_id, game_id
      const { data: match, error: matchFetchError } = await supabase
        .from('competitive_matches')
        .select('city_id, season_id, game_id')
        .eq('id', matchId)
        .single();
      if (matchFetchError) throw matchFetchError;

      // 2. Fetch participants with elo changes
      const { data: participants, error: partError } = await supabase
        .from('competitive_match_participants')
        .select('user_id, elo_change')
        .eq('match_id', matchId);
      if (partError) throw partError;

      // 3. Reverse PV for each participant who had an elo change
      const affectedPlayers = (participants || []).filter(p => p.elo_change && p.elo_change !== 0);

      for (const p of affectedPlayers) {
        // Get current elo
        const { data: eloRow, error: eloFetchError } = await supabase
          .from('player_city_game_elo')
          .select('current_elo')
          .eq('user_id', p.user_id)
          .eq('city_id', match.city_id)
          .eq('season_id', match.season_id)
          .eq('game_id', match.game_id)
          .single();
        if (eloFetchError) throw eloFetchError;

        const reversedElo = Math.max(0, (eloRow?.current_elo || 0) - p.elo_change);

        const { error: eloUpdateError } = await supabase
          .from('player_city_game_elo')
          .update({ current_elo: reversedElo })
          .eq('user_id', p.user_id)
          .eq('city_id', match.city_id)
          .eq('season_id', match.season_id)
          .eq('game_id', match.game_id);
        if (eloUpdateError) throw eloUpdateError;

        // Recalculate global ELO
        const { error: rpcError } = await supabase.rpc('recalculate_global_elo', {
          p_user_id: p.user_id,
          p_city_id: match.city_id,
          p_season_id: match.season_id,
        });
        if (rpcError) throw rpcError;
      }

      // 4. Set match status to cancelled
      const { error } = await supabase
        .from('competitive_matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive', 'matches'] });
      toast.success('Match annulé — PV reversés pour tous les participants');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useModifyPlayerPv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      cityId,
      seasonId,
      gameId,
      newElo,
    }: {
      userId: string;
      cityId: string;
      seasonId: string;
      gameId: string;
      newElo: number;
    }): Promise<void> => {
      // Update the player's ELO for this specific game
      const { error } = await supabase
        .from('player_city_game_elo')
        .update({
          current_elo: Math.max(0, newElo),
          peak_elo: newElo, // Will be corrected by GREATEST in DB if needed
        })
        .eq('user_id', userId)
        .eq('city_id', cityId)
        .eq('season_id', seasonId)
        .eq('game_id', gameId);
      if (error) throw error;

      // Recalculate global ELO
      const { error: rpcError } = await supabase.rpc('recalculate_global_elo', {
        p_user_id: userId,
        p_city_id: cityId,
        p_season_id: seasonId,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive'] });
      toast.success('PV modifié et ELO global recalculé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useResetPlayerSeasonPv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, seasonId }: { userId: string; seasonId: string }): Promise<void> => {
      const { error } = await supabase.rpc('reset_player_season_pv', {
        p_user_id: userId,
        p_season_id: seasonId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive'] });
      toast.success('PV du joueur réinitialisé pour la saison');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
