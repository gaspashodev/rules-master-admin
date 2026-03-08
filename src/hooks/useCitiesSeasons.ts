import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { City, Season, CitiesFilters } from '@/types/cities-seasons';

// ============ CITIES ============

export function useCities(filters?: CitiesFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const search = filters?.search || '';

  return useQuery({
    queryKey: ['cities', 'list', { page, pageSize, search }],
    queryFn: async (): Promise<{ data: City[]; count: number }> => {
      let query = supabase
        .from('cities')
        .select('*', { count: 'exact' });

      if (search && search.length >= 2) {
        query = query.ilike('name', `%${search}%`);
      }

      query = query
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: (data as City[]) || [], count: count || 0 };
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

// ============ UPDATE SEASON END DATE ============

export function useUpdateSeasonEndDate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      seasonId,
      endsAt,
      broadcastMessage,
    }: {
      seasonId: string;
      endsAt: string;
      broadcastMessage?: string;
    }): Promise<void> => {
      const { data: updatedSeason, error } = await supabase
        .from('seasons')
        .update({ ends_at: endsAt })
        .eq('id', seasonId)
        .select('id');
      if (error) throw error;
      if (!updatedSeason || updatedSeason.length === 0) throw new Error('Impossible de modifier la date de fin (permissions insuffisantes ou saison introuvable)');

      if (broadcastMessage?.trim()) {
        // Fetch all participants of this season (via competitive_matches)
        const { data: season } = await supabase
          .from('seasons')
          .select('starts_at, ends_at')
          .eq('id', seasonId)
          .single();

        if (season) {
          const { data: participants } = await supabase
            .from('competitive_matches')
            .select('competitive_match_participants!inner(user_id)')
            .gte('started_at', season.starts_at)
            .lte('started_at', endsAt)
            .neq('status', 'cancelled');

          if (participants) {
            const userIds = [...new Set(
              participants.flatMap((m: Record<string, unknown>) => {
                const parts = m.competitive_match_participants as { user_id: string }[];
                return parts?.map(p => p.user_id) || [];
              })
            )];

            const messages = userIds.map(userId => ({
              sender_id: null as null,
              recipient_id: userId,
              content: broadcastMessage.trim(),
            }));

            if (messages.length > 0) {
              await supabase.from('direct_messages').insert(messages);
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Date de fin mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ CREATE SEASON ============

export interface CreateSeasonData {
  season_number: number;
  starts_at: string;
  ends_at: string;
  status: 'upcoming' | 'active';
}

export function useCreateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSeasonData): Promise<void> => {
      const { error } = await supabase
        .from('seasons')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success('Saison créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ SEASON STATS (implications before closing) ============

export interface SeasonStats {
  completed_matches: number;
  active_matches: number;
  total_players: number;
}

export function useSeasonStats(season: Season | undefined) {
  return useQuery({
    queryKey: ['seasons', 'stats', season?.id],
    queryFn: async (): Promise<SeasonStats> => {
      const [completed, active] = await Promise.all([
        supabase
          .from('competitive_matches')
          .select('id, competitive_match_participants!inner(user_id)', { count: 'exact' })
          .gte('started_at', season!.starts_at)
          .lte('started_at', season!.ends_at)
          .eq('status', 'completed'),
        supabase
          .from('competitive_matches')
          .select('id', { count: 'exact' })
          .gte('started_at', season!.starts_at)
          .lte('started_at', season!.ends_at)
          .in('status', ['pending', 'in_progress']),
      ]);

      const completedData = completed.data || [];
      const allUserIds = new Set(
        completedData.flatMap((m: Record<string, unknown>) => {
          const parts = m.competitive_match_participants as { user_id: string }[];
          return parts?.map(p => p.user_id) || [];
        })
      );

      return {
        completed_matches: completed.count || 0,
        active_matches: active.count || 0,
        total_players: allUserIds.size,
      };
    },
    enabled: !!season,
  });
}
