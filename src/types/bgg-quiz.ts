// ============ BGG QUIZ QUESTIONS ============

export type BggQuestionType =
  | 'rating'
  | 'designer'
  | 'players'
  | 'complexity'
  | 'duration'
  | 'description'
  | 'photo'
  | 'award'
  | 'custom';

export type BggQuestionDifficulty = 'easy' | 'advanced';

export interface BggGameOption {
  bgg_id: number;
  name: string;
  image_url?: string;
}

// Structure question_data selon le brief
export interface RatingQuestionData {
  question: string;
  options: BggGameOption[];
  correct_index: number;
  explanation: string;
}

export interface DesignerQuestionData {
  question: string;
  game: BggGameOption;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface PlayersQuestionData {
  question: string;
  options: BggGameOption[];
  correct_index: number;
  explanation: string;
}

export interface ComplexityQuestionData {
  question: string;
  options: BggGameOption[];
  correct_index: number;
  explanation: string;
}

export interface DurationQuestionData {
  question: string;
  options: BggGameOption[];
  correct_index: number;
  explanation: string;
}

export interface DescriptionQuestionData {
  question: string;
  description: string;
  options: BggGameOption[];
  correct_index: number;
  explanation: string;
}

export interface PhotoQuestionData {
  question: string;
  image_url: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface AwardQuestionData {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface CustomQuestionData {
  question: string;
  correct_answer: BggGameOption;
  wrong_answers?: BggGameOption[]; // Optional - if not provided, will be random
  explanation: string;
  image_url?: string;
}

export type QuestionData =
  | RatingQuestionData
  | DesignerQuestionData
  | PlayersQuestionData
  | ComplexityQuestionData
  | DurationQuestionData
  | DescriptionQuestionData
  | PhotoQuestionData
  | AwardQuestionData
  | CustomQuestionData;

export interface BggQuizQuestion {
  id: string;
  type: BggQuestionType;
  question_data: QuestionData;
  is_active: boolean;
  times_used: number;
  times_correct: number;
  times_incorrect: number;
  created_by: string | null;
  created_at: string;
}

// ============ BGG AWARDS ============

export type AwardName = "As d'Or" | 'Spiel des Jahres';

// Catégories par prix
export type SpielDesJahresCategory = 'Spiel des Jahres' | 'Kennerspiel des Jahres' | 'Kinderspiel des Jahres';
export type AsDorCategory = 'Tout public' | 'Enfant' | 'Initié' | 'Expert';
export type AwardCategory = SpielDesJahresCategory | AsDorCategory;

export interface BggAward {
  id: string;
  award: AwardName;
  category: AwardCategory;
  year: number;
  game_id: string | null;
  created_at: string;
  // Joined from bgg_games_cache
  game?: {
    bgg_id: number;
    name: string;
    name_fr: string | null;
  } | null;
}

export interface BggAwardFormData {
  award: AwardName;
  category: AwardCategory;
  year: number;
  game_id: string | null;
}

// ============ BGG QUESTIONS FILTERS ============

export interface BggQuestionFilters {
  is_active?: boolean | 'all';
  has_photo?: boolean;
  search?: string;
}

export interface BggQuestionsStats {
  total: number;
  active: number;
  inactive: number;
}

// ============ FORM DATA ============

export interface BggQuestionFormData {
  type: BggQuestionType;
  question_data: QuestionData;
  is_active: boolean;
}

// ============ QUESTION TEMPLATES ============

export interface QuestionTemplate {
  id: string;
  question: string;
  usage_count: number;
  created_at: string;
}

// ============ CONFIG HELPERS ============

export const QUESTION_TYPE_CONFIG: Record<BggQuestionType, { label: string; icon: string }> = {
  rating: { label: 'Note', icon: 'Star' },
  designer: { label: 'Designer', icon: 'Palette' },
  players: { label: 'Joueurs', icon: 'Users' },
  complexity: { label: 'Complexité', icon: 'Puzzle' },
  duration: { label: 'Durée', icon: 'Clock' },
  description: { label: 'Description', icon: 'FileText' },
  photo: { label: 'Photo', icon: 'Image' },
  award: { label: 'Prix', icon: 'Trophy' },
  custom: { label: 'Personnalisé', icon: 'Edit' },
};

export const DIFFICULTY_CONFIG: Record<BggQuestionDifficulty, { label: string; color: string }> = {
  easy: { label: 'Facile', color: 'green' },
  advanced: { label: 'Avancé', color: 'orange' },
};

export const AWARD_NAMES: AwardName[] = ["As d'Or", 'Spiel des Jahres'];

export const SPIEL_DES_JAHRES_CATEGORIES: SpielDesJahresCategory[] = [
  'Spiel des Jahres',
  'Kennerspiel des Jahres',
  'Kinderspiel des Jahres',
];

export const AS_DOR_CATEGORIES: AsDorCategory[] = [
  'Tout public',
  'Enfant',
  'Initié',
  'Expert',
];

export const AWARD_CATEGORIES_BY_AWARD: Record<AwardName, AwardCategory[]> = {
  'Spiel des Jahres': SPIEL_DES_JAHRES_CATEGORIES,
  "As d'Or": AS_DOR_CATEGORIES,
};
