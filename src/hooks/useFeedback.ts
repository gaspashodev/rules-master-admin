import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type FeedbackType = 'bug' | 'suggestion' | 'autre';
export type FeedbackStatus = 'nouveau' | 'en_cours' | 'resolu' | 'ignore';

export interface FeedbackReport {
  id: string;
  user_id: string | null;
  type: FeedbackType;
  message: string;
  page_url: string | null;
  status: FeedbackStatus;
  created_at: string;
  username?: string | null;
}

export interface FeedbackFilters {
  type?: FeedbackType | 'all';
  status?: FeedbackStatus | 'all';
  page?: number;
  pageSize?: number;
}

export function useFeedbackCount() {
  return useQuery({
    queryKey: ['feedback-reports', 'count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('feedback_reports')
        .select('id', { count: 'exact' })
        .eq('status', 'nouveau');
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useFeedbackReports(filters?: FeedbackFilters) {
  const page = filters?.page ?? 0;
  const pageSize = filters?.pageSize ?? 25;

  return useQuery({
    queryKey: ['feedback-reports', filters],
    queryFn: async (): Promise<{ data: FeedbackReport[]; count: number }> => {
      let query = supabase
        .from('feedback_reports')
        .select('*, profile:profiles!user_id(username)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: (data || []).map(f => ({
          ...f,
          username: (f as unknown as { profile?: { username: string } }).profile?.username ?? null,
        })),
        count: count || 0,
      };
    },
  });
}

export function useMarkFeedbackProcessed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      const { error } = await supabase
        .from('feedback_reports')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-reports'] });
    },
  });
}
