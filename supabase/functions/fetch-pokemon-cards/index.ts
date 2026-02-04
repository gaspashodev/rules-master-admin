import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PokemonCard {
  id: string;
  name: string;
  hp?: string;
  types?: string[];
  subtypes?: string[];
  supertype: string;
  rarity?: string;
  artist?: string;
  flavorText?: string;
  nationalPokedexNumbers?: number[];
  attacks?: Array<{
    name: string;
    cost: string[];
    damage: string;
    text: string;
  }>;
  abilities?: Array<{
    name: string;
    text: string;
    type: string;
  }>;
  weaknesses?: Array<{
    type: string;
    value: string;
  }>;
  resistances?: Array<{
    type: string;
    value: string;
  }>;
  retreatCost?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    releaseDate: string;
  };
  images: {
    small: string;
    large: string;
  };
}

interface FetchParams {
  setId?: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const params: FetchParams = await req.json();
    const { setId, query, page = 1, pageSize = 50 } = params;

    // Construire la requête vers l'API Pokemon TCG
    let apiUrl = `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=${pageSize}`;

    const queryParts: string[] = [];
    if (setId) {
      queryParts.push(`set.id:${setId}`);
    }
    if (query) {
      queryParts.push(`name:${query}*`);
    }

    if (queryParts.length > 0) {
      apiUrl += `&q=${encodeURIComponent(queryParts.join(' '))}`;
    }

    console.log('Fetching from Pokemon TCG API:', apiUrl);

    // Get API key from environment (optional but increases rate limits)
    const apiKey = Deno.env.get('POKEMON_TCG_API_KEY');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['X-Api-Key'] = apiKey;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.status}`);
    }

    const data = await response.json();
    const cards: PokemonCard[] = data.data || [];

    console.log(`Received ${cards.length} cards from API`);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        // Parser la date de sortie
        let releaseDate: string | null = null;
        if (card.set.releaseDate) {
          // Format: "2010/11/03" -> "2010-11-03"
          releaseDate = card.set.releaseDate.replace(/\//g, '-');
        }

        const cardData = {
          external_id: card.id,
          tcg_type: 'pokemon',
          name: card.name,
          set_id: card.set.id,
          set_name: card.set.name,
          set_series: card.set.series,
          release_date: releaseDate,
          image_url: card.images.large,
          image_url_small: card.images.small,
          hp: card.hp ? parseInt(card.hp) : null,
          types: card.types || [],
          subtypes: card.subtypes || [],
          rarity: card.rarity || null,
          attacks: card.attacks || null,
          abilities: card.abilities || null,
          weaknesses: card.weaknesses || null,
          resistances: card.resistances || null,
          retreat_cost: card.retreatCost?.length || null,
          artist: card.artist || null,
          flavor_text: card.flavorText || null,
          national_pokedex_number: card.nationalPokedexNumbers?.[0] || null,
          updated_at: new Date().toISOString(),
        };

        // Upsert dans la base
        const { error } = await supabase
          .from('tcg_cards_cache')
          .upsert(cardData, {
            onConflict: 'tcg_type,external_id',
          });

        if (error) {
          console.error(`Error upserting card ${card.id}:`, error);
          errors.push(`${card.name}: ${error.message}`);
        } else {
          // Vérifier si c'était un insert ou update
          const { data: existing } = await supabase
            .from('tcg_cards_cache')
            .select('created_at, updated_at')
            .eq('external_id', card.id)
            .eq('tcg_type', 'pokemon')
            .single();

          if (existing) {
            const createdAt = new Date(existing.created_at).getTime();
            const updatedAt = new Date(existing.updated_at).getTime();
            if (updatedAt - createdAt < 1000) {
              inserted++;
            } else {
              updated++;
            }
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
        total: data.totalCount || cards.length,
        page,
        pageSize,
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
