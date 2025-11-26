/**
 * Generate short video clips using Leonardo AI.
 * First generates an image from the prompt, then animates it using Motion SVD.
 * Requires LEONARDO_API_KEY to be set in project config.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { CORS_HEADERS } from "../_shared/cors.ts";

const LEONARDO_API_BASE = "https://cloud.leonardo.ai/api/rest/v1";

// Leonardo model for image generation (Phoenix for quality)
const DEFAULT_IMAGE_MODEL = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";

interface VideoRequest {
  prompt: string;
  motionStrength?: number; // 1-10, default 5
  aspectRatio?: string; // e.g., "16:9"
}

interface LeonardoImageJob {
  sdGenerationJob?: {
    generationId?: string;
  };
}

interface LeonardoImageResult {
  generations_by_pk?: {
    status?: string;
    generated_images?: Array<{
      id: string;
      url: string;
    }>;
  };
}

interface LeonardoMotionJob {
  motionSvdGenerationJob?: {
    generationId?: string;
    apiCreditCost?: number;
  };
}

interface LeonardoMotionResult {
  motionSvdGenerationsByPk?: {
    id?: string;
    status?: string;
    motionMP4URL?: string;
  };
}

const corsHeaders = CORS_HEADERS;

/**
 * Step 1: Create an image generation job from the prompt
 */
async function createImageJob(apiKey: string, prompt: string, aspectRatio: string): Promise<string> {
  // Calculate dimensions based on aspect ratio
  let width = 1024;
  let height = 576;

  if (aspectRatio === "16:9") {
    width = 1024;
    height = 576;
  } else if (aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  } else if (aspectRatio === "1:1") {
    width = 768;
    height = 768;
  }

  const response = await fetch(`${LEONARDO_API_BASE}/generations`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt: `Cinematic still frame, movie quality, ${prompt}. No text, no watermarks.`,
      modelId: DEFAULT_IMAGE_MODEL,
      width,
      height,
      num_images: 1,
      alchemy: false,
      enhancePrompt: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Leonardo create image failed: ${errorText}`);
  }

  const data = await response.json() as LeonardoImageJob;
  const generationId = data.sdGenerationJob?.generationId;
  if (!generationId) throw new Error("No generationId returned from Leonardo image generation");
  return generationId;
}

/**
 * Step 2: Poll for the image to complete and get the image ID
 */
async function pollImageCompletion(apiKey: string, generationId: string, attempts = 30, delayMs = 2000): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${LEONARDO_API_BASE}/generations/${generationId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    const data = await res.json() as LeonardoImageResult;
    const generation = data.generations_by_pk;

    if (generation?.status === "COMPLETE" && generation.generated_images?.length) {
      // Return the image ID (not URL) - this is needed for motion generation
      return generation.generated_images[0].id;
    }
    if (generation?.status === "FAILED") {
      throw new Error("Image generation failed");
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Image generation timed out");
}

/**
 * Step 3: Create a motion SVD job to animate the image
 */
async function createMotionJob(apiKey: string, imageId: string, motionStrength: number): Promise<string> {
  const response = await fetch(`${LEONARDO_API_BASE}/generations-motion-svd`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      imageId,
      motionStrength,
      isPublic: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Leonardo create motion failed: ${errorText}`);
  }

  const data = await response.json() as LeonardoMotionJob;
  const generationId = data.motionSvdGenerationJob?.generationId;
  if (!generationId) throw new Error("No generationId returned from Leonardo motion generation");
  return generationId;
}

/**
 * Step 4: Poll for the motion/video to complete
 */
async function pollMotionCompletion(apiKey: string, generationId: string, attempts = 60, delayMs = 3000): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${LEONARDO_API_BASE}/generations-motion-svd/${generationId}`, {
      method: "GET",
      headers: {
        "accept": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    const data = await res.json() as LeonardoMotionResult;
    const motion = data.motionSvdGenerationsByPk;

    if (motion?.status === "COMPLETE" && motion.motionMP4URL) {
      return motion.motionMP4URL;
    }
    if (motion?.status === "FAILED") {
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

    const motionStrength = body.motionStrength ?? 5;
    const aspectRatio = body.aspectRatio ?? "16:9";

    console.log("Step 1: Creating image from prompt...");
    const imageGenerationId = await createImageJob(apiKey, body.prompt, aspectRatio);
    console.log("Image generation started:", imageGenerationId);

    console.log("Step 2: Waiting for image completion...");
    const imageId = await pollImageCompletion(apiKey, imageGenerationId);
    console.log("Image completed, ID:", imageId);

    console.log("Step 3: Creating motion from image...");
    const motionGenerationId = await createMotionJob(apiKey, imageId, motionStrength);
    console.log("Motion generation started:", motionGenerationId);

    console.log("Step 4: Waiting for video completion...");
    const videoUrl = await pollMotionCompletion(apiKey, motionGenerationId);
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
