export interface UserProfile {
  id: string;
  username: string | null;
  role: string;
  reliability_score: number;
  is_banned: boolean;
  is_certified: boolean;
  created_at: string;
}

export interface UsersFilters {
  search?: string;
}
