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

    const { prompt, styleReference, isAdultComic }: ImageRequest = body;

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

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Detect if this is a comic/graphic novel request based on style reference
    const isComic = isAdultComic || (styleReference && (
      styleReference.toLowerCase().includes('comic') ||
      styleReference.toLowerCase().includes('graphic novel') ||
      styleReference.toLowerCase().includes('manga') ||
      styleReference.toLowerCase().includes('noir') ||
      styleReference.toLowerCase().includes('cyberpunk')
    ));

    const safeStyle = (styleReference || "").slice(0, 600);
    const safePrompt = (prompt || "").slice(0, 600);

    let fullPrompt: string;

    if (isComic) {
      // Adult comic book style prompt
      fullPrompt = styleReference
        ? `${safeStyle} ${safePrompt} Professional comic book art, cinematic composition, dramatic lighting, no text or speech bubbles.`
        : `${safePrompt} Professional comic book panel, graphic novel style, cinematic composition, dramatic lighting, no text or speech bubbles.`;
    } else {
      // Children's book style prompt (original behavior)
      fullPrompt = styleReference
        ? `Children's book illustration. Keep characters identical to: ${safeStyle}. Scene: ${safePrompt}. Stay on the same palette and art style. No text or letters. Bright, gentle, age 5-10.`
        : `Children's book illustration: ${safePrompt}. Colorful, friendly, age 5-10. No text or letters.`;
    }

    console.log("Generating image with prompt length:", fullPrompt.length);

    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: fullPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard", // Use "hd" only if quality is critical
          response_format: "url",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate image", details: error }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return new Response(
        JSON.stringify({ error: "No image generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const imageUrl = data.data[0].url;

    // Download the image from OpenAI
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

    return new Response(
      JSON.stringify({
        imageUrl: publicUrlData.publicUrl,
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
