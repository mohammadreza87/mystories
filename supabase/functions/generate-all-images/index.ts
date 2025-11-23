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

    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("id", storyId)
      .single();

    if (storyError || !story) {
      throw new Error("Story not found");
    }

    const { data: nodes, error: nodesError } = await supabase
      .from("story_nodes")
      .select("id, content, node_key, is_ending, image_url")
      .eq("story_id", storyId)
      .eq("is_placeholder", false)
      .order("order_index");

    if (nodesError || !nodes || nodes.length === 0) {
      throw new Error("No story content found");
    }

    console.log(`Generating images for ${nodes.length} nodes in story ${storyId}`);

    const storyContext = `Title: ${story.title}
Description: ${story.description}

Full Story Content:
${nodes.map((node, i) => `Chapter ${i + 1}:\n${node.content}`).join("\n\n")}`;

    const styleGuideResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
            content: "You are an expert at analyzing children's stories and creating consistent visual style guides. Extract key character descriptions, setting details, and art style that should remain consistent throughout all illustrations.",
          },
          {
            role: "user",
            content: `Analyze this children's story and create a detailed style guide for illustrations.

${storyContext.substring(0, 3000)}

Provide a JSON response with:
1. "characters": Array of main characters with detailed physical descriptions (age, appearance, clothing, colors)
2. "artStyle": Description of the illustration style (e.g., "watercolor children's book illustration", "digital cartoon art")
3. "setting": Main setting and environment details
4. "colorPalette": Color scheme to use

Example format:
{
  "characters": [{"name": "Cookie the cat", "description": "A small fluffy orange tabby cat with bright green eyes, wearing a red collar with a bell"}],
  "artStyle": "Warm, colorful digital illustration in children's book style",
  "setting": "A cozy suburban neighborhood with friendly houses",
  "colorPalette": "Warm tones with orange, green, and blue accents"
}

Respond with ONLY valid JSON, no other text.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!styleGuideResponse.ok) {
      throw new Error("Failed to generate style guide");
    }

    const styleData = await styleGuideResponse.json();
    let styleGuide;

    try {
      const content = styleData.choices[0].message.content.trim();
      const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
      styleGuide = JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse style guide:", e);
      styleGuide = {
        characters: [],
        artStyle: "Colorful children's book illustration",
        setting: story.description,
        colorPalette: "Bright and cheerful colors"
      };
    }

    console.log("Style guide generated:", styleGuide);

    let previousImageDescription = "";

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.image_url) {
        console.log(`Node ${node.node_key} already has image, skipping`);
        previousImageDescription = `Image shows: ${node.content.substring(0, 150)}`;
        continue;
      }

      console.log(`Generating image for node ${i + 1}/${nodes.length}: ${node.node_key}`);

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
              content: "You create detailed DALL-E prompts for children's book illustrations. Maintain character and style consistency across all images. Be specific about character appearances, actions, and scene details.",
            },
            {
              role: "user",
              content: `Create a DALL-E prompt for this chapter's illustration.

STYLE GUIDE (MUST FOLLOW):
${JSON.stringify(styleGuide, null, 2)}

${previousImageDescription ? `PREVIOUS IMAGE: ${previousImageDescription}\n(Characters must look the same as before!)` : 'This is the FIRST image - establish character appearances clearly.'}

CHAPTER ${i + 1} CONTENT:
${node.content}

Requirements:
- Follow the style guide EXACTLY - especially character descriptions
- ${previousImageDescription ? 'Characters MUST look identical to previous images' : 'Establish clear character appearances'}
- Show the main action/emotion of this chapter
- Use the specified art style: ${styleGuide.artStyle}
- Apply the color palette: ${styleGuide.colorPalette}
- Make it engaging for children aged 5-10
- NO text or words in the image
- End with "without any text or words"

Respond with ONLY the image prompt, nothing else.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 250,
        }),
      });

      if (!promptResponse.ok) {
        console.error(`Failed to generate prompt for node ${node.node_key}`);
        continue;
      }

      const promptData = await promptResponse.json();
      let imagePrompt = promptData.choices[0].message.content.trim();

      if (!imagePrompt.toLowerCase().includes("without any text")) {
        imagePrompt += ", without any text or words";
      }

      console.log(`Prompt for node ${node.node_key}:`, imagePrompt);

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
        console.error(`DALL-E error for node ${node.node_key}:`, errorText);
        continue;
      }

      const imageData = await imageResponse.json();
      const imageUrl = imageData.data[0].url;

      const imageBlob = await fetch(imageUrl).then(res => res.blob());
      const imageBuffer = await imageBlob.arrayBuffer();
      const fileName = `${node.id}.png`;

      const { error: uploadError } = await supabase
        .storage
        .from("story-images")
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.error(`Upload error for node ${node.node_key}:`, uploadError);
        continue;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("story-images")
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      await supabase
        .from("story_nodes")
        .update({ image_url: publicUrl })
        .eq("id", node.id);

      console.log(`Image generated for node ${node.node_key}`);

      previousImageDescription = `${imagePrompt.substring(0, 200)}`;

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const startNode = nodes.find(n => n.node_key === 'start');
    if (startNode && startNode.image_url) {
      await supabase
        .from("stories")
        .update({ cover_image_url: startNode.image_url })
        .eq("id", storyId);

      console.log("Cover image set from start node");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated images for ${nodes.length} chapters`,
        imagesGenerated: nodes.filter(n => n.image_url).length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating images:", error);
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
