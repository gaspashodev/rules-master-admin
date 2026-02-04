import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YugiohCard {
  id: number;
  name: string;
  type: string;
  frameType: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute?: string;
  archetype?: string;
  card_sets?: Array<{
    set_name: string;
    set_code: string;
    set_rarity: string;
    set_rarity_code: string;
    set_price: string;
  }>;
  card_images: Array<{
    id: number;
    image_url: string;
    image_url_small: string;
    image_url_cropped: string;
  }>;
  card_prices?: Array<{
    cardmarket_price: string;
    tcgplayer_price: string;
    ebay_price: string;
    amazon_price: string;
    coolstuffinc_price: string;
  }>;
}

interface FetchParams {
  setName?: string;
  query?: string;
  cardType?: string;
  offset?: number;
  num?: number;
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
    const { setName, query, cardType, offset = 0, num = 50 } = params;

    // Build API URL - YGOProDeck API
    let apiUrl = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?';
    const queryParts: string[] = [];

    if (setName) {
      queryParts.push(`cardset=${encodeURIComponent(setName)}`);
    }
    if (query) {
      queryParts.push(`fname=${encodeURIComponent(query)}`);
    }
    if (cardType) {
      queryParts.push(`type=${encodeURIComponent(cardType)}`);
    }

    // Add pagination
    queryParts.push(`num=${num}`);
    queryParts.push(`offset=${offset}`);

    apiUrl += queryParts.join('&');

    console.log('Fetching from YGOProDeck API:', apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      // YGOProDeck returns 400 when no cards found
      if (response.status === 400) {
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
      throw new Error(`YGOProDeck API error: ${response.status}`);
    }

    const data = await response.json();
    const cards: YugiohCard[] = data.data || [];

    console.log(`Received ${cards.length} cards from API`);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        // Get first set info if available
        const firstSet = card.card_sets?.[0];
        const mainImage = card.card_images[0];

        const cardData = {
          external_id: card.id.toString(),
          tcg_type: 'yugioh',
          name: card.name,
          set_id: firstSet?.set_code || null,
          set_name: firstSet?.set_name || null,
          set_series: null,
          release_date: null, // YGOProDeck doesn't provide release dates per card
          image_url: mainImage?.image_url || null,
          image_url_small: mainImage?.image_url_small || null,
          hp: null, // Yu-Gi-Oh doesn't have HP
          types: card.type ? [card.type] : [],
          subtypes: card.race ? [card.race] : [],
          rarity: firstSet?.set_rarity || null,
          attacks: null,
          abilities: null,
          weaknesses: null,
          resistances: null,
          retreat_cost: null,
          artist: null,
          flavor_text: card.desc || null,
          national_pokedex_number: null,
          // Yu-Gi-Oh specific fields stored in extra_data
          extra_data: {
            atk: card.atk,
            def: card.def,
            level: card.level,
            attribute: card.attribute,
            archetype: card.archetype,
            frameType: card.frameType,
          },
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('tcg_cards_cache')
          .upsert(cardData, {
            onConflict: 'tcg_type,external_id',
          });

        if (error) {
          console.error(`Error upserting card ${card.id}:`, error);
          errors.push(`${card.name}: ${error.message}`);
        } else {
          const { data: existing } = await supabase
            .from('tcg_cards_cache')
            .select('created_at, updated_at')
            .eq('external_id', card.id.toString())
            .eq('tcg_type', 'yugioh')
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
        total: data.meta?.total_rows || cards.length,
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
