// ============ FEATURED QUIZZES ============

export type FeaturedQuizStatus = 'pending' | 'approved' | 'rejected';
export type FeaturedQuizMode = 'classique' | 'expert';

// Question format mode classique (QCM — 4 choix)
export interface ClassiqueQuestion {
  type: string;
  question: string;
  options: { name: string }[];
  correct_index: number;
  image_url?: string | null;
  explanation?: string;
  is_manual: boolean;
}

// Question format mode expert (texte libre)
export interface ExpertQuestion {
  type: string;
  question: string;
  options: [];
  correct_index: number;
  correct_answer: string;
  correct_answer_fr?: string;
  alternative_answers?: string[];
  image_url?: string | null;
  explanation?: string;
  is_manual: boolean;
}

export type FeaturedQuizQuestion = ClassiqueQuestion | ExpertQuestion;

export interface FeaturedQuiz {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  mode: FeaturedQuizMode;
  timer_seconds: number;
  questions_data: FeaturedQuizQuestion[];
  question_count: number;
  is_active: boolean;
  is_featured: boolean;
  status: FeaturedQuizStatus;
  average_rating: number | null;
  rating_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Join
  profile?: { username: string | null } | null;
}

export interface FeaturedQuizFilters {
  status?: FeaturedQuizStatus | 'all';
  search?: string;
  is_featured?: boolean;
  category?: string;
}

export interface FeaturedQuizFormData {
  title: string;
  description: string;
  image_url: string;
  category: string;
  mode: FeaturedQuizMode;
  timer_seconds: number;
  questions_data: FeaturedQuizQuestion[];
  is_active: boolean;
  is_featured: boolean;
}

// ============ CATEGORIES ============

export const QUIZ_CATEGORIES = [
  'Jeux de société',
  'TCG',
  'Manga',
  'Cinéma',
  'Sport',
  'Histoire',
  'Sciences',
  'Musique',
  'Jeux vidéo',
  'Culture générale',
  'Autre',
] as const;

// ============ HELPERS ============

export const QUIZ_MODE_CONFIG: Record<FeaturedQuizMode, { label: string }> = {
  classique: { label: 'Classique (QCM)' },
  expert: { label: 'Expert (texte libre)' },
};

export const QUIZ_STATUS_CONFIG: Record<FeaturedQuizStatus, { label: string; variant: 'default' | 'outline' | 'destructive' }> = {
  pending: { label: 'En attente', variant: 'outline' },
  approved: { label: 'Approuvé', variant: 'default' },
  rejected: { label: 'Rejeté', variant: 'destructive' },
};
