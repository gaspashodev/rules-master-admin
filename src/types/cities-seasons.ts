export type SeasonStatus = 'active' | 'completed' | 'upcoming';

export interface City {
  id: string;
  name: string;
  force_active: boolean;
  created_at: string;
  eligible_players_count?: number;
}

export interface Season {
  id: string;
  season_number: number;
  starts_at: string;
  ends_at: string;
  status: SeasonStatus;
  created_at: string;
}

export const SEASON_STATUS_CONFIG: Record<SeasonStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  active: { label: 'Active', variant: 'success' },
  completed: { label: 'Terminée', variant: 'outline' },
  upcoming: { label: 'À venir', variant: 'secondary' },
};
