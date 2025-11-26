/**
 * Generate short video clips using Leonardo AI's Text-to-Video API.
 * Uses the direct text-to-video endpoint for faster generation.
 * Requires LEONARDO_API_KEY to be set in project config.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { CORS_HEADERS } from "../_shared/cors.ts";

const LEONARDO_API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

// Leonardo Style UUIDs (same as generate-image)
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

// Map user-facing art styles to Leonardo styles and prompt prefixes
const ART_STYLE_CONFIG: Record<string, { styleId: string; promptPrefix: string }> = {
  cartoon: {
    styleId: LEONARDO_STYLES.vibrant,
    promptPrefix: 'Colorful cartoon animation style, fun and playful, bold outlines, vibrant colors, Pixar-inspired, friendly character designs, whimsical atmosphere',
  },
  comic: {
    styleId: LEONARDO_STYLES.cinematic,
    promptPrefix: 'Professional comic book art style, graphic novel illustration, bold ink outlines, cel-shaded coloring, dramatic shadows, dynamic composition',
  },
  realistic: {
    styleId: LEONARDO_STYLES.cinematicCloseUp,
    promptPrefix: 'Photorealistic cinematic style, movie quality, hyperrealistic, dramatic lighting, film-quality visuals, detailed textures, award-winning cinematography',
  },
};

interface VideoRequest {
  prompt: string;
  artStyle?: 'cartoon' | 'comic' | 'realistic';
  motionStrength?: number; // Kept for backward compatibility but not used in text-to-video
  aspectRatio?: '16:9' | '9:16' | '2:3' | '4:5'; // Supported aspect ratios
}

// Video dimension mappings for different aspect ratios (per Leonardo API docs)
const VIDEO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '16:9': { width: 832, height: 480 },
  '9:16': { width: 480, height: 832 },
  '2:3': { width: 512, height: 768 },
  '4:5': { width: 576, height: 720 },
};

// List of sensitive terms to sanitize from prompts (same as generate-image)
const SENSITIVE_TERMS: Record<string, string> = {
  // Historical figures - replace with generic descriptions
  'kennedy': 'a distinguished political leader',
  'jfk': 'a distinguished political leader',
  'hitler': 'a stern military leader',
  'nazi': 'authoritarian regime',
  'nazis': 'authoritarian soldiers',
  'holocaust': 'historical tragedy',
  'stalin': 'a cold authoritarian leader',
  'mussolini': 'a dictatorial figure',
  'robespierre': 'a revolutionary leader',
  'guillotine': 'execution platform',
  'mao': 'an eastern political leader',
  'pol pot': 'a ruthless leader',
  'bin laden': 'a bearded extremist figure',
  'isis': 'militant group',
  'al qaeda': 'terrorist organization',
  'kkk': 'hooded figures',
  'ku klux': 'hooded figures',
  // Violence and injury terms
  'assassination': 'fateful moment',
  'assassin': 'attacker',
  'blood': 'crimson',
  'bloody': 'intense',
  'bleeding': 'wounded',
  'murder': 'dramatic confrontation',
  'killing': 'intense conflict',
  'torture': 'interrogation',
  'execution': 'fateful moment',
  'terrorist': 'extremist',
  'terrorism': 'extremism',
  'corpse': 'fallen figure',
  'dead': 'fallen',
  'death': 'fate',
  'dying': 'fading',
  'gun': 'weapon',
  'rifle': 'long weapon',
  'pistol': 'small weapon',
  'shoot': 'strike',
  'shooting': 'attack',
  'shot': 'struck',
  'bomb': 'explosion',
  'bombing': 'explosive event',
  // Political symbols
  'swastika': 'authoritarian symbol',
  'confederate': 'historical faction',
};

/**
 * Sanitize prompt to avoid content moderation issues
 */
function sanitizePrompt(prompt: string): string {
  let sanitized = prompt;

  // Replace sensitive terms with safer alternatives
  for (const [term, replacement] of Object.entries(SENSITIVE_TERMS)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }

  // Additional cleanup for common violent phrases
  sanitized = sanitized
    .replace(/\b(scream|screaming|screamed)\b/gi, 'cried out')
    .replace(/\b(pain|painful|pained)\b/gi, 'sensation')
    .replace(/\b(wound|wounded|wounds)\b/gi, 'injury')
    .replace(/\b(kill|killed|kills)\b/gi, 'fell');

  return sanitized;
}

