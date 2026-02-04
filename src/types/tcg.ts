// Types pour les cartes TCG (Pokemon, Yu-Gi-Oh, Lorcana, etc.)

export type TcgType = 'pokemon' | 'yugioh' | 'lorcana' | 'fab' | 'magic';

export interface TcgCard {
  id: string;
  external_id: string;
  tcg_type: TcgType;
  name: string;
  set_id: string | null;
  set_name: string | null;
  set_series: string | null;
  release_date: string | null;
  image_url: string | null;
  image_url_small: string | null;
  hp: number | null;
  types: string[] | null;
  subtypes: string[] | null;
  rarity: string | null;
  attacks: TcgAttack[] | null;
  abilities: TcgAbility[] | null;
  weaknesses: TcgWeakness[] | null;
  resistances: TcgResistance[] | null;
  retreat_cost: number | null;
  artist: string | null;
  flavor_text: string | null;
  national_pokedex_number: number | null;
  extra_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface TcgAttack {
  name: string;
  cost: string[];
  damage: string;
  text: string;
}

export interface TcgAbility {
  name: string;
  text: string;
  type: string;
}

export interface TcgWeakness {
  type: string;
  value: string;
}

export interface TcgResistance {
  type: string;
  value: string;
}

export interface TcgCardsFilters {
  tcg_type?: TcgType;
  search?: string;
  set_name?: string;
  rarity?: string;
  types?: string[];
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'release_date' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

export interface TcgCardsStats {
  total: number;
  byType: Record<TcgType, number>;
  bySet: Record<string, number>;
}

export interface FetchPokemonCardsParams {
  setId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface FetchPokemonCardsResult {
  success: boolean;
  total: number;
  page: number;
  pageSize: number;
  inserted: number;
  updated: number;
  errors: string[];
}

// Types pour les sets Pokemon
export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
  images: {
    symbol: string;
    logo: string;
  };
}

// ============ YU-GI-OH ============

export interface FetchYugiohCardsParams {
  setName?: string;
  query?: string;
  cardType?: string;
  offset?: number;
  num?: number;
}

export interface FetchYugiohCardsResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  errors: string[];
}

export interface YugiohSet {
  set_name: string;
  set_code: string;
  num_of_cards: number;
  tcg_date?: string;
}

// ============ LORCANA ============

export interface FetchLorcanaCardsParams {
  setNum?: number;
  query?: string;
  color?: string;
}

export interface FetchLorcanaCardsResult {
  success: boolean;
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface LorcanaSet {
  Name: string;
  Set_ID: string;
  Set_Num: number;
  Release_Date: string;
  Cards: number;
}

// ============ MAGIC ============

export interface FetchMagicCardsParams {
  setCode?: string;
  query?: string;
  page?: number;
}

export interface FetchMagicCardsResult {
  success: boolean;
  total: number;
  hasMore: boolean;
  page: number;
  inserted: number;
  updated: number;
  errors: string[];
}

export interface MagicSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at: string;
  card_count: number;
  icon_svg_uri: string;
}
