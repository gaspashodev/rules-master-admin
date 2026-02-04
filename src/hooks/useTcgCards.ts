import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  TcgCard,
  TcgCardsFilters,
  TcgCardsStats,
  TcgType,
  FetchPokemonCardsParams,
  FetchPokemonCardsResult,
  PokemonSet,
  FetchYugiohCardsParams,
  FetchYugiohCardsResult,
  YugiohSet,
  FetchLorcanaCardsParams,
  FetchLorcanaCardsResult,
  LorcanaSet,
  FetchMagicCardsParams,
  FetchMagicCardsResult,
  MagicSet,
} from '@/types/tcg';
import { toast } from 'sonner';

// ============ FETCH FROM API ============

export function useFetchPokemonCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchPokemonCardsParams): Promise<FetchPokemonCardsResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-pokemon-cards', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tcg-cards'] });
      const messages: string[] = [];
      if (result.inserted > 0) messages.push(`${result.inserted} carte(s) ajoutée(s)`);
      if (result.updated > 0) messages.push(`${result.updated} carte(s) mise(s) à jour`);
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

// ============ POKEMON SETS (from API directly) ============

export function usePokemonSets() {
  return useQuery({
    queryKey: ['pokemon-sets'],
    queryFn: async (): Promise<PokemonSet[]> => {
      const response = await fetch('https://api.pokemontcg.io/v2/sets?orderBy=-releaseDate');
      if (!response.ok) throw new Error('Failed to fetch Pokemon sets');
      const data = await response.json();
      return data.data || [];
    },
    staleTime: 1000 * 60 * 60, // Cache 1 hour
  });
}

// ============ YU-GI-OH ============

export function useFetchYugiohCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchYugiohCardsParams): Promise<FetchYugiohCardsResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-yugioh-cards', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tcg-cards'] });
      const messages: string[] = [];
      if (result.inserted > 0) messages.push(`${result.inserted} carte(s) ajoutée(s)`);
      if (result.updated > 0) messages.push(`${result.updated} carte(s) mise(s) à jour`);
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

export function useYugiohSets() {
  return useQuery({
    queryKey: ['yugioh-sets'],
    queryFn: async (): Promise<YugiohSet[]> => {
      const response = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php');
      if (!response.ok) throw new Error('Failed to fetch Yu-Gi-Oh sets');
      const data = await response.json();
      // Sort by date descending
      return (data || []).sort((a: YugiohSet, b: YugiohSet) => {
        const dateA = a.tcg_date ? new Date(a.tcg_date).getTime() : 0;
        const dateB = b.tcg_date ? new Date(b.tcg_date).getTime() : 0;
        return dateB - dateA;
      });
    },
    staleTime: 1000 * 60 * 60,
  });
}

// ============ LORCANA ============

export function useFetchLorcanaCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchLorcanaCardsParams): Promise<FetchLorcanaCardsResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-lorcana-cards', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tcg-cards'] });
      const messages: string[] = [];
      if (result.inserted > 0) messages.push(`${result.inserted} carte(s) ajoutée(s)`);
      if (result.updated > 0) messages.push(`${result.updated} carte(s) mise(s) à jour`);
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

export function useLorcanaSets() {
  return useQuery({
    queryKey: ['lorcana-sets'],
    queryFn: async (): Promise<LorcanaSet[]> => {
      const response = await fetch('https://api.lorcana-api.com/sets/all');
      if (!response.ok) throw new Error('Failed to fetch Lorcana sets');
      const data = await response.json();
      // Sort by release date descending (newest first)
      return (data || []).sort((a: LorcanaSet, b: LorcanaSet) => {
        return new Date(b.Release_Date).getTime() - new Date(a.Release_Date).getTime();
      });
    },
    staleTime: 1000 * 60 * 60,
  });
}

// ============ MAGIC ============

export function useFetchMagicCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: FetchMagicCardsParams): Promise<FetchMagicCardsResult> => {
      const { data, error } = await supabase.functions.invoke('fetch-magic-cards', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['tcg-cards'] });
      const messages: string[] = [];
      if (result.inserted > 0) messages.push(`${result.inserted} carte(s) ajoutée(s)`);
      if (result.updated > 0) messages.push(`${result.updated} carte(s) mise(s) à jour`);
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

export function useMagicSets() {
  return useQuery({
    queryKey: ['magic-sets'],
    queryFn: async (): Promise<MagicSet[]> => {
      const response = await fetch('https://api.scryfall.com/sets');
      if (!response.ok) throw new Error('Failed to fetch Magic sets');
      const data = await response.json();
      // Filter to only include meaningful set types and sort by date
      const sets = (data.data || [])
        .filter((set: MagicSet) =>
          ['core', 'expansion', 'masters', 'draft_innovation', 'commander'].includes(set.set_type)
        )
        .sort((a: MagicSet, b: MagicSet) => {
          const dateA = new Date(a.released_at).getTime();
          const dateB = new Date(b.released_at).getTime();
          return dateB - dateA;
        });
      return sets;
    },
    staleTime: 1000 * 60 * 60,
  });
}

