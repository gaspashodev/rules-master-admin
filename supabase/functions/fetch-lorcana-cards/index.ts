import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LorcanaCard {
  Artist: string;
  Set_Name: string;
  Set_Num: number;
  Color: string;
  Image: string;
  Cost: number;
  Inkable: boolean;
  Name: string;
  Type: string;
  Lore?: number;
  Rarity: string;
  Flavor_Text?: string;
  Card_Num: number;
  Body_Text?: string;
  Willpower?: number;
  Strength?: number;
  Set_ID: string;
  Abilities?: string[];
  Franchise?: string;
  Classifications?: string[];
}

interface FetchParams {
  setNum?: number;
  query?: string;
  color?: string;
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
    const { setNum, query, color } = params;

    // Build API URL - Lorcana API
    // API uses /cards/all for all cards, /cards/fetch?search=... for filtering
    let apiUrl = 'https://api.lorcana-api.com/cards';
    const searchParts: string[] = [];

    if (setNum) {
      searchParts.push(`set_num=${setNum}`);
    }
    if (query) {
      searchParts.push(`name=${encodeURIComponent(query)}`);
    }
    if (color) {
      searchParts.push(`color=${encodeURIComponent(color)}`);
    }

    if (searchParts.length > 0) {
      // Lorcana API uses search parameter with semicolon-separated conditions
      apiUrl += `/fetch?search=${searchParts.join(';')}`;
    } else {
      apiUrl += '/all';
    }

    console.log('Fetching from Lorcana API:', apiUrl);

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`Lorcana API error: ${response.status}`);
    }

    const cards: LorcanaCard[] = await response.json();

    console.log(`Received ${cards.length} cards from API`);

    let inserted = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        // Create unique external_id from set and card number
        const externalId = `${card.Set_ID}-${card.Card_Num}`;

        const cardData = {
          external_id: externalId,
          tcg_type: 'lorcana',
          name: card.Name,
          set_id: card.Set_ID,
          set_name: card.Set_Name,
          set_series: null,
          release_date: null,
          image_url: card.Image,
          image_url_small: card.Image, // Lorcana API doesn't provide small images
          hp: null,
          types: card.Color ? [card.Color] : [],
          subtypes: card.Classifications || [],
          rarity: card.Rarity,
          attacks: null,
          abilities: card.Abilities ? card.Abilities.map(a => ({ name: a, text: '' })) : null,
          weaknesses: null,
          resistances: null,
          retreat_cost: null,
          artist: card.Artist,
          flavor_text: card.Flavor_Text || null,
          national_pokedex_number: null,
          extra_data: {
            cost: card.Cost,
            inkable: card.Inkable,
            lore: card.Lore,
            strength: card.Strength,
            willpower: card.Willpower,
            type: card.Type,
            body_text: card.Body_Text,
            franchise: card.Franchise,
            card_num: card.Card_Num,
          },
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('tcg_cards_cache')
          .upsert(cardData, {
            onConflict: 'tcg_type,external_id',
          });

        if (error) {
          console.error(`Error upserting card ${externalId}:`, error);
          errors.push(`${card.Name}: ${error.message}`);
        } else {
          const { data: existing } = await supabase
            .from('tcg_cards_cache')
            .select('created_at, updated_at')
            .eq('external_id', externalId)
            .eq('tcg_type', 'lorcana')
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
        console.error(`Error processing card ${card.Name}:`, err);
        errors.push(`${card.Name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: cards.length,
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
