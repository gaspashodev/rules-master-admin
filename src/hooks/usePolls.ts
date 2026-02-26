import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { Poll, PollFilters, PollFormData } from '@/types/polls';

const QUERY_KEY = ['polls'];

// ============ QUERIES ============

export function usePolls(filters?: PollFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'list', filters],
    queryFn: async (): Promise<Poll[]> => {
      let query = supabase
        .from('polls')
        .select('*, options:poll_options(*, vote_count:poll_votes(count))')
        .order('created_at', { ascending: false });

      if (filters?.is_active !== undefined && filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.search && filters.search.length >= 2) {
        query = query.ilike('question', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the nested count to a flat number
      return ((data || []) as any[]).map((poll) => ({
        ...poll,
        options: (poll.options || [])
          .map((opt: any) => ({
            ...opt,
            vote_count: opt.vote_count?.[0]?.count ?? 0,
          }))
          .sort((a: any, b: any) => a.position - b.position),
      })) as Poll[];
    },
  });
}

// ============ MUTATIONS ============

export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PollFormData): Promise<void> => {
      // 1. Create the poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert([{
          question: data.question,
          is_active: data.is_active,
          ends_at: data.ends_at || null,
        }])
        .select('id')
        .single();

      if (pollError) throw pollError;

      // 2. Create options
      const options = data.options.map((opt, i) => ({
        poll_id: poll.id,
        label: opt.label,
        is_free_text: opt.is_free_text,
        position: i,
      }));

      const { error: optError } = await supabase
        .from('poll_options')
        .insert(options);

      if (optError) throw optError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Sondage créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PollFormData }): Promise<void> => {
      // 1. Update the poll
      const { error: pollError } = await supabase
        .from('polls')
        .update({
          question: data.question,
          is_active: data.is_active,
          ends_at: data.ends_at || null,
        })
        .eq('id', id);

      if (pollError) throw pollError;

      // 2. Delete old options and recreate
      const { error: delError } = await supabase
        .from('poll_options')
        .delete()
        .eq('poll_id', id);

      if (delError) throw delError;

      const options = data.options.map((opt, i) => ({
        poll_id: id,
        label: opt.label,
        is_free_text: opt.is_free_text,
        position: i,
      }));

      const { error: optError } = await supabase
        .from('poll_options')
        .insert(options);

      if (optError) throw optError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Sondage mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('polls')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Sondage supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useTogglePollActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('polls')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(is_active ? 'Sondage activé' : 'Sondage désactivé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
