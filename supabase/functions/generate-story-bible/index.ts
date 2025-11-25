/**
 * Generate Story Bible Edge Function
 *
 * Creates a comprehensive story bible for adult comic book stories.
 * Uses DeepSeek for high-quality, consistent character and world building.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  handleCors,
  authenticate,
  isAuthError,
  success,
  errors,
} from '../_shared/index.ts';

// Types
interface ComicStoryRequest {
  prompt: string;
  comicStyle: string;
  targetAudience: 'adult' | 'young_adult';
  tone: string;
}

interface StoryCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  appearance: string;
  personality: string;
  background: string;
  arc: string;
}

interface StoryBible {
  characters: StoryCharacter[];
  setting: {
    world: string;
    timePeriod: string;
    locations: { name: string; description: string; atmosphere: string }[];
    atmosphere: string;
  };
  artStyle: {
    style: string;
    colorPalette: string;
    lineWork: string;
    influences: string[];
    lighting: string;
    mood: string;
  };
  narrative: {
    genre: string;
    tone: string;
    themes: string[];
    plotOutline: string;
    totalChapters: number;
    possibleEndings: { type: string; description: string }[];
  };
  stylePromptPrefix: string;
  characterPromptMap: Record<string, string>;
}

// Style presets for different comic styles
const COMIC_STYLE_PRESETS: Record<string, {
  style: string;
  colorPalette: string;
  lineWork: string;
  influences: string[];
  lighting: string;
  mood: string;
}> = {
  noir: {
    style: 'noir graphic novel',
    colorPalette: 'high contrast black and white with selective red accents',
    lineWork: 'heavy ink shadows, dramatic silhouettes',
    influences: ['Frank Miller', 'Sin City', 'Mike Mignola'],
    lighting: 'harsh chiaroscuro, venetian blind shadows',
    mood: 'gritty, atmospheric, morally ambiguous',
  },
  manga: {
    style: 'seinen manga',
    colorPalette: 'clean blacks and whites with screentone shading',
    lineWork: 'precise lineart, dynamic speed lines',
    influences: ['Takehiko Inoue', 'Naoki Urasawa', 'Kentaro Miura'],
    lighting: 'dramatic with high contrast action scenes',
    mood: 'intense, emotional, detailed',
  },
  western: {
    style: 'modern American comic',
    colorPalette: 'rich, saturated colors with dramatic shadows',
    lineWork: 'bold outlines, detailed crosshatching',
    influences: ['Alex Ross', 'Jim Lee', 'David Finch'],
    lighting: 'cinematic, dynamic rim lighting',
    mood: 'heroic, epic, intense',
  },
  cyberpunk: {
    style: 'cyberpunk graphic novel',
    colorPalette: 'neon pinks, blues, and purples against dark backgrounds',
    lineWork: 'sharp geometric lines, digital aesthetic',
    influences: ['Masamune Shirow', 'Josan Gonzalez', 'Blade Runner'],
    lighting: 'neon glow, holographic reflections',
    mood: 'dystopian, tech-noir, atmospheric',
  },
  horror: {
    style: 'horror comic',
    colorPalette: 'desaturated with sickly greens and blood reds',
    lineWork: 'scratchy, unsettling linework',
    influences: ['Junji Ito', 'Bernie Wrightson', 'Emily Carroll'],
    lighting: 'oppressive shadows, unnatural light sources',
    mood: 'dread, unease, visceral',
  },
  fantasy: {
    style: 'dark fantasy graphic novel',
    colorPalette: 'earthy tones with magical color accents',
    lineWork: 'detailed, painterly quality',
    influences: ['Frazetta', 'Moebius', 'Yoshitaka Amano'],
    lighting: 'mystical, ethereal glow effects',
    mood: 'epic, mysterious, otherworldly',
  },
};

const BIBLE_SYSTEM_PROMPT = `You are an expert comic book writer and art director creating a story bible for an adult graphic novel.

Your story bibles are known for:
1. MEMORABLE CHARACTERS with distinct visual identities and complex motivations
2. RICH WORLD-BUILDING that feels lived-in and consistent
3. VISUAL CLARITY - every character description can be drawn consistently
4. MATURE THEMES handled with nuance and depth
5. BRANCHING NARRATIVES with meaningful, consequential choices

CRITICAL RULES:
- This is for ADULTS. Include mature themes, moral complexity, real consequences.
- Character appearances must be SPECIFIC and CONSISTENT (exact details for image generation)
- Define a single art style that will be used for ALL panels
- Create a branching plot with 3-5 distinct endings
- Each character needs a unique visual identifier (scar, clothing, hairstyle, etc.)

You MUST respond with valid JSON only. No explanations outside the JSON.`;

function buildBibleUserPrompt(request: ComicStoryRequest): string {
  const stylePreset = COMIC_STYLE_PRESETS[request.comicStyle] || COMIC_STYLE_PRESETS.noir;

  return `Create a story bible for this adult graphic novel concept:

"${request.prompt}"

REQUIREMENTS:
- Style: ${request.comicStyle.toUpperCase()} comic (${stylePreset.style})
- Tone: ${request.tone}
- Audience: ${request.targetAudience === 'adult' ? 'Mature adults (18+)' : 'Young adults (16+)'}
- Visual influences: ${stylePreset.influences?.join(', ')}

OUTPUT THIS EXACT JSON STRUCTURE:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist|antagonist|supporting|minor",
      "appearance": "DETAILED physical description: age, build, face, hair, distinctive features, typical clothing. Be SPECIFIC for image consistency.",
      "personality": "Core traits, mannerisms, speech patterns",
      "background": "Brief but relevant backstory",
      "arc": "How this character changes through the story"
    }
  ],
  "setting": {
    "world": "Description of the world/reality",
    "timePeriod": "When this takes place",
    "locations": [
      {
        "name": "Location Name",
        "description": "Visual description",
        "atmosphere": "Mood and feeling"
      }
    ],
    "atmosphere": "Overall world atmosphere"
  },
  "artStyle": {
    "style": "${stylePreset.style}",
    "colorPalette": "${stylePreset.colorPalette}",
    "lineWork": "${stylePreset.lineWork}",
    "influences": ${JSON.stringify(stylePreset.influences)},
    "lighting": "${stylePreset.lighting}",
    "mood": "${stylePreset.mood}"
  },
  "narrative": {
    "genre": "Specific genre",
    "tone": "${request.tone}",
    "themes": ["theme1", "theme2", "theme3"],
    "plotOutline": "2-3 sentence plot summary",
    "totalChapters": 10,
    "possibleEndings": [
      {"type": "good|bad|neutral|bittersweet", "description": "Brief ending description"}
    ]
  },
  "stylePromptPrefix": "A ${stylePreset.style} panel. ${stylePreset.colorPalette}. ${stylePreset.lineWork}. ${stylePreset.lighting}. Style of ${stylePreset.influences?.[0]}.",
  "characterPromptMap": {
    "Character Name": "Exact visual description for image prompts"
  }
}

Create 2-4 compelling characters. Make the story ORIGINAL and ENGAGING.`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Authenticate user
    const authResult = await authenticate(req);
    if (isAuthError(authResult)) {
      return authResult;
    }

    const { user, supabase } = authResult;

    // Parse request
    const body: ComicStoryRequest = await req.json();

    if (!body.prompt) {
      return errors.badRequest('Story prompt is required');
    }

    // Set defaults
    const request: ComicStoryRequest = {
      prompt: body.prompt,
      comicStyle: body.comicStyle || 'noir',
      targetAudience: body.targetAudience || 'adult',
      tone: body.tone || 'dramatic',
    };

    // Check user limits (similar to generate-story)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, is_grandfathered, stories_generated_today, last_generation_date')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return errors.internal('Failed to fetch user profile');
    }

    const hasPro = profile?.subscription_tier === 'pro' || profile?.is_grandfathered;

    if (!hasPro) {
      const today = new Date().toISOString().split('T')[0];
      const lastGenDate = profile?.last_generation_date;
      const todayCount = lastGenDate === today ? (profile?.stories_generated_today || 0) : 0;

      if (todayCount >= 1) {
        return errors.limitReached('Daily story limit reached. Upgrade to Pro for unlimited stories!');
      }
    }

    // Get DeepSeek API key
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return errors.internal('DeepSeek API key not configured');
    }

    // Generate story bible with DeepSeek
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${deepseekApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: BIBLE_SYSTEM_PROMPT },
          { role: 'user', content: buildBibleUserPrompt(request) },
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', errorText);
      return errors.externalApi('DeepSeek', errorText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    let bible: StoryBible;
    try {
      bible = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        bible = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse bible JSON:', content);
        return errors.internal('Failed to parse story bible from AI response');
      }
    }

    // Validate required fields
    if (!bible.characters || !Array.isArray(bible.characters) || bible.characters.length === 0) {
      return errors.internal('Invalid story bible: missing characters');
    }

    if (!bible.setting || !bible.artStyle || !bible.narrative) {
      return errors.internal('Invalid story bible: missing required sections');
    }

    // Ensure characterPromptMap is populated
    if (!bible.characterPromptMap || Object.keys(bible.characterPromptMap).length === 0) {
      bible.characterPromptMap = {};
      for (const char of bible.characters) {
        bible.characterPromptMap[char.name] = char.appearance;
      }
    }

    // Ensure stylePromptPrefix is set
    if (!bible.stylePromptPrefix) {
      const stylePreset = COMIC_STYLE_PRESETS[request.comicStyle] || COMIC_STYLE_PRESETS.noir;
      bible.stylePromptPrefix = `A ${stylePreset.style} panel. ${stylePreset.colorPalette}. ${stylePreset.lineWork}. ${stylePreset.lighting}. Style of ${stylePreset.influences[0]}.`;
    }

    return success(bible);

  } catch (error) {
    console.error('Error generating story bible:', error);
    return errors.internal(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
