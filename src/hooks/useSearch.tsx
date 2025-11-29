import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface SearchResult {
  id: string;
  type: 'game' | 'concept' | 'section';
  title: string;
  subtitle: string;
  url: string;
  gameId?: string;
  conceptId?: string;
}

async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const searchTerm = `%${query}%`;
  const results: SearchResult[] = [];

  // Search games
  const { data: games } = await supabase
    .from('games')
    .select('id, name, description, slug')
    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(5);

  if (games) {
    results.push(
      ...games.map((game) => ({
        id: game.id,
        type: 'game' as const,
        title: game.name,
        subtitle: game.description?.substring(0, 60) || 'Jeu de société',
        url: `/games/${game.id}`,
      }))
    );
  }

  // Search concepts
  const { data: concepts } = await supabase
    .from('concepts')
    .select('id, name, description, game_id')
    .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
    .limit(5);

  if (concepts) {
    results.push(
      ...concepts.map((concept) => ({
        id: concept.id,
        type: 'concept' as const,
        title: concept.name,
        subtitle: concept.description?.substring(0, 60) || 'Concept',
        url: `/concepts/${concept.id}`,
        gameId: concept.game_id,
      }))
    );
  }

  // Search sections
  const { data: sections } = await supabase
    .from('lesson_sections')
    .select('id, title, content, concept_id')
    .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
    .limit(5);

  if (sections) {
    results.push(
      ...sections.map((section) => ({
        id: section.id,
        type: 'section' as const,
        title: section.title || 'Section',
        subtitle: section.content?.substring(0, 60) + '...' || '',
        url: `/concepts/${section.concept_id}`,
        conceptId: section.concept_id,
      }))
    );
  }

  return results;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchAll(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
}