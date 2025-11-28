// Types basés sur le schéma Supabase

export interface Game {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  player_count_min: number;
  player_count_max: number;
  play_time_min: number;
  play_time_max: number;
  min_age: number;
  bgg_rating: number | null;
  bgg_url: string | null;
  rules_pdf_url: string | null;
  cover_image_url: string | null;
  published: boolean;
  featured: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface GameWithStats extends Game {
  concept_count: number;
  quiz_count: number;
  video_count: number;
}

export interface Concept {
  id: string;
  game_id: string;
  name: string;
  description: string;
  order_index: number;
  difficulty: 1 | 2 | 3;
  estimated_time: number;
  introduction: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptWithSections extends Concept {
  sections: LessonSection[];
}

export interface LessonSection {
  id: string;
  concept_id: string;
  section_type: 'text' | 'image' | 'video' | 'tip' | 'example';
  order_index: number;
  title: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
  created_at: string;
}

export interface Quiz {
  id: string;
  concept_id: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  order_index: number;
  question: string;
  options: QuizOption[];
  correct_answer_id: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  created_at: string;
}

export interface QuizOption {
  id: string;
  text: string;
}

// Form types
export interface GameFormData {
  slug: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'expert';
  player_count_min: number;
  player_count_max: number;
  play_time_min: number;
  play_time_max: number;
  min_age: number;
  bgg_rating: number | null;
  bgg_url: string | null;
  rules_pdf_url: string | null;
  cover_image_url: string | null;
  published: boolean;
  featured: boolean;
}

export interface ConceptFormData {
  name: string;
  description: string;
  order_index: number;
  difficulty: 1 | 2 | 3;
  estimated_time: number;
  introduction: string;
  summary: string;
}

export interface SectionFormData {
  section_type: 'text' | 'image' | 'video' | 'tip' | 'example';
  order_index: number;
  title: string | null;
  content: string;
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
}

export interface QuizQuestionFormData {
  question: string;
  options: QuizOption[];
  correct_answer_id: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}