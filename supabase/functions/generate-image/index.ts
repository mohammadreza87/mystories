/**
 * Generate Image Edge Function using Leonardo AI
 *
 * Creates images using Leonardo AI's API for both children's
 * book illustrations and adult comic book panels.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageRequest {
  prompt: string;
  size?: string;
  styleReference?: string;
  isAdultComic?: boolean;
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", body);

    const { prompt, styleReference, isAdultComic, modelId }: ImageRequest = body;

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

    // Build generation config based on content type
    let generationConfig: GenerationConfig = {
      modelId: modelId || LEONARDO_MODELS.lucidOrigin,
      styleUUID: LEONARDO_STYLES.cinematic,
      contrast: 3.5,
      width: 1024,
      height: 1024,
    };

    if (isComic && styleReference) {
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
      }
    } else if (!isComic) {
      // For children's book illustrations
      generationConfig = {
        modelId: LEONARDO_MODELS.phoenix,
        styleUUID: LEONARDO_STYLES.vibrant,
        contrast: 3,
        width: 1024,
        height: 1024,
      };
    }

    // Build the prompt
    const safeStyle = (styleReference || "").slice(0, 800);
    const safePrompt = (prompt || "").slice(0, 800);

    let fullPrompt: string;

    if (isComic) {
      // Adult comic book style prompt
      fullPrompt = styleReference
        ? `${safeStyle} ${safePrompt} Professional comic book art, cinematic composition, dramatic lighting, no text or speech bubbles, highly detailed.`
        : `${safePrompt} Professional comic book panel, graphic novel style, cinematic composition, dramatic lighting, no text or speech bubbles, highly detailed.`;
    } else {
      // Children's book style prompt
      fullPrompt = styleReference
        ? `Children's book illustration style. ${safeStyle}. Scene: ${safePrompt}. Colorful, warm, friendly, whimsical, no text or letters.`
        : `Children's book illustration: ${safePrompt}. Colorful, friendly, warm, whimsical style, suitable for ages 5-10. No text or letters.`;
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
