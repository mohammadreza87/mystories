/**
 * Generate Image Edge Function using Leonardo AI
 *
 * Creates images using Leonardo AI's API for both children's
 * book illustrations and adult comic book panels.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authenticate, isAuthError } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { CORS_HEADERS } from "../_shared/cors.ts";

const corsHeaders = CORS_HEADERS;

interface ImageRequest {
  prompt: string;
  size?: string;
  styleReference?: string;
  isAdultComic?: boolean;
  isAdultContent?: boolean;
  targetAudience?: 'children' | 'young_adult' | 'adult';
  artStyle?: 'cartoon' | 'comic' | 'realistic';
  modelId?: string;
}

// Leonardo AI Model IDs
const LEONARDO_MODELS = {
  // Lucid Origin - Latest high quality model
  lucidOrigin: "7b592283-e8a7-4c5a-9ba6-d18c31f258b9",
  // Leonardo Phoenix - Great for detailed, artistic images
  phoenix: "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3",
  // Leonardo Anime XL - Good for manga/anime style
  animeXL: "e71a1c2f-4f80-4800-934f-2c68979d8cc8",
  // Leonardo Diffusion XL - General purpose high quality
  diffusionXL: "1e60896f-3c26-4296-8ecc-53e2afecc132",
  // Leonardo Kino XL - Cinematic quality
  kinoXL: "aa77f04e-3eec-4034-9c07-d0f619684628",
};

// Leonardo Style UUIDs
const LEONARDO_STYLES = {
  cinematic: "a5632c7c-ddbb-4e2f-ba34-8456ab3ac436",
  cinematicCloseUp: "cc53f935-884c-40a0-b7eb-1f5c42821fb5",
  dynamic: "111dc692-d470-4eec-b791-3475abac4c46",
  creative: "6fedbf1f-4a17-45ec-84fb-92fe524a29ef",
  moody: "621e1c9a-6319-4bee-a12d-ae40659162fa",
  monochrome: "a2f7ea66-959b-4bbe-b508-6133238b76b6",
  vibrant: "dee282d3-891f-4f73-ba02-7f8131e5541b",
  film: "85da2dcc-c373-464c-9a7a-5624359be859",
  hdr: "97c20e5c-1af6-4d42-b227-54d03d8f0727",
  retro: "6105baa2-851b-446e-9db5-08a671a8c42f",
  none: "556c1ee5-ec38-42e8-955a-1e82dad0ffa1",
};

// Map comic styles to best Leonardo models and styles
const COMIC_STYLE_CONFIG: Record<string, { modelId: string; styleUUID: string; contrast: number }> = {
  noir: {
    modelId: LEONARDO_MODELS.lucidOrigin,
    styleUUID: LEONARDO_STYLES.moody,
    contrast: 4, // High contrast for noir
  },
  manga: {
    modelId: LEONARDO_MODELS.animeXL,
    styleUUID: LEONARDO_STYLES.dynamic,
    contrast: 3.5,
  },
  western: {
    modelId: LEONARDO_MODELS.lucidOrigin,
    styleUUID: LEONARDO_STYLES.cinematic,
    contrast: 3.5,
  },
  cyberpunk: {
    modelId: LEONARDO_MODELS.lucidOrigin,
    styleUUID: LEONARDO_STYLES.vibrant,
    contrast: 4,
  },
  horror: {
    modelId: LEONARDO_MODELS.lucidOrigin,
    styleUUID: LEONARDO_STYLES.moody,
    contrast: 4.5, // Maximum contrast for horror
  },
  fantasy: {
    modelId: LEONARDO_MODELS.phoenix,
    styleUUID: LEONARDO_STYLES.creative,
    contrast: 3.5,
  },
};

// User-facing art style configurations
const ART_STYLE_CONFIG: Record<string, { modelId: string; styleUUID: string; contrast: number; promptPrefix: string }> = {
  cartoon: {
    modelId: LEONARDO_MODELS.phoenix,
    styleUUID: LEONARDO_STYLES.vibrant,
    contrast: 3,
    promptPrefix: 'Colorful cartoon illustration style, fun and playful, bold outlines, vibrant colors, Pixar-inspired, friendly character designs, whimsical atmosphere',
  },
  comic: {
    modelId: LEONARDO_MODELS.kinoXL,
    styleUUID: LEONARDO_STYLES.cinematic,
    contrast: 4,
    promptPrefix: 'Professional comic book art style, graphic novel illustration, bold ink outlines, cel-shaded coloring, dramatic shadows, dynamic composition, cinematic panel layout, high contrast, detailed backgrounds, professional sequential art quality',
  },
  realistic: {
    modelId: LEONARDO_MODELS.lucidOrigin,
    styleUUID: LEONARDO_STYLES.cinematicCloseUp,
    contrast: 3.5,
    promptPrefix: 'Photorealistic cinematic style, movie poster quality, hyperrealistic, dramatic lighting, film-quality visuals, detailed textures, professional photography aesthetic, award-winning cinematography',
  },
};

const LEONARDO_API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

interface GenerationConfig {
  modelId: string;
  styleUUID?: string;
  contrast?: number;
  width?: number;
  height?: number;
}

async function createGeneration(
  apiKey: string,
  prompt: string,
  config: GenerationConfig
): Promise<string> {
  const {
    modelId,
    styleUUID = LEONARDO_STYLES.cinematic,
    contrast = 3.5,
    width = 1024,
    height = 1024,
  } = config;

  const requestBody: Record<string, unknown> = {
    prompt,
    modelId,
    width,
    height,
    num_images: 1,
    contrast,
    styleUUID,
    alchemy: false, // Set to false as per the sample
    ultra: false,
    enhancePrompt: false,
  };

  const response = await fetch(`${LEONARDO_API_BASE}/generations`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Leonardo API create generation error:", error);
    throw new Error(`Failed to create generation: ${error}`);
  }

  const data = await response.json();

  if (!data.sdGenerationJob?.generationId) {
    console.error("No generation ID in response:", data);
    throw new Error("No generation ID returned from Leonardo API");
  }

  return data.sdGenerationJob.generationId;
}

async function pollForCompletion(
  apiKey: string,
  generationId: string,
  maxAttempts: number = 30,
  delayMs: number = 2000
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${LEONARDO_API_BASE}/generations/${generationId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Leonardo API poll error (attempt ${attempt + 1}):`, error);
      // Continue polling on error
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    const data = await response.json();
    const generation = data.generations_by_pk;

    if (!generation) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      continue;
    }

    // Check if generation is complete
    if (generation.status === "COMPLETE") {
      if (generation.generated_images && generation.generated_images.length > 0) {
        return generation.generated_images[0].url;
      }
      throw new Error("Generation complete but no images found");
    }

    if (generation.status === "FAILED") {
      throw new Error("Image generation failed");
    }

    // Still pending, wait and retry
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error("Generation timed out");
}

function detectComicStyle(styleReference: string): string | null {
  const lower = styleReference.toLowerCase();

  if (lower.includes('manga') || lower.includes('anime') || lower.includes('seinen')) {
    return 'manga';
  }
  if (lower.includes('noir') || lower.includes('sin city') || lower.includes('miller')) {
    return 'noir';
  }
  if (lower.includes('cyberpunk') || lower.includes('neon') || lower.includes('blade runner')) {
    return 'cyberpunk';
  }
  if (lower.includes('horror') || lower.includes('junji') || lower.includes('dread')) {
    return 'horror';
  }
  if (lower.includes('fantasy') || lower.includes('moebius') || lower.includes('frazetta')) {
    return 'fantasy';
  }
  if (lower.includes('western') || lower.includes('american comic') || lower.includes('superhero')) {
    return 'western';
  }

  return null;
}

// List of sensitive terms to sanitize from prompts
const SENSITIVE_TERMS: Record<string, string> = {
  // Historical figures - replace with generic descriptions
  'kennedy': 'a distinguished political leader',
  'jfk': 'a distinguished political leader',
  'john f kennedy': 'a distinguished political leader',
  'john fitzgerald kennedy': 'a distinguished political leader',
  'hitler': 'a stern military leader',
  'nazi': 'authoritarian regime',
  'nazis': 'authoritarian soldiers',
  'holocaust': 'historical tragedy',
  'stalin': 'a cold authoritarian leader',
  'mussolini': 'a dictatorial figure',
  'robespierre': 'a revolutionary leader in period clothing',
  'guillotine': 'execution platform',
  'mao': 'an eastern political leader',
  'pol pot': 'a ruthless leader',
  'bin laden': 'a bearded extremist figure',
  'isis': 'militant group',
  'al qaeda': 'terrorist organization',
  'kkk': 'hooded figures',
  'ku klux': 'hooded figures',
  // Wars and violence - make more abstract
  'world war': 'great historical conflict',
  'ww2': 'mid-century conflict',
  'ww1': 'early century conflict',
  'genocide': 'mass tragedy',
  'massacre': 'tragic event',
  'concentration camp': 'detention facility',
  'gas chamber': 'dark chamber',
  'atomic bomb': 'devastating weapon',
  'nuclear bomb': 'powerful explosion',
  // Keep the scene dramatic but safe
  'murder': 'dramatic confrontation',
  'killing': 'intense conflict',
  'torture': 'interrogation',
  'execution': 'fateful moment',
  'assassination': 'targeted attack',
  'terrorist': 'extremist',
  'terrorism': 'extremism',
  // Political sensitivity
  'swastika': 'authoritarian symbol',
  'confederate': 'historical faction',
  'slavery': 'historical oppression',
  'slave': 'oppressed person',
};

// Detect historical/political era from prompt for better styling
function detectHistoricalEra(prompt: string): string | null {
  const lower = prompt.toLowerCase();

  if (lower.includes('french revolution') || lower.includes('1789') || lower.includes('bastille')) {
    return '18th century French, Baroque architecture, candlelit interiors, powdered wigs, ornate clothing';
  }
  if (lower.includes('world war 2') || lower.includes('ww2') || lower.includes('1940s') || lower.includes('nazi')) {
    return '1940s wartime, sepia tones, military uniforms, war-torn landscapes';
  }
  if (lower.includes('world war 1') || lower.includes('ww1') || lower.includes('1914') || lower.includes('trench')) {
    return '1910s wartime, muddy trenches, grey skies, military uniforms';
  }
  if (lower.includes('roman') || lower.includes('caesar') || lower.includes('rome') || lower.includes('gladiator')) {
    return 'Ancient Roman, marble columns, togas, Mediterranean architecture, golden sunlight';
  }
  if (lower.includes('viking') || lower.includes('norse') || lower.includes('valhalla')) {
    return 'Viking era, Nordic landscapes, wooden longships, fur cloaks, runic symbols';
  }
  if (lower.includes('medieval') || lower.includes('knight') || lower.includes('castle') || lower.includes('king')) {
    return 'Medieval European, stone castles, armor, tapestries, torchlit halls';
  }
  if (lower.includes('renaissance') || lower.includes('medici') || lower.includes('florence')) {
    return 'Italian Renaissance, grand palaces, artistic masterpieces, elegant robes';
  }
  if (lower.includes('cold war') || lower.includes('soviet') || lower.includes('kgb') || lower.includes('1960s')) {
    return '1960s Cold War era, brutalist architecture, formal suits, tension-filled atmosphere';
  }
  if (lower.includes('prohibition') || lower.includes('1920s') || lower.includes('speakeasy') || lower.includes('gangster')) {
    return '1920s Art Deco, jazz age, pinstripe suits, smoky bars, vintage automobiles';
  }
  if (lower.includes('silicon valley') || lower.includes('tech') || lower.includes('startup')) {
    return 'Modern tech office, glass buildings, minimalist design, screens and devices';
  }

  return null;
}

function sanitizePromptForImageGeneration(prompt: string): string {
  let sanitized = prompt;

  // Replace sensitive terms with safer alternatives
  for (const [term, replacement] of Object.entries(SENSITIVE_TERMS)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }

  // Remove any remaining potentially problematic phrases
  sanitized = sanitized
    .replace(/\b(kill|killed|killing|death|dead|die|dying|dies)\b/gi, 'fall')
    .replace(/\b(blood|bloody|bleeding)\b/gi, 'red')
    .replace(/\b(corpse|body|bodies)\b/gi, 'figure')
    .replace(/\b(gun|rifle|pistol|weapon)\b/gi, 'object')
    .replace(/\b(shoot|shooting|shot)\b/gi, 'action')
    .replace(/\b(bomb|bombing|explosion)\b/gi, 'dramatic event')
    .replace(/\b(war|battle|combat|fight|fighting)\b/gi, 'conflict');

  return sanitized;
}

function buildSafeImagePrompt(originalPrompt: string, isAdult: boolean): string {
  if (!isAdult) {
    return originalPrompt; // Children's content doesn't need sanitization
  }

  // Sanitize the prompt
  const sanitizedPrompt = sanitizePromptForImageGeneration(originalPrompt);

  // Detect historical era for better styling
  const eraStyle = detectHistoricalEra(originalPrompt);

  // Build a safe but evocative prompt
  let safePrompt = sanitizedPrompt;

  if (eraStyle) {
    safePrompt = `${eraStyle}. ${sanitizedPrompt}`;
  }

  // Add artistic direction to make it clearly fictional/artistic
  safePrompt += ' Dramatic cinematic lighting, artistic interpretation, movie poster quality, award-winning cinematography.';

  return safePrompt;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Authenticate the request
    const authResult = await authenticate(req);
    if (isAuthError(authResult)) {
      return authResult;
    }
    const { user } = authResult;

    // Check rate limit
    const rateLimitResponse = await enforceRateLimit(user.id, 'generate-image');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await req.json();
    console.log("Received request body:", body);

    const { prompt, styleReference, isAdultComic, isAdultContent, targetAudience, artStyle, modelId }: ImageRequest = body;

    // Determine if this is adult content that needs sanitization
    const isAdult = isAdultContent || isAdultComic || targetAudience === 'adult' || targetAudience === 'young_adult';

    if (!prompt) {
      console.error("No prompt provided in request");
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const leonardoApiKey = Deno.env.get("LEONARDO_API_KEY");
    if (!leonardoApiKey) {
      return new Response(
        JSON.stringify({ error: "Leonardo API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Detect if this is a comic/graphic novel request
    const isComic = isAdultComic || (styleReference && (
      styleReference.toLowerCase().includes('comic') ||
      styleReference.toLowerCase().includes('graphic novel') ||
      styleReference.toLowerCase().includes('manga') ||
      styleReference.toLowerCase().includes('noir') ||
      styleReference.toLowerCase().includes('cyberpunk')
    ));

    // Use art style configuration if provided, otherwise fallback to comic style detection
    let generationConfig: GenerationConfig;
    let selectedArtStyle = artStyle || 'comic'; // Default to comic style

    if (artStyle && ART_STYLE_CONFIG[artStyle]) {
      const styleConfig = ART_STYLE_CONFIG[artStyle];
      generationConfig = {
        modelId: modelId || styleConfig.modelId,
        styleUUID: styleConfig.styleUUID,
        contrast: styleConfig.contrast,
        width: 1024,
        height: 1024,
      };
    } else if (styleReference) {
      // Fallback to comic style detection for backward compatibility
      const comicStyle = detectComicStyle(styleReference);
      if (comicStyle && COMIC_STYLE_CONFIG[comicStyle]) {
        const styleConfig = COMIC_STYLE_CONFIG[comicStyle];
        generationConfig = {
          modelId: modelId || styleConfig.modelId,
          styleUUID: styleConfig.styleUUID,
          contrast: styleConfig.contrast,
          width: 1024,
          height: 1024,
        };
      } else {
        // Default to comic style
        generationConfig = {
          modelId: modelId || LEONARDO_MODELS.kinoXL,
          styleUUID: LEONARDO_STYLES.cinematic,
          contrast: 4,
          width: 1024,
          height: 1024,
        };
      }
    } else {
      // Default to selected art style config
      const styleConfig = ART_STYLE_CONFIG[selectedArtStyle];
      generationConfig = {
        modelId: modelId || styleConfig.modelId,
        styleUUID: styleConfig.styleUUID,
        contrast: styleConfig.contrast,
        width: 1024,
        height: 1024,
      };
    }

    // Build the prompt with sanitization for adult content
    const safeStyle = (styleReference || "").slice(0, 800);
    const rawPrompt = (prompt || "").slice(0, 800);

    // Apply sanitization for adult content to avoid content moderation issues
    const sanitizedPrompt = isAdult ? buildSafeImagePrompt(rawPrompt, true) : rawPrompt;

    // Get the art style prefix based on selected style
    const artStyleConfig = ART_STYLE_CONFIG[selectedArtStyle] || ART_STYLE_CONFIG.comic;
    const STYLE_PREFIX = artStyleConfig.promptPrefix;

    let fullPrompt: string;

    if (isComic || isAdult) {
      // Adult content - use selected art style
      fullPrompt = `${STYLE_PREFIX}. Scene: ${sanitizedPrompt}. No text, no speech bubbles, no captions, no letters.`;
    } else {
      // Children's content - use selected art style with softer adjustments for non-realistic
      if (selectedArtStyle === 'realistic') {
        fullPrompt = `${STYLE_PREFIX}, family-friendly, warm lighting. Scene: ${rawPrompt}. No text, no speech bubbles, no captions, no letters.`;
      } else {
        fullPrompt = `${STYLE_PREFIX}, softer colors, friendly character designs, whimsical atmosphere. Scene: ${rawPrompt}. No text, no speech bubbles, no captions, no letters.`;
      }
    }

    console.log("Generating image with Leonardo AI, config:", {
      modelId: generationConfig.modelId,
      styleUUID: generationConfig.styleUUID,
      contrast: generationConfig.contrast,
    });
    console.log("Prompt length:", fullPrompt.length);

    // Create generation
    const generationId = await createGeneration(
      leonardoApiKey,
      fullPrompt,
      generationConfig
    );

    console.log("Generation created, ID:", generationId);

    // Poll for completion
    const imageUrl = await pollForCompletion(leonardoApiKey, generationId);

    console.log("Image generated, downloading...");

    // Download the image from Leonardo
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to download generated image" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${crypto.randomUUID()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("story-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload image", details: uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("story-images")
      .getPublicUrl(fileName);

    console.log("Image uploaded successfully:", publicUrlData.publicUrl);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrlData.publicUrl,
        generationId, // Include for debugging/tracking
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