// ============ TCG CARDS FROM DB ============

export function useTcgCards(filters?: TcgCardsFilters) {
  const page = filters?.page || 0;
  const pageSize = filters?.pageSize || 50;
  const search = filters?.search || '';
  const tcgType = filters?.tcg_type || 'pokemon';
  const setName = filters?.set_name || '';
  const rarity = filters?.rarity || '';
  const sortBy = filters?.sortBy || 'name';
  const sortOrder = filters?.sortOrder || 'asc';

  return useQuery({
    queryKey: ['tcg-cards', 'list', { page, pageSize, search, tcgType, setName, rarity, sortBy, sortOrder }],
    queryFn: async (): Promise<{ data: TcgCard[]; count: number }> => {
      let query = supabase
        .from('tcg_cards_cache')
        .select('*', { count: 'exact' })
        .eq('tcg_type', tcgType);

      if (search && search.length >= 2) {
        query = query.ilike('name', `%${search}%`);
      }

      if (setName) {
        query = query.eq('set_name', setName);
      }

      if (rarity) {
        query = query.eq('rarity', rarity);
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

export function useTcgCard(id: string | undefined) {
  return useQuery({
    queryKey: ['tcg-cards', 'detail', id],
    queryFn: async (): Promise<TcgCard | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('tcg_cards_cache')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useTcgCardsStats(tcgType: TcgType = 'pokemon') {
  return useQuery({
    queryKey: ['tcg-cards', 'stats', tcgType],
    queryFn: async (): Promise<TcgCardsStats> => {
      // Get total count
      const { count: total } = await supabase
        .from('tcg_cards_cache')
        .select('*', { count: 'exact', head: true })
        .eq('tcg_type', tcgType);

      // Get count by set
      const { data: setData } = await supabase
        .from('tcg_cards_cache')
        .select('set_name')
        .eq('tcg_type', tcgType);

      const bySet: Record<string, number> = {};
      setData?.forEach((item) => {
        const setName = item.set_name || 'Unknown';
        bySet[setName] = (bySet[setName] || 0) + 1;
      });

      // Get count by type (all tcg types)
      const { data: typeData } = await supabase
        .from('tcg_cards_cache')
        .select('tcg_type');

      const byType: Record<TcgType, number> = {
        pokemon: 0,
        yugioh: 0,
        lorcana: 0,
        fab: 0,
        magic: 0,
      };
      typeData?.forEach((item) => {
        const type = item.tcg_type as TcgType;
        if (type in byType) {
          byType[type]++;
        }
      });

      return {
        total: total || 0,
        byType,
        bySet,
      };
    },
  });
}

export function useDeleteTcgCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase
        .from('tcg_cards_cache')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tcg-cards'] });
      toast.success('Carte supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Get unique sets from DB
export function useTcgSetsFromDb(tcgType: TcgType = 'pokemon') {
  return useQuery({
    queryKey: ['tcg-cards', 'sets', tcgType],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('tcg_cards_cache')
        .select('set_name')
        .eq('tcg_type', tcgType)
        .not('set_name', 'is', null);

      if (error) throw error;

      // Get unique set names
      const sets = [...new Set(data?.map((d) => d.set_name).filter(Boolean) as string[])];
      return sets.sort();
    },
  });
}

// Get imported sets with card count (by set_id)
export interface ImportedSetInfo {
  set_id: string;
  set_name: string;
  count: number;
}

export function useImportedSets(tcgType: TcgType = 'pokemon') {
  return useQuery({
    queryKey: ['tcg-cards', 'imported-sets', tcgType],
    queryFn: async (): Promise<ImportedSetInfo[]> => {
      const { data, error } = await supabase
        .from('tcg_cards_cache')
        .select('set_id, set_name')
        .eq('tcg_type', tcgType)
        .not('set_id', 'is', null);

      if (error) throw error;

      // Count cards per set_id
      const setMap = new Map<string, { set_name: string; count: number }>();
      data?.forEach((card) => {
        if (card.set_id) {
          const existing = setMap.get(card.set_id);
          if (existing) {
            existing.count++;
          } else {
            setMap.set(card.set_id, { set_name: card.set_name || '', count: 1 });
          }
        }
      });

      return Array.from(setMap.entries()).map(([set_id, info]) => ({
        set_id,
        set_name: info.set_name,
        count: info.count,
      }));
    },
  });
}

// Get unique rarities from DB
export function useTcgRaritiesFromDb(tcgType: TcgType = 'pokemon') {
  return useQuery({
    queryKey: ['tcg-cards', 'rarities', tcgType],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('tcg_cards_cache')
        .select('rarity')
        .eq('tcg_type', tcgType)
        .not('rarity', 'is', null);

      if (error) throw error;

      // Get unique rarities
      const rarities = [...new Set(data?.map((d) => d.rarity).filter(Boolean) as string[])];
      return rarities.sort();
    },
  });
}
