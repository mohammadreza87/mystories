/**
 * Generate short video clips using Leonardo AI.
 * Requires LEONARDO_API_KEY to be set in project config.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticate } from "../_shared/auth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { CORS_HEADERS } from "../_shared/cors.ts";

const LEONARDO_API_BASE = "https://cloud.leonardo.ai/api/rest/v1";
const DEFAULT_MODEL_ID = "motion-brush-1"; // placeholder model id; replace with your preferred Leonardo motion model

interface VideoRequest {
  prompt: string;
  duration?: number; // seconds
  aspectRatio?: string; // e.g., "16:9"
  modelId?: string;
}

interface LeonardoVideoJob {
  motionGenerationJob?: {
    motionId?: string;
  };
}

interface LeonardoVideoResult {
  motionByPk?: {
    status?: string;
    generated?: { url: string }[];
  };
}

const corsHeaders = CORS_HEADERS;

async function createVideoJob(apiKey: string, payload: VideoRequest): Promise<string> {
  const response = await fetch(`${LEONARDO_API_BASE}/motions`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prompt: payload.prompt,
      modelId: payload.modelId || DEFAULT_MODEL_ID,
      duration: payload.duration || 8,
      aspectRatio: payload.aspectRatio || "16:9",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Leonardo create motion failed: ${errorText}`);
  }

  const data = await response.json() as LeonardoVideoJob;
  const motionId = data.motionGenerationJob?.motionId;
  if (!motionId) throw new Error("No motionId returned from Leonardo");
  return motionId;
}

async function pollVideo(apiKey: string, motionId: string, attempts = 40, delayMs = 2500): Promise<string> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(`${LEONARDO_API_BASE}/motions/${motionId}`, {
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

    const data = await res.json() as LeonardoVideoResult;
    const motion = data.motionByPk;
    if (motion?.status === "COMPLETE" && motion.generated?.length) {
      return motion.generated[0].url;
    }
    if (motion?.status === "FAILED") {
      throw new Error("Video generation failed");
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Video generation timed out");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const motionId = await createVideoJob(apiKey, body);
    const videoUrl = await pollVideo(apiKey, motionId);

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
