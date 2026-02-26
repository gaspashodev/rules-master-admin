export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  is_free_text: boolean;
  position: number;
  vote_count: number;
  created_at: string;
}

export interface Poll {
  id: string;
  question: string;
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  options: PollOption[];
}

export interface PollFormData {
  question: string;
  is_active: boolean;
  ends_at: string;
  options: PollOptionFormData[];
}

export interface PollOptionFormData {
  label: string;
  is_free_text: boolean;
}

export interface PollFilters {
  search?: string;
  is_active?: boolean | 'all';
}
