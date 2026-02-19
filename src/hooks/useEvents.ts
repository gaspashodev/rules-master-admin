import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Event, EventParticipant, EventsFilters } from '@/types/events';

// ============ EVENTS LIST ============

export function useEvents(filters?: EventsFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const search = filters?.search || '';
  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;

  return useQuery({
    queryKey: ['events', 'list', { page, pageSize, search, dateFrom, dateTo }],
    queryFn: async (): Promise<{ data: Event[]; count: number }> => {
      let query = supabase
        .from('events')
        .select(`
          *,
          organiser:profiles!organiser_id(id, username),
          game:bgg_games_cache!game_id(bgg_id, name, name_fr, image_url),
          event_participants(count)
        `, { count: 'exact' });

      if (search && search.length >= 2) {
        query = query.or(`title.ilike.%${search}%,city.ilike.%${search}%`);
      }
      if (dateFrom) {
        query = query.gte('starts_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('starts_at', dateTo);
      }

      query = query
        .order('starts_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // Flatten participant count from nested aggregate
      const processed = (data || []).map((event: Record<string, unknown>) => {
        const participants = event.event_participants as { count: number }[] | undefined;
        return {
          ...event,
          participants_count: participants?.[0]?.count || 0,
        };
      });

      return { data: processed as unknown as Event[], count: count || 0 };
    },
  });
}

// ============ EVENT PARTICIPANTS ============

export function useEventParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: ['events', 'participants', eventId],
    queryFn: async (): Promise<EventParticipant[]> => {
      // Fetch participants first
      const { data: participants, error } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!participants?.length) return [];

      // Fetch profiles separately for robustness
      const userIds = [...new Set(participants.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return participants.map(p => ({
        ...p,
        profile: profileMap.get(p.user_id) || null,
      })) as EventParticipant[];
    },
    enabled: !!eventId,
  });
}
