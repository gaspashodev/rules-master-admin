export interface UserProfile {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
  reliability_score: number;
  is_banned: boolean;
  created_at: string;
}

export interface UsersFilters {
  search?: string;
}
