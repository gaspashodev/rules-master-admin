export const VALID_SIZES = [4, 8, 16, 32, 64, 128, 256] as const;
export type TournamentSize = (typeof VALID_SIZES)[number];

export interface TournamentGame {
  game_id: string | null;
  name: string;
  image_url: string | null;
  is_custom: boolean;
}

export interface TournamentTemplate {
  id: string;
  share_code: string;
  size: TournamentSize;
  all_games: TournamentGame[];
  created_by: string | null;
  created_at: string;
  // Editorial columns
  is_featured: boolean | null;
  custom_title: string | null;
  custom_image_url: string | null;
  custom_share_image_url: string | null;
  description: string | null;
  expires_at: string | null;
}

/** A tournament is a draft when all_games has fewer entries than size */
export function isDraft(template: TournamentTemplate): boolean {
  return template.all_games.length < template.size;
}

export interface TournamentTemplatesFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}
