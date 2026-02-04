import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc: number;
  type_line: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  keywords?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  set: string;
  set_name: string;
  rarity: string;
  artist?: string;
  flavor_text?: string;
  released_at: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
    png: string;
    art_crop: string;
    border_crop: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    type_line: string;
    oracle_text?: string;
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
  }>;
}

interface ScryfallResponse {
  object: string;
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

interface FetchParams {
  setCode?: string;
  query?: string;
  page?: number;
}

// Scryfall requires a delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const params: FetchParams = await req.json();
    const { setCode, query, page = 1 } = params;

    // Build Scryfall search query
    let searchQuery = '';
    if (setCode) {
      searchQuery = `set:${setCode}`;
    }
    if (query) {
      searchQuery += searchQuery ? ` ${query}` : query;
    }

    if (!searchQuery) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Either setCode or query is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Scryfall API - they request 50-100ms between requests
    const apiUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}&page=${page}`;

    console.log('Fetching from Scryfall API:', apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'RulesMasterAdmin/1.0',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            success: true,
            total: 0,
            inserted: 0,
            updated: 0,
            errors: [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorData = await response.json();
      throw new Error(`Scryfall API error: ${errorData.details || response.status}`);
    }

    const data: ScryfallResponse = await response.json();
    const cards = data.data || [];

    console.log(`Received ${cards.length} cards from API (total: ${data.total_cards})`);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        // Get image from card_faces if main image_uris is not available (double-faced cards)
        const imageUrl = card.image_uris?.large || card.card_faces?.[0]?.image_uris?.large || null;
        const imageUrlSmall = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || null;

        const cardData = {
          external_id: card.id,
          tcg_type: 'magic' as const,
          name: card.name,
          set_id: card.set,
          set_name: card.set_name,
          set_series: null,
          release_date: card.released_at,
          image_url: imageUrl,
          image_url_small: imageUrlSmall,
          hp: null,
          types: card.colors || [],
          subtypes: card.keywords || [],
          rarity: card.rarity,
          attacks: null,
          abilities: card.oracle_text ? [{ name: 'Oracle Text', text: card.oracle_text }] : null,
          weaknesses: null,
          resistances: null,
          retreat_cost: null,
          artist: card.artist,
          flavor_text: card.flavor_text || null,
          national_pokedex_number: null,
          extra_data: {
            mana_cost: card.mana_cost,
            cmc: card.cmc,
            type_line: card.type_line,
            power: card.power,
            toughness: card.toughness,
            loyalty: card.loyalty,
            color_identity: card.color_identity,
          },
          updated_at: new Date().toISOString(),
        };

        // Check if card already exists
        const { data: existing } = await supabase
          .from('tcg_cards_cache')
          .select('id')
          .eq('external_id', card.id)
          .eq('tcg_type', 'magic')
          .single();

        if (existing) {
          // Update existing card
          const { error } = await supabase
            .from('tcg_cards_cache')
            .update(cardData)
            .eq('id', existing.id);

          if (error) {
            console.error(`Error updating card ${card.id}:`, error);
            errors.push(`${card.name}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new card
          const { error } = await supabase
            .from('tcg_cards_cache')
            .insert(cardData);

          if (error) {
            console.error(`Error inserting card ${card.id}:`, error);
            errors.push(`${card.name}: ${error.message}`);
          } else {
            inserted++;
          }
        }
      } catch (err) {
        console.error(`Error processing card ${card.id}:`, err);
        errors.push(`${card.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: data.total_cards,
        hasMore: data.has_more,
        page,
        inserted,
        updated,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
