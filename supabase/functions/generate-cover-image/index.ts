import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!deepseekApiKey) {
      throw new Error("DeepSeek API key not configured");
    }

    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { storyId } = await req.json();

    if (!storyId) {
      return new Response(
        JSON.stringify({ error: "Story ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get story details
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      throw new Error("Story not found");
    }

    // Check if story already has a cover image
    if (story.cover_image_url) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Story already has a cover image",
          coverImageUrl: story.cover_image_url,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get all story nodes to understand the story
    const { data: nodes, error: nodesError } = await supabase
      .from("story_nodes")
      .select("content, node_key, is_ending")
      .eq("story_id", storyId)
      .order("order_index");

    if (nodesError || !nodes || nodes.length === 0) {
      throw new Error("No story content found");
    }

    // Collect story summary (first few nodes)
    const storySummary = nodes
      .slice(0, 5)
      .map(node => node.content)
      .join("\n\n");

    // Use DeepSeek to generate a detailed image prompt
    const promptResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "You are an expert at creating detailed image prompts for children's book covers. Create vivid, colorful, and engaging prompts that capture the essence of the story. The images should be appropriate for children aged 5-10.",
          },
          {
            role: "user",
            content: `Create a detailed DALL-E image prompt for a children's book cover based on this story.

Story Title: ${story.title}
Story Description: ${story.description}

Story Beginning:
${storySummary.substring(0, 800)}

Requirements:
- The prompt should be detailed and descriptive
- Focus on the main character(s) and key story elements
- Include art style description (e.g., "digital illustration", "watercolor", "cartoon style")
- Specify it's for a children's book cover
- Make it colorful, friendly, and age-appropriate
- DO NOT include any text or words in the image
- The prompt MUST end with "without any text or words"

Respond with ONLY the image prompt, nothing else.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!promptResponse.ok) {
      const errorText = await promptResponse.text();
      console.error("DeepSeek API error:", errorText);
      throw new Error("Failed to generate image prompt");
    }

    const promptData = await promptResponse.json();
    let imagePrompt = promptData.choices[0].message.content.trim();

    // Ensure the prompt ends with "without any text"
    if (!imagePrompt.toLowerCase().includes("without any text") &&
        !imagePrompt.toLowerCase().includes("no text")) {
      imagePrompt += ", without any text or words";
    }

    console.log("Generated image prompt:", imagePrompt);

    // Generate image using DALL-E 3
    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("DALL-E API error:", errorText);
      throw new Error("Failed to generate cover image");
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data[0].url;

    // Download and upload to Supabase storage
    const imageBlob = await fetch(imageUrl).then(res => res.blob());
    const imageBuffer = await imageBlob.arrayBuffer();
    const fileName = `${storyId}-cover.png`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from("story-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload cover image");
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("story-images")
      .getPublicUrl(fileName);

    const coverImageUrl = publicUrlData.publicUrl;

    // Update story with cover image
    await supabase
      .from("stories")
      .update({ cover_image_url: coverImageUrl })
      .eq("id", storyId);

    console.log(`Cover image generated for story ${storyId}`);

    return new Response(
      JSON.stringify({
        success: true,
        coverImageUrl,
        prompt: imagePrompt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating cover image:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
