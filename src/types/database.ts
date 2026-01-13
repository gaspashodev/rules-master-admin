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
  cover_image_url: string | null;
  affiliate_url: string | null;
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
  estimated_time: number;
  introduction: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface ConceptWithSections extends Concept {
  sections: LessonSection[];
}

// ============ NOUVELLE ARCHITECTURE SECTION/BLOCS ============

export interface LessonSection {
  id: string;
  concept_id: string;
  order_index: number;
  title: string | null;
  created_at: string;
  // Blocs chargés via jointure
  blocks?: SectionBlock[];
}

export type BlockType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'tip' 
  | 'example'
  | 'quote'
  | 'info_bar'
  | 'list_items'
  | 'floating_image'
  | 'heading';

export interface SectionBlock {
  id: string;
  section_id: string;
  block_type: BlockType;
  order_index: number;
  content: string; // Texte simple ou JSON stringifié pour les types complexes
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
  created_at: string;
}

// ============ TYPES DE CONTENU STRUCTURÉ POUR LES BLOCS ============

// Pour block_type: 'info_bar'
export interface InfoBarItem {
  label: string;      // ex: "Durée", "Joueurs", "Âge"
  value: string;      // ex: "30 min", "2-4", "10+"
  icon?: string;      // Emoji optionnel (ex: "⏱", "👥", "🎂")
}

export interface InfoBarContent {
  items: InfoBarItem[];
}

// Pour block_type: 'list_items'
export interface ListItem {
  icon?: string;      // Emoji ou nom d'icône
  color?: 'yellow' | 'blue' | 'green' | 'purple' | 'red';
  name: string;
  description?: string;
  badge?: string;     // ex: "3=", "4≠", "5"
}

export interface ListItemsContent {
  title?: string;     // Titre au-dessus de la liste (avec emoji optionnel)
  items: ListItem[];
}

// Pour block_type: 'floating_image'
// L'URL de l'image est stockée dans image_url (pas dans le JSON)
export interface FloatingImageContent {
  position: 'bottom-right' | 'bottom-left';
  height: number;     // Hauteur en % de l'écran
}

// Pour block_type: 'heading'
export interface HeadingContent {
  text: string;
  emoji?: string;
}

// Pour block_type: 'quote'
export interface QuoteContent {
  text: string;
}

// ============ FIN NOUVELLE ARCHITECTURE ============

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
  image_url: string | null;
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
  cover_image_url: string | null;
  affiliate_url: string | null;
  published: boolean;
  featured: boolean;
}

export interface ConceptFormData {
  name: string;
  description: string;
  order_index: number;
  estimated_time: number;
  introduction: string;
  summary: string;
}

// ============ NOUVEAUX FORM DATA POUR SECTIONS/BLOCS ============

export interface SectionFormData {
  order_index: number;
  title: string | null;
}

export interface BlockFormData {
  block_type: BlockType;
  order_index: number;
  content: string;
  image_url: string | null;
  video_url: string | null;
  alt_text: string | null;
}

// ============ FIN NOUVEAUX FORM DATA ============

export interface QuizQuestionFormData {
  question: string;
  options: QuizOption[];
  correct_answer_id: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  order_index: number;
  image_url: string | null;
}

// ============ VIDEO RESOURCES ============

export interface VideoResource {
  id: string;
  game_id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail_url: string | null;
  duration: number; // Durée en minutes
  language: string;
  order_index: number;
  created_at: string;
}

export interface VideoResourceFormData {
  title: string;
  channel: string;
  url: string;
  thumbnail_url: string | null;
  duration: number; // Durée en minutes
  language: string;
  order_index: number;
}

// ============ GAME RULES (PDF) ============

export interface GameRule {
  id: string;
  game_id: string;
  title: string;
  pdf_url: string;
  language: string;
  order_index: number;
  created_at: string;
}

export interface GameRuleFormData {
  title: string;
  pdf_url: string;
  language: string;
  order_index: number;
}

// ============ GAME BARCODES ============

export interface GameBarcode {
  id: string;
  game_id: string;
  barcode: string;
  edition: string | null;
  created_at: string;
}

export interface GameBarcodeFormData {
  barcode: string;
  edition: string | null;
}