interface LeonardoTextToVideoJob {
  textToVideoGenerationJob?: {
    generationId?: string;
    apiCreditCost?: number;
  };
}

interface LeonardoTextToVideoResult {
  textToVideoGenerationsByPk?: {
    id?: string;
    status?: string;
    url?: string;
  };
}

const corsHeaders = CORS_HEADERS;

/**
 * Create a text-to-video generation job
 */
async function createTextToVideoJob(
  apiKey: string,
  prompt: string,
  styleId: string | null,
  dimensions: { width: number; height: number }
): Promise<string> {
  const requestBody: Record<string, unknown> = {
    prompt,
    width: dimensions.width,
    height: dimensions.height,
    resolution: "RESOLUTION_720", // Good quality without being too slow
    isPublic: false,
    promptEnhance: true, // Let Leonardo enhance the prompt for better results
    frameInterpolation: true, // Smooth video effect
  };

  // Add style if provided
  if (styleId) {
    requestBody.styleIds = [styleId];
  }

  console.log("Creating text-to-video job with body:", JSON.stringify(requestBody));

  const response = await fetch(`${LEONARDO_API_BASE}/generations-text-to-video`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Leonardo text-to-video error:", errorText);
    throw new Error(`Leonardo create text-to-video failed: ${errorText}`);
  }

  const data = await response.json() as LeonardoTextToVideoJob;
  console.log("Leonardo response:", JSON.stringify(data));

  const generationId = data.textToVideoGenerationJob?.generationId;
  if (!generationId) throw new Error("No generationId returned from Leonardo text-to-video generation");
  return generationId;
}

/**
 * Poll for text-to-video completion
 */
async function pollTextToVideoCompletion(
  apiKey: string,
  generationId: string,
  attempts = 60,
  delayMs = 3000
): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${LEONARDO_API_BASE}/generations-text-to-video/${generationId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.log(`Poll attempt ${i + 1} failed, retrying...`);
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    const data = await res.json() as LeonardoTextToVideoResult;
    const video = data.textToVideoGenerationsByPk;

    console.log(`Poll attempt ${i + 1}: status = ${video?.status}`);

    if (video?.status === "COMPLETE" && video.url) {
      return video.url;
    }
    if (video?.status === "FAILED") {
      throw new Error("Video generation failed");
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Video generation timed out");
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const authResponse = await authenticate(req);
  if (authResponse instanceof Response) {
    return authResponse;
  }

  const rateLimited = await enforceRateLimit(req, { maxRequests: 10, windowSeconds: 60 });
  if (rateLimited) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("LEONARDO_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "LEONARDO_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json() as VideoRequest;
    if (!body.prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get art style configuration
    const artStyle = body.artStyle || 'comic'; // Default to comic style
    const styleConfig = ART_STYLE_CONFIG[artStyle] || ART_STYLE_CONFIG.comic;

    // Get video dimensions based on aspect ratio (default to 16:9)
    const aspectRatio = body.aspectRatio || '16:9';
    const dimensions = VIDEO_DIMENSIONS[aspectRatio] || VIDEO_DIMENSIONS['16:9'];

    // Sanitize the prompt to avoid content moderation issues
    const sanitizedUserPrompt = sanitizePrompt(body.prompt);

    // Build the video prompt with style prefix
    const videoPrompt = `${styleConfig.promptPrefix}. ${sanitizedUserPrompt}. No text, no watermarks, cinematic motion.`;

    console.log("Creating text-to-video with art style:", artStyle);
    console.log("Aspect ratio:", aspectRatio, "Dimensions:", dimensions);
    console.log("Full prompt:", videoPrompt);

    // Step 1: Create text-to-video job
    const generationId = await createTextToVideoJob(apiKey, videoPrompt, styleConfig.styleId, dimensions);
    console.log("Text-to-video generation started:", generationId);

    // Step 2: Poll for completion
    console.log("Waiting for video completion...");
    const videoUrl = await pollTextToVideoCompletion(apiKey, generationId);
    console.log("Video completed:", videoUrl);

    return new Response(JSON.stringify({ videoUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message || "Video generation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
