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

    console.log('Received params:', JSON.stringify(params));

    // Build API URL - Lorcana API
    // API uses /cards/all for all cards, /cards/fetch?search=... for filtering
    let apiUrl = 'https://api.lorcana-api.com/cards';
    const searchParts: string[] = [];

    // Use !== undefined to handle setNum=0 case
    if (setNum !== undefined && setNum !== null) {
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
      // Add pagesize=250 to get all cards from a set (max set size is ~204)
      apiUrl += `/fetch?search=${searchParts.join(';')}&pagesize=250`;
    } else {
      // For /all endpoint, also increase pagesize
      apiUrl += '/all?pagesize=2500';
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
    let skipped = 0;
    const errors: string[] = [];

    for (const card of cards) {
      try {
        // Create unique external_id from set and card number
        const externalId = `${card.Set_ID}-${card.Card_Num}`;

        // Skip cards without image URL
        if (!card.Image) {
          console.log(`Skipping ${card.Name}: no image URL`);
          skipped++;
          continue;
        }

        // Verify image exists with HEAD request
        try {
          const imageCheck = await fetch(card.Image, { method: 'HEAD' });
          if (!imageCheck.ok) {
            console.log(`Skipping ${card.Name}: image not found (${imageCheck.status})`);
            skipped++;
            continue;
          }
        } catch {
          console.log(`Skipping ${card.Name}: image check failed`);
          skipped++;
          continue;
        }

        // Handle Classifications - can be array or comma-separated string
        let subtypes: string[] = [];
        if (card.Classifications) {
          if (Array.isArray(card.Classifications)) {
            subtypes = card.Classifications;
          } else if (typeof card.Classifications === 'string') {
            subtypes = card.Classifications.split(', ').map(s => s.trim()).filter(Boolean);
          }
        }

        // Handle Abilities - can be array or other types
        let abilities: { name: string; text: string }[] | null = null;
        if (card.Abilities) {
          if (Array.isArray(card.Abilities)) {
            abilities = card.Abilities.map(a => ({ name: String(a), text: '' }));
          } else if (typeof card.Abilities === 'string') {
            abilities = [{ name: card.Abilities, text: '' }];
          }
        }

        const cardData = {
          external_id: externalId,
          tcg_type: 'lorcana' as const,
          name: card.Name,
          set_id: card.Set_ID,
          set_name: card.Set_Name,
          set_series: null,
          release_date: null,
          image_url: card.Image,
          image_url_small: card.Image, // Lorcana API doesn't provide small images
          hp: null,
          types: card.Color ? [card.Color] : [],
          subtypes,
          rarity: card.Rarity,
          attacks: null,
          abilities,
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

        // Check if card already exists
        const { data: existing } = await supabase
          .from('tcg_cards_cache')
          .select('id')
          .eq('external_id', externalId)
          .eq('tcg_type', 'lorcana')
          .single();

        if (existing) {
          // Update existing card
          const { error } = await supabase
            .from('tcg_cards_cache')
            .update(cardData)
            .eq('id', existing.id);

          if (error) {
            console.error(`Error updating card ${externalId}:`, error);
            errors.push(`${card.Name}: ${error.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new card
          const { error } = await supabase
            .from('tcg_cards_cache')
            .insert(cardData);

          if (error) {
            console.error(`Error inserting card ${externalId}:`, error);
            errors.push(`${card.Name}: ${error.message}`);
          } else {
            inserted++;
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
        skipped,
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
