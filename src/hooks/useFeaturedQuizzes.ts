import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type {
  FeaturedQuiz,
  FeaturedQuizFilters,
  FeaturedQuizFormData,
} from '@/types/featured-quizzes';

const QUERY_KEY = ['featured-quizzes'];

// ============ QUERIES ============

export function useFeaturedQuizzes(filters?: FeaturedQuizFilters) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'list', filters],
    queryFn: async (): Promise<FeaturedQuiz[]> => {
      let query = supabase
        .from('featured_quizzes')
        .select('*, profile:profiles!created_by(username)')
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.search && filters.search.length >= 2) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters?.is_featured) {
        query = query.eq('is_featured', true);
      }

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as FeaturedQuiz[];
    },
  });
}

export function usePendingQuizzesCount() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'pending-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('featured_quizzes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
  });
}

export function useFeaturedQuiz(id: string | undefined) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'detail', id],
    queryFn: async (): Promise<FeaturedQuiz | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('featured_quizzes')
        .select('*, profile:profiles!created_by(username)')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as FeaturedQuiz;
    },
    enabled: !!id,
  });
}

// ============ MUTATIONS ============

export function useCreateFeaturedQuiz() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: FeaturedQuizFormData): Promise<FeaturedQuiz> => {
      const { data: quiz, error } = await supabase
        .from('featured_quizzes')
        .insert([{
          ...data,
          question_count: data.questions_data.length,
          status: 'approved',
          created_by: user!.id,
        }])
        .select('*, profile:profiles!created_by(username)')
        .single();

      if (error) throw error;
      return quiz as FeaturedQuiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Quiz créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateFeaturedQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FeaturedQuizFormData> }): Promise<FeaturedQuiz> => {
      const updateData: Record<string, unknown> = { ...data };
      if (data.questions_data) {
        updateData.question_count = data.questions_data.length;
      }

      const { data: quiz, error } = await supabase
        .from('featured_quizzes')
        .update(updateData)
        .eq('id', id)
        .select('*, profile:profiles!created_by(username)')
        .single();

      if (error) throw error;
      return quiz as FeaturedQuiz;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Quiz mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteFeaturedQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('featured_quizzes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Quiz supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useApproveFeaturedQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('featured_quizzes')
        .update({ status: 'approved', is_active: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Quiz approuvé et activé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useRejectFeaturedQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('featured_quizzes')
        .update({ status: 'rejected' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Quiz rejeté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleFeaturedQuizActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('featured_quizzes')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(is_active ? 'Quiz activé' : 'Quiz désactivé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleFeaturedQuizFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('featured_quizzes')
        .update({ is_featured })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_featured }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(is_featured ? 'Quiz mis en avant' : 'Quiz retiré de la mise en avant');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
