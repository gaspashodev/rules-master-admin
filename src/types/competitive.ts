export type MatchType = '1v1' | 'ffa' | 'teams';
export type MatchStatus = 'lobby' | 'in_progress' | 'completed' | 'cancelled';
export type ParticipantRole = 'player' | 'referee';

export interface CompetitiveMatch {
  id: string;
  city_id: string | null;
  creator_id: string;
  game_id: string;
  join_code: string;
  match_type: MatchType;
  has_referee: boolean;
  status: MatchStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  results_declared_by: string | null;
  results_pending_confirmation: boolean;
  is_draw: boolean;
  season_id: string | null;
  created_at: string;
  // Joined relations
  city?: { id: string; name: string } | null;
  game?: {
    bgg_id: number;
    name: string;
    name_fr: string | null;
    image_url: string | null;
  } | null;
  creator?: {
    username: string | null;
  } | null;
  participants_count?: number;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  user_id: string;
  role: ParticipantRole;
  team_id: number | null;
  placement: number | null;
  elo_before: number | null;
  elo_after: number | null;
  elo_change: number | null;
  result_confirmed: boolean | null;
  cancel_vote: boolean | null;
  profile?: {
    username: string | null;
  } | null;
}

export interface CompetitiveMatchesFilters {
  status?: MatchStatus | 'all';
  city_id?: string | 'all';
  match_type?: MatchType | 'all';
  page?: number;
  pageSize?: number;
}

export const MATCH_STATUS_CONFIG: Record<MatchStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  lobby: { label: 'Lobby', variant: 'secondary' },
  in_progress: { label: 'En cours', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'success' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
};

export const MATCH_TYPE_CONFIG: Record<MatchType, { label: string }> = {
  '1v1': { label: '1V1' },
  ffa: { label: 'FFA' },
  teams: { label: 'Équipes' },
};
