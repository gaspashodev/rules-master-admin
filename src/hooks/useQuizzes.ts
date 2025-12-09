import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Quiz, QuizQuestion, QuizQuestionFormData } from '@/types/database';
import { toast } from 'sonner';

// ============ QUIZ ============

export function useQuiz(conceptId: string | undefined) {
  return useQuery({
    queryKey: ['quiz', conceptId],
    queryFn: async (): Promise<Quiz | null> => {
      if (!conceptId) return null;

      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('concept_id', conceptId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!conceptId,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conceptId: string): Promise<Quiz> => {
      const { data: quiz, error } = await supabase
        .from('quizzes')
        .insert([{ concept_id: conceptId }])
        .select()
        .single();

      if (error) throw error;
      return quiz;
    },
    onSuccess: (_, conceptId) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', conceptId] });
      toast.success('Quiz créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; conceptId: string }): Promise<void> => {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['quiz', params.conceptId] });
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', params.conceptId] });
      toast.success('Quiz supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ QUIZ QUESTIONS ============

export function useQuizQuestions(quizId: string | undefined) {
  return useQuery({
    queryKey: ['quiz-questions', quizId],
    queryFn: async (): Promise<QuizQuestion[]> => {
      if (!quizId) return [];

      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!quizId,
  });
}

export function useCreateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quizId, data }: { quizId: string; data: QuizQuestionFormData }): Promise<QuizQuestion> => {
      const { data: question, error } = await supabase
        .from('quiz_questions')
        .insert([{ quiz_id: quizId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', data.quiz_id] });
      toast.success('Question ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; quizId: string; data: Partial<QuizQuestionFormData> }): Promise<QuizQuestion> => {
      const { data: question, error } = await supabase
        .from('quiz_questions')
        .update(params.data)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', data.quiz_id] });
      toast.success('Question mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; quizId: string }): Promise<void> => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', params.quizId] });
      toast.success('Question supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useReorderQuizQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { quizId: string; questions: { id: string; order_index: number }[] }): Promise<void> => {
      // Exécuter chaque update et attendre le résultat
      for (const q of params.questions) {
        const { error } = await supabase
          .from('quiz_questions')
          .update({ order_index: q.order_index })
          .eq('id', q.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['quiz-questions', params.quizId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}