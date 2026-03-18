export interface UserProfile {
  id: string;
  username: string | null;
  avatar_url?: string | null;
  role?: string;
  reliability_score?: number;
  is_banned?: boolean;
  is_certified?: boolean;
  created_at?: string;
  // Present when sorted by contributions or dons
  score?: number;
  donations_pts?: number;
}

export type UserSortBy = 'date' | 'fiabilite' | 'contributions' | 'dons';
export type UserSortDir = 'asc' | 'desc';

export interface UsersFilters {
  search?: string;
  sortBy?: UserSortBy;
  sortDir?: UserSortDir;
}

export interface UserContributions {
  events_organized: number;
  events_participated: number;
  quizzes_created: number;
  matches_played: number;
  polls_answered: number;
  monthly_logins: number;
  donations_pts: number;
  score: number;
}

export interface UserAchievement {
  id: string;
  achievement_type: string;
  tier: number;
}
