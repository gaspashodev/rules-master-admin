import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  bgg_id: number;
  game_name: string;
  type: 1 | 2 | 'both';
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
    const description = descriptionMatch[1]
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

const SYSTEM_PROMPT = `Tu es un rédacteur spécialisé en jeux de société. Tu rédiges EXCLUSIVEMENT en français. Tu ne réponds JAMAIS en anglais. Tu retournes uniquement la description demandée, sans guillemets, sans commentaire, sans compteur de caractères.`;

function buildPrompt(type: 1 | 2, gameName: string, englishDescription: string): string {
  const context = englishDescription.substring(0, 500);

  if (type === 1) {
    return `Voici la description anglaise d'un jeu de société appelé "${gameName}" :
"${context}"

Rédige UNE SEULE phrase EN FRANÇAIS de 130 caractères maximum qui décrit les mécaniques et l'objectif de ce jeu.
Contraintes :
- Phrase complète avec articles (pas de style télégraphique)
- Décris le but du jeu et ses mécaniques principales
- N'écris PAS le nom du jeu dans ta réponse
- Réponds UNIQUEMENT avec la phrase, rien d'autre`;
  }

  return `Voici la description anglaise d'un jeu de société appelé "${gameName}" :
"${context}"

Rédige UNE SEULE phrase EN FRANÇAIS de 130 caractères maximum qui décrit l'ambiance et le thème de ce jeu.
Contraintes :
- Phrase complète avec articles (pas de style télégraphique)
- Décris le thème, l'univers ou l'atmosphère du jeu
- N'écris PAS le nom du jeu dans ta réponse
- Réponds UNIQUEMENT avec la phrase, rien d'autre`;
}

async function generateOneDescription(
  anthropic: Anthropic,
  type: 1 | 2,
  gameName: string,
  englishDescription: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: buildPrompt(type, gameName, englishDescription),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.text?.trim().replace(/^["«]|["»]$/g, '') || '';
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

    const anthropic = new Anthropic();

    // Generate both descriptions at once, or just one
    if (type === 'both') {
      const [description1, description2] = await Promise.all([
        generateOneDescription(anthropic, 1, game_name, englishDescription),
        generateOneDescription(anthropic, 2, game_name, englishDescription),
      ]);

      return new Response(
        JSON.stringify({ descriptions: [description1, description2] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const description = await generateOneDescription(anthropic, type, game_name, englishDescription);

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
