import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  BggQuizQuestion,
  BggQuizFlagged,
  BggAward,
  FlagStatus,
  FlagReason,
  FlaggedQuestionFilters,
  FlaggedQuestionsStats,
  BggQuestionFilters,
  BggQuestionsStats,
  BggQuestionFormData,
  BggAwardFormData,
  QuestionTemplate,
} from '@/types/bgg-quiz';
import { toast } from 'sonner';

// ============ BGG API FETCH ============

interface FetchBggDataParams {
  useHotList?: boolean;
  ids?: number[];
}

interface FetchBggDataResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
}

export function useFetchBggData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchBggDataParams): Promise<FetchBggDataResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-bgg-data', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['bgg-games-cache'] });
      const messages: string[] = [];
      if (result.inserted > 0) messages.push(`${result.inserted} jeu(x) ajouté(s)`);
      if (result.updated > 0) messages.push(`${result.updated} jeu(x) mis à jour`);
      if (messages.length > 0) {
        toast.success(messages.join(', '));
      } else {
        toast.info('Aucun changement');
      }
      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} erreur(s) rencontrée(s)`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ BGG GAMES CACHE (Search) ============

export interface BggGameCache {
  id: string; // UUID
  bgg_id: number;
  name: string;
  thumbnail: string | null;
  image: string | null;
}

export interface BggGameCacheFull {
  id: string; // UUID
  bgg_id: number;
  name: string;
  name_fr: string | null;
  year_published: number | null;
  image_url: string | null;
  descriptions: string[] | null;
  designers: string[] | null;
  rating: number | null;
  rank: number | null;
  weight: number | null;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
  quiz_enabled: boolean;
  crown_enabled: boolean;
  crown_modes: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface BggGamesFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'created_at' | 'rating' | 'rank';
  sortOrder?: 'asc' | 'desc';
  crownOnly?: boolean;
}

export function useBggGames(filters?: BggGamesFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const search = filters?.search || '';
  const sortBy = filters?.sortBy || 'name';
  const sortOrder = filters?.sortOrder || 'asc';
  const crownOnly = filters?.crownOnly || false;

  return useQuery({
    queryKey: ['bgg-games-cache', 'list', { page, pageSize, search, sortBy, sortOrder, crownOnly }],
    queryFn: async (): Promise<{ data: BggGameCacheFull[]; count: number }> => {
      let query = supabase
        .from('bgg_games_cache')
        .select('*', { count: 'exact' });

      if (search && search.length >= 2) {
        query = query.or(`name.ilike.%${search}%,name_fr.ilike.%${search}%`);
      }

      if (crownOnly) {
        query = query.eq('crown_enabled', true);
      }

      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });
}

export function useBggGame(bggId: number | undefined) {
  return useQuery({
    queryKey: ['bgg-games-cache', 'detail', bggId],
    queryFn: async (): Promise<BggGameCacheFull | null> => {
      if (!bggId) return null;

      const { data, error } = await supabase
        .from('bgg_games_cache')
        .select('*')
        .eq('bgg_id', bggId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!bggId,
  });
}

export function useUpdateBggGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bggId, data }: { bggId: number; data: Partial<BggGameCacheInsert> }): Promise<void> => {
      // Remove undefined values to avoid issues
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );

      const { error } = await supabase
        .from('bgg_games_cache')
        .update(cleanData)
        .eq('bgg_id', bggId);

      if (error) throw error;
    },
    onSuccess: (_, { bggId }) => {
      queryClient.invalidateQueries({ queryKey: ['bgg-games-cache'] });
      queryClient.invalidateQueries({ queryKey: ['bgg-games-cache', 'detail', bggId] });
      toast.success('Jeu mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteBggGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bggId: number): Promise<void> => {
      const { error } = await supabase
        .from('bgg_games_cache')
        .delete()
        .eq('bgg_id', bggId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-games-cache'] });
      toast.success('Jeu supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ DESCRIPTION GENERATION ============

interface GenerateDescriptionParams {
  bggId: number;
  gameName: string;
  type: 1 | 2;
}

interface GenerateDescriptionResult {
  description: string;
}

export function useRegenerateDescription() {
  return useMutation({
    mutationFn: async (params: GenerateDescriptionParams): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('generate-bgg-description', {
        body: {
          bgg_id: params.bggId,
          game_name: params.gameName,
          type: params.type,
        },
      });

      if (error) throw error;
      return (data as GenerateDescriptionResult).description;
    },
    onError: (error: Error) => {
      toast.error(`Erreur de génération: ${error.message}`);
    },
  });
}

export function useSearchBggGames(searchTerm: string) {
  return useQuery({
    queryKey: ['bgg-games-cache', 'search', searchTerm],
    queryFn: async (): Promise<BggGameCache[]> => {
      if (!searchTerm || searchTerm.length < 3) return [];

      const { data, error } = await supabase
        .from('bgg_games_cache')
        .select('id, bgg_id, name, name_fr, image_url')
        .or(`name.ilike.%${searchTerm}%,name_fr.ilike.%${searchTerm}%`)
        .order('name')
        .limit(20);

      if (error) throw error;
      // Map to expected interface
      return (data || []).map(game => ({
        id: game.id,
        bgg_id: game.bgg_id,
        name: game.name,
        thumbnail: game.image_url,
        image: game.image_url,
      }));
    },
    enabled: searchTerm.length >= 3,
    staleTime: 60000, // Cache for 1 minute
  });
}

// Fetch random games to use as wrong options
export async function fetchRandomGames(
  excludeIds: number[],
  count: number = 3
): Promise<BggGameCache[]> {
  // Get total count first
  const { count: totalCount } = await supabase
    .from('bgg_games_cache')
    .select('*', { count: 'exact', head: true });

  if (!totalCount || totalCount === 0) return [];

  // Get random offset
  const games: BggGameCache[] = [];
  const usedIds = new Set(excludeIds);

  // Fetch more than needed to account for exclusions
  const { data, error } = await supabase
    .from('bgg_games_cache')
    .select('id, bgg_id, name, image_url')
    .not('bgg_id', 'in', `(${excludeIds.join(',')})`)
    .limit(count * 3);

  if (error || !data) return [];

  // Shuffle and pick random ones
  const shuffled = data.sort(() => Math.random() - 0.5);

  for (const item of shuffled) {
    if (!usedIds.has(item.bgg_id) && games.length < count) {
      games.push({
        id: item.id,
        bgg_id: item.bgg_id,
        name: item.name,
        thumbnail: item.image_url,
        image: item.image_url,
      });
      usedIds.add(item.bgg_id);
    }
  }

  return games;
}

export interface BggGameCacheInsert {
  bgg_id: number;
  name: string;
  name_fr?: string | null;
  year_published?: number | null;
  image_url?: string | null;
  descriptions?: string[] | null;
  designers?: string[] | null;
  rating?: number | null;
  rank?: number | null;
  weight?: number | null;
  min_players?: number | null;
  max_players?: number | null;
  min_playtime?: number | null;
  max_playtime?: number | null;
  quiz_enabled?: boolean;
  crown_enabled?: boolean;
  crown_modes?: string[] | null;
}

export function useCreateBggGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BggGameCacheInsert): Promise<BggGameCache> => {
      const { data: game, error } = await supabase
        .from('bgg_games_cache')
        .insert([data])
        .select('id, bgg_id, name, image_url')
        .single();

      if (error) throw error;
      return {
        id: game.id,
        bgg_id: game.bgg_id,
        name: game.name,
        thumbnail: game.image_url,
        image: game.image_url,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-games-cache'] });
      toast.success('Jeu ajouté à la base');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ FLAGGED QUESTIONS ============

export function useFlaggedQuestions(filters?: FlaggedQuestionFilters) {
  return useQuery({
    queryKey: ['bgg-quiz', 'flagged', filters],
    queryFn: async (): Promise<BggQuizFlagged[]> => {
      let query = supabase
        .from('bgg_quiz_flagged')
        .select(`
          *,
          question:bgg_quiz_questions(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.reason && filters.reason !== 'all') {
        query = query.eq('reason', filters.reason);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

export function useFlaggedQuestionsStats() {
  return useQuery({
    queryKey: ['bgg-quiz', 'flagged', 'stats'],
    queryFn: async (): Promise<FlaggedQuestionsStats> => {
      const { data, error } = await supabase
        .from('bgg_quiz_flagged')
        .select('status, reason');

      if (error) throw error;

      const stats: FlaggedQuestionsStats = {
        total: data?.length || 0,
        byStatus: { pending: 0, reviewed: 0, fixed: 0, dismissed: 0 },
        byReason: { incorrect: 0, unclear: 0, offensive: 0, duplicate: 0 },
      };

      data?.forEach((item) => {
        if (item.status in stats.byStatus) {
          stats.byStatus[item.status as FlagStatus]++;
        }
        if (item.reason in stats.byReason) {
          stats.byReason[item.reason as FlagReason]++;
        }
      });

      return stats;
    },
  });
}

export function useUpdateFlagStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FlagStatus }): Promise<void> => {
      const updateData: { status: FlagStatus; reviewed_at?: string } = { status };

      if (status !== 'pending') {
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bgg_quiz_flagged')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'flagged'] });
      toast.success('Statut mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteFlaggedQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('bgg_quiz_flagged')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'flagged'] });
      toast.success('Signalement supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ BGG QUIZ QUESTIONS ============

export function useBggQuestions(filters?: BggQuestionFilters) {
  return useQuery({
    queryKey: ['bgg-quiz', 'questions', filters],
    queryFn: async (): Promise<BggQuizQuestion[]> => {
      let query = supabase
        .from('bgg_quiz_questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters?.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
      }
      if (filters?.is_manual !== undefined && filters.is_manual !== 'all') {
        query = query.eq('is_manual', filters.is_manual);
      }
      if (filters?.is_active !== undefined && filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
}

export function useBggQuestion(id: string | undefined) {
  return useQuery({
    queryKey: ['bgg-quiz', 'questions', id],
    queryFn: async (): Promise<BggQuizQuestion | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('bgg_quiz_questions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useBggQuestionsStats() {
  return useQuery({
    queryKey: ['bgg-quiz', 'questions', 'stats'],
    queryFn: async (): Promise<BggQuestionsStats> => {
      const { data, error } = await supabase
        .from('bgg_quiz_questions')
        .select('is_manual, is_active');

      if (error) throw error;

      const stats: BggQuestionsStats = {
        total: data?.length || 0,
        manual: 0,
        auto: 0,
        active: 0,
        inactive: 0,
      };

      data?.forEach((item) => {
        if (item.is_manual) stats.manual++;
        else stats.auto++;
        if (item.is_active) stats.active++;
        else stats.inactive++;
      });

      return stats;
    },
  });
}

export function useCreateBggQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BggQuestionFormData): Promise<BggQuizQuestion> => {
      const { data: question, error } = await supabase
        .from('bgg_quiz_questions')
        .insert([{
          ...data,
          is_manual: true,
          times_used: 0,
          times_correct: 0,
          times_incorrect: 0,
        }])
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'questions'] });
      toast.success('Question créée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateBggQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BggQuestionFormData> }): Promise<BggQuizQuestion> => {
      const { data: question, error } = await supabase
        .from('bgg_quiz_questions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return question;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'questions'] });
      toast.success('Question mise à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useToggleBggQuestionActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }): Promise<void> => {
      const { error } = await supabase
        .from('bgg_quiz_questions')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { is_active }) => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'questions'] });
      toast.success(is_active ? 'Question activée' : 'Question désactivée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteBggQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('bgg_quiz_questions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'questions'] });
      toast.success('Question supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ BGG AWARDS ============

export function useBggAwards() {
  return useQuery({
    queryKey: ['bgg-quiz', 'awards'],
    queryFn: async (): Promise<BggAward[]> => {
      const { data, error } = await supabase
        .from('bgg_awards')
        .select(`
          *,
          game:bgg_games_cache!game_id(bgg_id, name, name_fr)
        `)
        .order('year', { ascending: false })
        .order('award', { ascending: true })
        .order('category', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateBggAward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BggAwardFormData): Promise<BggAward> => {
      const { data: award, error } = await supabase
        .from('bgg_awards')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return award;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'awards'] });
      toast.success('Prix ajouté');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateBggAward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BggAwardFormData> }): Promise<BggAward> => {
      const { data: award, error } = await supabase
        .from('bgg_awards')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return award;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'awards'] });
      toast.success('Prix mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteBggAward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('bgg_awards')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'awards'] });
      toast.success('Prix supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// ============ QUESTION TEMPLATES ============

export function useQuestionTemplates() {
  return useQuery({
    queryKey: ['bgg-quiz', 'question-templates'],
    queryFn: async (): Promise<QuestionTemplate[]> => {
      const { data, error } = await supabase
        .from('bgg_quiz_question_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateQuestionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (question: string): Promise<QuestionTemplate> => {
      const { data, error } = await supabase
        .from('bgg_quiz_question_templates')
        .insert([{ question }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'question-templates'] });
      toast.success('Question enregistrée');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Cette question existe déjà');
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    },
  });
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.rpc('increment_template_usage', { template_id: id });
      if (error) {
        // Fallback if RPC doesn't exist - manual increment
        const { data: current } = await supabase
          .from('bgg_quiz_question_templates')
          .select('usage_count')
          .eq('id', id)
          .single();

        if (current) {
          await supabase
            .from('bgg_quiz_question_templates')
            .update({ usage_count: (current.usage_count || 0) + 1 })
            .eq('id', id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'question-templates'] });
    },
  });
}

export function useDeleteQuestionTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('bgg_quiz_question_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bgg-quiz', 'question-templates'] });
      toast.success('Question supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
