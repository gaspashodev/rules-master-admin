import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { CompetitiveMatch, MatchParticipant, CompetitiveMatchesFilters, PlayerStats } from '@/types/competitive';
import type { PlacementSnapshotEntry } from '@/types/moderation';
import { sendAdminNotification } from '@/hooks/useUsers';

// ============ MATCHES LIST ============

export function useCompetitiveMatches(filters?: CompetitiveMatchesFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const status = filters?.status || 'all';
  const cityId = filters?.city_id || 'all';
  const matchType = filters?.match_type || 'all';
  const search = filters?.search || '';

  return useQuery({
    queryKey: ['competitive', 'matches', 'list', { page, pageSize, status, cityId, matchType, search }],
    queryFn: async (): Promise<{ data: CompetitiveMatch[]; count: number }> => {
      // If searching by username, first find matching match IDs via participants
      let matchIdFilter: string[] | null = null;
      if (search && search.length >= 2) {
        // Find profiles matching the search
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .ilike('username', `%${search}%`);
        const userIds = (profiles || []).map(p => p.id);

        if (userIds.length === 0) {
          return { data: [], count: 0 };
        }

        // Find match IDs where these users participated
        const { data: participantMatches } = await supabase
          .from('competitive_match_participants')
          .select('match_id')
          .in('user_id', userIds);
        matchIdFilter = [...new Set((participantMatches || []).map(p => p.match_id))];

        if (matchIdFilter.length === 0) {
          return { data: [], count: 0 };
        }
      }

      let query = supabase
        .from('competitive_matches')
        .select(`
          *,
          city:cities!city_id(id, name),
          game:bgg_games_cache!game_id(bgg_id, name, name_fr, image_url),
          creator:profiles!creator_id(username)
        `, { count: 'exact' });

      if (matchIdFilter) {
        query = query.in('id', matchIdFilter);
      }
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

function formatMatchDate(dateStr: string | null): string {
  if (!dateStr) return 'date inconnue';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatPvLine(eloChange: number): string {
  if (eloChange > 0) return `Vous avez gagné +${eloChange} PV.`;
  if (eloChange < 0) return `Vous avez perdu ${eloChange} PV.`;
  return `Vos PV restent inchangés.`;
}

function formatReversedPvLine(eloBefore: number | null, eloAfter: number | null): string {
  if (eloBefore === null || eloAfter === null) return `Vos PV n'ont pas été impactés.`;
  const delta = eloAfter - eloBefore;
  if (delta > 0) return `Vos +${delta} PV gagnés ont été retirés.`;
  if (delta < 0) return `Vos ${delta} PV perdus ont été restaurés.`;
  return `Vos PV restent inchangés.`;
}

// Shared helper: apply ELO from snapshot entries to player_city_game_elo + recalculate global
async function applySnapshotElo(
  entries: PlacementSnapshotEntry[],
  seasonId: string,
  gameId: string,
  matchCityId: string,
  isDraw: boolean,
) {
  for (const entry of entries) {
    // Fetch current ELO entry for this player+game+season
    const { data: eloRow } = await supabase
      .from('player_city_game_elo')
      .select('city_id, current_elo, peak_elo, total_matches, wins, losses')
      .eq('user_id', entry.user_id)
      .eq('season_id', seasonId)
      .eq('game_id', gameId)
      .limit(1)
      .maybeSingle();

    const cityId = eloRow?.city_id || matchCityId;
    const currentElo = eloRow?.current_elo || 0;
    const newElo = Math.max(0, currentElo + entry.elo_change);
    const isWin = entry.placement === 1 && !isDraw;
    const isLoss = entry.placement > 1 && !isDraw;

    // Update participant record with ELO data
    const { error: updatePartError } = await supabase
      .from('competitive_match_participants')
      .update({
        elo_before: entry.elo_before,
        elo_after: entry.elo_after,
        elo_change: entry.elo_change,
        result_confirmed: true,
      })
      .eq('id', entry.participant_id);
    if (updatePartError) throw updatePartError;

    // Update or create player_city_game_elo
    if (eloRow) {
      const { error: updateEloError } = await supabase
        .from('player_city_game_elo')
        .update({
          current_elo: newElo,
          peak_elo: Math.max(eloRow.peak_elo, newElo),
          total_matches: eloRow.total_matches + 1,
          wins: eloRow.wins + (isWin ? 1 : 0),
          losses: eloRow.losses + (isLoss ? 1 : 0),
        })
        .eq('user_id', entry.user_id)
        .eq('city_id', cityId)
        .eq('season_id', seasonId)
        .eq('game_id', gameId);
      if (updateEloError) throw updateEloError;
    } else {
      const { error: insertEloError } = await supabase
        .from('player_city_game_elo')
        .insert({
          user_id: entry.user_id,
          city_id: cityId,
          season_id: seasonId,
          game_id: gameId,
          current_elo: newElo,
          peak_elo: Math.max(0, newElo),
          total_matches: 1,
          wins: isWin ? 1 : 0,
          losses: isLoss ? 1 : 0,
        });
      if (insertEloError) throw insertEloError;
    }

    // Recalculate global ELO
    const { error: rpcError } = await supabase.rpc('recalculate_global_elo', {
      p_user_id: entry.user_id,
      p_city_id: cityId,
      p_season_id: seasonId,
    });
    if (rpcError) throw rpcError;
  }
}

export function useForceConfirmResults() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, message }: { matchId: string; message: string }): Promise<void> => {
      // 1. Fetch match info with game name and date
      const { data: match, error: matchFetchError } = await supabase
        .from('competitive_matches')
        .select(`season_id, game_id, city_id, is_draw, started_at,
          game:bgg_games_cache!game_id(name, name_fr)`)
        .eq('id', matchId)
        .single();
      if (matchFetchError) throw matchFetchError;

      const gameName = (match.game as { name: string; name_fr: string | null } | null)?.name_fr
        || (match.game as { name: string; name_fr: string | null } | null)?.name
        || 'jeu inconnu';
      const matchDate = formatMatchDate(match.started_at);

      // 2. Try to get placements_snapshot from contestation
      const { data: contestation } = await supabase
        .from('match_contestations')
        .select('placements_snapshot')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const snapshot = contestation?.placements_snapshot as PlacementSnapshotEntry[] | null;

      if (!snapshot || snapshot.length === 0) {
        throw new Error('Aucun snapshot de résultats trouvé pour ce match');
      }

      // 3. Apply ELO from snapshot
      await applySnapshotElo(snapshot, match.season_id, match.game_id, match.city_id, match.is_draw);

      // 4. Set match to completed
      const { data: updated, error: matchError } = await supabase
        .from('competitive_matches')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          results_pending_confirmation: false,
        })
        .eq('id', matchId)
        .select('id');
      if (matchError) throw matchError;
      if (!updated || updated.length === 0) throw new Error('Impossible de mettre à jour le statut du match');

      // 5. Send personalized message to each participant
      for (const entry of snapshot) {
        const fullMessage = `La contestation du résultat de la partie de "${gameName}" du ${matchDate} a été retenue.\n\nEn conséquence :\n${formatPvLine(entry.elo_change)}\nCette partie sera bien comptabilisée dans vos statistiques.\n\n${message}`;
        await sendAdminNotification(entry.user_id, fullMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive'] });
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
      toast.success('Match validé — PV appliqués');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCancelMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, message }: { matchId: string; message: string }): Promise<void> => {
      // 1. Fetch match info with game name and date
      const { data: match, error: matchFetchError } = await supabase
        .from('competitive_matches')
        .select(`season_id, game_id, started_at,
          game:bgg_games_cache!game_id(name, name_fr)`)
        .eq('id', matchId)
        .single();
      if (matchFetchError) throw matchFetchError;

      const gameName = (match.game as { name: string; name_fr: string | null } | null)?.name_fr
        || (match.game as { name: string; name_fr: string | null } | null)?.name
        || 'jeu inconnu';
      const matchDate = formatMatchDate(match.started_at);

      // 2. Fetch participants with elo_before, elo_after, placement
      const { data: participants, error: partError } = await supabase
        .from('competitive_match_participants')
        .select('user_id, placement, elo_before, elo_after')
        .eq('match_id', matchId);
      if (partError) throw partError;

      // 3. Reverse PV for each participant
      const affectedPlayers = (participants || []).filter(
        p => p.elo_before !== null && p.elo_after !== null
      );

      for (const p of affectedPlayers) {
        const pvDelta = p.elo_after - p.elo_before; // gain or loss to reverse

        // Find the player's entry for this game+season
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
          // Delete the row entirely if no matches left
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

        // Recalculate global ELO
        const { error: rpcError } = await supabase.rpc('recalculate_global_elo', {
          p_user_id: p.user_id,
          p_city_id: eloRow.city_id,
          p_season_id: match.season_id,
        });
        if (rpcError) throw rpcError;
      }

      // 4. Set match status to cancelled
      const { data: updated, error } = await supabase
        .from('competitive_matches')
        .update({ status: 'cancelled', cancelled_reason: message, results_pending_confirmation: false })
        .eq('id', matchId)
        .select('id');
      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error('Impossible de mettre à jour le statut du match');

      // 5. Send personalized message to each participant
      for (const p of (participants || [])) {
        const fullMessage = `La partie de "${gameName}" du ${matchDate} a été annulée.\n\nEn conséquence :\n${formatReversedPvLine(p.elo_before, p.elo_after)}\nCette partie ne sera pas comptabilisée dans vos statistiques.\n\n${message}`;
        await sendAdminNotification(p.user_id, fullMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitive'] });
      toast.success('Match annulé — PV reversés');
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
    mutationFn: async ({ userId, seasonId, message }: { userId: string; seasonId: string; message: string }): Promise<void> => {
      const { error } = await supabase.rpc('reset_player_season_pv', {
        p_user_id: userId,
        p_season_id: seasonId,
      });
      if (error) throw error;
      await sendAdminNotification(userId, message);
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

// ============ PLAYER STATS ============

export function usePlayerStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['competitive', 'player-stats', userId],
    queryFn: async (): Promise<PlayerStats> => {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .eq('id', userId!)
        .single();
      if (profileError) throw profileError;

      // Fetch all elo entries with city and game names (for per-game breakdown)
      // Filter out entries with 0 matches (leftover from cancelled matches)
      const { data: eloData, error: eloError } = await supabase
        .from('player_city_game_elo')
        .select(`
          city_id, game_id, current_elo, peak_elo, total_matches, wins, losses,
          city:cities!city_id(name),
          game:bgg_games_cache!game_id(name, name_fr)
        `)
        .eq('user_id', userId!)
        .gt('total_matches', 0)
        .order('current_elo', { ascending: false });
      if (eloError) throw eloError;

      const entries = (eloData || []) as unknown as PlayerStats['eloEntries'];

      // Fetch real match stats from competitive_match_participants
      // Use separate queries to avoid FK join issues
      const { data: participations, error: partError } = await supabase
        .from('competitive_match_participants')
        .select('match_id, placement')
        .eq('user_id', userId!)
        .eq('role', 'player');
      if (partError) throw partError;

      // Get match statuses separately
      const matchIds = [...new Set((participations || []).map(p => p.match_id))];
      let matchMap = new Map<string, { status: string; is_draw: boolean }>();

      if (matchIds.length > 0) {
        const { data: matches, error: matchError } = await supabase
          .from('competitive_matches')
          .select('id, status, is_draw')
          .in('id', matchIds);
        if (matchError) throw matchError;
        matchMap = new Map((matches || []).map(m => [m.id, m]));
      }

      // Count only completed matches (1 participation = 1 real match)
      const completed = (participations || []).filter(p => {
        const m = matchMap.get(p.match_id);
        return m?.status === 'completed';
      });
      const totalMatches = completed.length;
      const totalWins = completed.filter(p => {
        const m = matchMap.get(p.match_id);
        return p.placement === 1 && !m?.is_draw;
      }).length;
      const totalLosses = completed.filter(p => {
        const m = matchMap.get(p.match_id);
        return p.placement !== null && p.placement > 1 && !m?.is_draw;
      }).length;

      return {
        profile,
        eloEntries: entries,
        totalMatches,
        totalWins,
        totalLosses,
      };
    },
    enabled: !!userId,
  });
}
