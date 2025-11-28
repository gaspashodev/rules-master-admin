import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Concept, ConceptWithSections, ConceptFormData, SectionFormData, LessonSection } from '@/types/database';
import { toast } from 'sonner';

export function useConcepts(gameId: string | undefined) {
  return useQuery({
    queryKey: ['concepts', gameId],
    queryFn: async (): Promise<Concept[]> => {
      if (!gameId) return [];

      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('game_id', gameId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!gameId,
  });
}

export function useConcept(id: string | undefined) {
  return useQuery({
    queryKey: ['concepts', 'detail', id],
    queryFn: async (): Promise<ConceptWithSections | null> => {
      if (!id) return null;

      const { data: concept, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', id)
        .single();

      if (conceptError) throw conceptError;

      const { data: sections, error: sectionsError } = await supabase
        .from('lesson_sections')
        .select('*')
        .eq('concept_id', id)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;

      return { ...concept, sections: sections || [] };
    },
    enabled: !!id,
  });
}

export function useCreateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: ConceptFormData }): Promise<Concept> => {
      const id = `concept-${Date.now()}`;

      const { data: concept, error } = await supabase
        .from('concepts')
        .insert([{ id, game_id: gameId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return concept;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Concept créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ConceptFormData> }): Promise<Concept> => {
      const { data: concept, error } = await supabase
        .from('concepts')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return concept;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', data.game_id] });
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', data.id] });
      toast.success('Concept mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, gameId }: { id: string; gameId: string }): Promise<void> => {
      const { error } = await supabase
        .from('concepts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
      toast.success('Concept supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conceptId, data }: { conceptId: string; data: SectionFormData }): Promise<LessonSection> => {
      const id = `section-${Date.now()}`;

      const { data: section, error } = await supabase
        .from('lesson_sections')
        .insert([{ id, concept_id: conceptId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', variables.conceptId] });
      toast.success('Section ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, conceptId, data }: { id: string; conceptId: string; data: Partial<SectionFormData> }): Promise<LessonSection> => {
      const { data: section, error } = await supabase
        .from('lesson_sections')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', variables.conceptId] });
      toast.success('Section mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, conceptId }: { id: string; conceptId: string }): Promise<void> => {
      const { error } = await supabase
        .from('lesson_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', variables.conceptId] });
      toast.success('Section supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}