import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  bgg_id: number;
  game_name: string;
  type: 1 | 2;
}

// Fetch game description from BGG API
async function fetchBggDescription(bggId: number): Promise<string | null> {
  const bggToken = Deno.env.get('BGG_API_TOKEN');

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'RulesMasterAdmin/1.0 (contact@rulesmaster.app)',
      'Accept': 'application/xml',
    };

    if (bggToken) {
      headers['Authorization'] = `Bearer ${bggToken}`;
    }

    const response = await fetch(
      `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`,
      { headers }
    );

    if (!response.ok) {
      console.error('BGG API error:', response.status);
      return null;
    }

    const xml = await response.text();

    // Extract description from XML
    const descriptionMatch = xml.match(/<description>([\s\S]*?)<\/description>/);
    if (!descriptionMatch) {
      return null;
    }

    // Decode HTML entities and clean up
    let description = descriptionMatch[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#10;/g, '\n')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .trim();

    return description;
  } catch (error) {
    console.error('Error fetching BGG description:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { bgg_id, game_name, type } = (await req.json()) as RequestBody;

    if (!bgg_id || !game_name || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bgg_id, game_name, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch English description from BGG
    const englishDescription = await fetchBggDescription(bgg_id);

    if (!englishDescription) {
      return new Response(
        JSON.stringify({ error: 'Could not fetch description from BGG' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt based on type
    const prompt = type === 1
      ? `Décris ce jeu en français en 130 caractères MAX.
Règles:
- Phrase complète avec articles
- Décris le but du jeu et ses mécaniques
- N'écris PAS le nom "${game_name}"
- Ne mets PAS de compteur de caractères
- Réponds UNIQUEMENT avec la description, rien d'autre

${englishDescription.substring(0, 300)}`
      : `Autre description en français en 130 caractères MAX.
Règles:
- Phrase complète avec articles
- Décris le but du jeu et ses éléments uniques
- N'écris PAS le nom "${game_name}"
- Ne mets PAS de compteur de caractères
- Réponds UNIQUEMENT avec la description, rien d'autre

${englishDescription.substring(0, 300)}`;

    // Call Anthropic API
    const anthropic = new Anthropic();

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textBlock = message.content.find((block) => block.type === 'text');
    const description = textBlock?.text?.trim() || '';

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
