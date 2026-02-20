import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { MatchContestation, PlayerReport, ModerationFilters } from '@/types/moderation';

// ============ CONTESTATIONS ============

export function useContestations(filters?: ModerationFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const status = filters?.status || 'all';

  return useQuery({
    queryKey: ['moderation', 'contestations', { page, pageSize, status }],
    queryFn: async (): Promise<{ data: MatchContestation[]; count: number }> => {
      let query = supabase
        .from('match_contestations')
        .select(`
          *,
          match:competitive_matches!match_contestations_match_id_fkey(
            id, join_code, status, game_id, match_type, is_draw, started_at, completed_at,
            game:bgg_games_cache!game_id(name, name_fr, image_url)
          ),
          contestant:profiles!user_id(username)
        `, { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data as unknown as MatchContestation[]) || [], count: count || 0 };
    },
  });
}

export function useResolveContestation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contestationId,
      matchId,
      resolution,
      adminNote,
    }: {
      contestationId: string;
      matchId: string;
      resolution: 'resolved_cancelled' | 'resolved_dismissed';
      adminNote: string;
    }): Promise<void> => {
      if (resolution === 'resolved_cancelled') {
        // Cancel match + rollback PV (same logic as useCancelMatch)
        const { data: match, error: matchFetchError } = await supabase
          .from('competitive_matches')
          .select('season_id, game_id')
          .eq('id', matchId)
          .single();
        if (matchFetchError) throw matchFetchError;

        const { data: participants, error: partError } = await supabase
          .from('competitive_match_participants')
          .select('user_id, placement, elo_before, elo_after')
          .eq('match_id', matchId);
        if (partError) throw partError;

        const affectedPlayers = (participants || []).filter(
          (p: { elo_before: number | null; elo_after: number | null }) => p.elo_before !== null && p.elo_after !== null
        );

        for (const p of affectedPlayers) {
          const pvDelta = p.elo_after - p.elo_before;

          const { data: eloRow, error: eloFetchError } = await supabase
            .from('player_city_game_elo')
            .select('city_id, current_elo, total_matches, wins, losses')
            .eq('user_id', p.user_id)
            .eq('season_id', match.season_id)
            .eq('game_id', match.game_id)
            .limit(1)
            .single();
          if (eloFetchError) continue;

          const newTotalMatches = Math.max(0, eloRow.total_matches - 1);

          if (newTotalMatches === 0) {
            const { error: deleteErr } = await supabase
              .from('player_city_game_elo')
              .delete()
              .eq('user_id', p.user_id)
              .eq('city_id', eloRow.city_id)
              .eq('season_id', match.season_id)
              .eq('game_id', match.game_id);
            if (deleteErr) throw deleteErr;
          } else {
            const { error: updateErr } = await supabase
              .from('player_city_game_elo')
              .update({
                current_elo: Math.max(0, eloRow.current_elo - pvDelta),
                total_matches: newTotalMatches,
                wins: Math.max(0, eloRow.wins - (p.placement === 1 ? 1 : 0)),
                losses: Math.max(0, eloRow.losses - (p.placement !== null && p.placement > 1 ? 1 : 0)),
              })
              .eq('user_id', p.user_id)
              .eq('city_id', eloRow.city_id)
              .eq('season_id', match.season_id)
              .eq('game_id', match.game_id);
            if (updateErr) throw updateErr;
          }

          const { error: rpcError } = await supabase.rpc('recalculate_global_elo', {
            p_user_id: p.user_id,
            p_city_id: eloRow.city_id,
            p_season_id: match.season_id,
          });
          if (rpcError) throw rpcError;
        }

        // Set match to cancelled
        const { error: cancelError } = await supabase
          .from('competitive_matches')
          .update({ status: 'cancelled', cancelled_reason: 'Annulée suite à contestation' })
          .eq('id', matchId);
        if (cancelError) throw cancelError;
      }

      // Update contestation status
      const { error } = await supabase
        .from('match_contestations')
        .update({
          status: resolution,
          admin_note: adminNote || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', contestationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      queryClient.invalidateQueries({ queryKey: ['competitive'] });
      toast.success('Contestation résolue');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ PLAYER REPORTS ============

export function usePlayerReports(filters?: ModerationFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const status = filters?.status || 'all';

  return useQuery({
    queryKey: ['moderation', 'reports', { page, pageSize, status }],
    queryFn: async (): Promise<{ data: PlayerReport[]; count: number }> => {
      let query = supabase
        .from('player_reports')
        .select(`
          *,
          reported_user:profiles!reported_user_id(username),
          reporter:profiles!reporter_id(username)
        `, { count: 'exact' });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data as unknown as PlayerReport[]) || [], count: count || 0 };
    },
  });
}

// ============ PLAYER REPORT HISTORY ============

export interface PlayerReportHistoryItem {
  id: string;
  reporter_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter?: { username: string | null } | null;
}

export function usePlayerReportHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['moderation', 'report-history', userId],
    queryFn: async (): Promise<PlayerReportHistoryItem[]> => {
      const { data, error } = await supabase
        .from('player_reports')
        .select(`
          id, reporter_id, reason, status, admin_note, created_at, resolved_at,
          reporter:profiles!reporter_id(username)
        `)
        .eq('reported_user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data as unknown as PlayerReportHistoryItem[]) || [];
    },
    enabled: !!userId,
  });
}

// ============ RESOLVE REPORT ============

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reportId,
      reportedUserId,
      resolution,
      adminNote,
      reliabilityPenalty,
    }: {
      reportId: string;
      reportedUserId: string;
      resolution: 'resolved_warned' | 'resolved_suspended' | 'resolved_banned' | 'resolved_dismissed';
      adminNote: string;
      reliabilityPenalty?: number;
    }): Promise<void> => {
      // Apply action based on resolution
      if (resolution === 'resolved_suspended' && reliabilityPenalty !== undefined) {
        const { error: penaltyError } = await supabase
          .from('profiles')
          .update({ reliability_score: Math.max(0, reliabilityPenalty) })
          .eq('id', reportedUserId);
        if (penaltyError) throw penaltyError;
      }

      if (resolution === 'resolved_banned') {
        const { error: banError } = await supabase
          .from('profiles')
          .update({ is_banned: true })
          .eq('id', reportedUserId);
        if (banError) throw banError;
      }

      // Update report status
      const { error } = await supabase
        .from('player_reports')
        .update({
          status: resolution,
          admin_note: adminNote || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Signalement résolu');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
