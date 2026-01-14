import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { 
  Concept, 
  ConceptWithSections, 
  ConceptFormData, 
  LessonSection,
  SectionFormData, 
  SectionBlock,
  BlockFormData 
} from '@/types/database';
import { toast } from 'sonner';

// ============ CONCEPTS ============

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

      // Récupérer le concept
      const { data: concept, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', id)
        .single();

      if (conceptError) throw conceptError;

      // Récupérer les sections avec leurs blocs
      const { data: sections, error: sectionsError } = await supabase
        .from('lesson_sections')
        .select(`
          *,
          blocks:section_blocks(*)
        `)
        .eq('concept_id', id)
        .order('order_index', { ascending: true });

      if (sectionsError) throw sectionsError;

      // Trier les blocs par order_index dans chaque section
      const sectionsWithSortedBlocks = (sections || []).map(section => ({
        ...section,
        blocks: (section.blocks || []).sort((a: SectionBlock, b: SectionBlock) => a.order_index - b.order_index)
      }));

      return { ...concept, sections: sectionsWithSortedBlocks };
    },
    enabled: !!id,
  });
}

export function useCreateConcept() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, data }: { gameId: string; data: ConceptFormData }): Promise<Concept> => {
      const { data: concept, error } = await supabase
        .from('concepts')
        .insert([{ game_id: gameId, ...data }])
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
    mutationFn: async (params: { id: string; gameId: string }): Promise<void> => {
      const { error } = await supabase
        .from('concepts')
        .delete()
        .eq('id', params.id);

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

export function useReorderConcepts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { gameId: string; concepts: { id: string; order_index: number }[] }): Promise<void> => {
      for (const c of params.concepts) {
        const { error } = await supabase
          .from('concepts')
          .update({ order_index: c.order_index })
          .eq('id', c.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', params.gameId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ SECTIONS (CARTES) ============

export function useCreateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conceptId, data }: { conceptId: string; data: SectionFormData }): Promise<LessonSection> => {
      const { data: section, error } = await supabase
        .from('lesson_sections')
        .insert([{ concept_id: conceptId, ...data }])
        .select()
        .single();

      if (error) throw error;
      return section;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', variables.conceptId] });
      toast.success('Section créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; conceptId: string; data: Partial<SectionFormData> }): Promise<LessonSection> => {
      const { data: section, error } = await supabase
        .from('lesson_sections')
        .update(params.data)
        .eq('id', params.id)
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
    mutationFn: async (params: { id: string; conceptId: string }): Promise<void> => {
      const { error } = await supabase
        .from('lesson_sections')
        .delete()
        .eq('id', params.id);

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

export function useReorderSections() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { conceptId: string; sections: { id: string; order_index: number }[] }): Promise<void> => {
      for (const s of params.sections) {
        const { error } = await supabase
          .from('lesson_sections')
          .update({ order_index: s.order_index })
          .eq('id', s.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', params.conceptId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ BLOCS (CONTENU DANS LES SECTIONS) ============

export function useCreateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { sectionId: string; conceptId: string; data: BlockFormData }): Promise<SectionBlock> => {
      const { data: block, error } = await supabase
        .from('section_blocks')
        .insert([{ section_id: params.sectionId, ...params.data }])
        .select()
        .single();

      if (error) throw error;
      return block;
    },
    onSuccess: (_, { conceptId }) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', conceptId] });
      toast.success('Bloc ajouté');
    },
    onError: (error: Error) => {
      if (error.message.includes('Maximum')) {
        toast.error('Maximum 6 blocs par section atteint');
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; conceptId: string; data: Partial<BlockFormData> }): Promise<SectionBlock> => {
      const { data: block, error } = await supabase
        .from('section_blocks')
        .update(params.data)
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return block;
    },
    onSuccess: (updatedBlock, variables) => {
      // Mise à jour optimiste du cache sans refetch (évite de perdre le curseur)
      queryClient.setQueryData(
        ['concepts', 'detail', variables.conceptId],
        (oldData: ConceptWithSections | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            sections: oldData.sections?.map(section => ({
              ...section,
              blocks: section.blocks?.map(block =>
                block.id === variables.id ? { ...block, ...updatedBlock } : block
              ),
            })),
          };
        }
      );
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; conceptId: string }): Promise<void> => {
      const { error } = await supabase
        .from('section_blocks')
        .delete()
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', variables.conceptId] });
      toast.success('Bloc supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useReorderBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { conceptId: string; blocks: { id: string; order_index: number }[] }): Promise<void> => {
      for (const b of params.blocks) {
        const { error } = await supabase
          .from('section_blocks')
          .update({ order_index: b.order_index })
          .eq('id', b.id);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { conceptId }) => {
      queryClient.invalidateQueries({ queryKey: ['concepts', 'detail', conceptId] });
      toast.success('Ordre mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}