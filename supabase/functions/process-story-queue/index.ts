import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NodeToGenerate {
  nodeKey: string;
  parentNodeId?: string;
  choiceText?: string;
  choiceHint?: string;
  choiceOrder?: number;
  depth: number;
  previousContent: string;
}

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
    
    if (!deepseekApiKey) {
      throw new Error("DeepSeek API key not configured");
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

    const { data: startNode } = await supabase
      .from("story_nodes")
      .select("*")
      .eq("story_id", storyId)
      .eq("node_key", "start")
      .maybeSingle();

    if (!startNode) {
      throw new Error("Start node not found. Story was not properly initialized.");
    }

    const { data: existingChoices } = await supabase
      .from("story_choices")
      .select(`
        *,
        to_node:story_nodes!story_choices_to_node_id_fkey(*)
      `)
      .eq("from_node_id", startNode.id)
      .order("choice_order");

    if (!existingChoices || existingChoices.length === 0) {
      throw new Error("No choices found for start node. Story was not properly initialized.");
    }

    const choicesData = existingChoices.map((choice, i) => ({
      nodeKey: `node_1_${i + 1}`,
      parentNodeId: choice.to_node_id,
      choiceText: choice.choice_text,
      choiceHint: choice.consequence_hint,
      choiceOrder: i,
      depth: 1,
      previousContent: startNode.content,
    }));

    const totalNodesEstimate = 1 + 3 + 9 + 27;

    await supabase
      .from("stories")
      .update({
        generation_status: "generating_background",
        generation_started_at: new Date().toISOString(),
        generation_progress: 15,
        nodes_generated: 1,
        total_nodes_planned: totalNodesEstimate,
      })
      .eq("id", storyId);

    generateStoryTree(storyId, story, choicesData, supabase, deepseekApiKey, supabaseUrl, supabaseServiceKey);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "First chapter generated, background generation started",
        progress: 10,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing story queue:", error);
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

async function generateStoryTree(
  storyId: string,
  story: any,
  nodesToGenerate: NodeToGenerate[],
  supabase: any,
  deepseekApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string
) {
  try {
    await supabase
      .from("stories")
      .update({ generation_status: "generating_full_story" })
      .eq("id", storyId);

    const maxDepth = 3; // keep shallow to reduce latency and cost
    const queue = [...nodesToGenerate];
    let generatedCount = 1;
    const totalNodes = await estimateTotalNodes(storyId, supabase);

    while (queue.length > 0) {
      const node = queue.shift()!;
      
      if (node.depth > maxDepth) {
        continue;
      }

      try {
        const targetAudience = story.target_audience || 'children';
        const contextLength = targetAudience === 'adult' ? 3000 : targetAudience === 'young_adult' ? 2000 : 1200;
        const trimmedContext = (story.story_context || "").slice(0, contextLength);
        const trimmedPrevious = (node.previousContent || "").slice(-contextLength);

        const response = await fetch(
          `${supabaseUrl}/functions/v1/generate-story`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              storyContext: trimmedContext,
              userChoice: node.choiceText,
              previousContent: trimmedPrevious,
              storyTitle: story.title,
              chapterCount: node.depth,
              targetAudience,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to generate node content");
        }

        const generatedContent = await response.json();

        // Only validate kid-friendly for children's content
        const isKidFriendly = targetAudience === 'children'
          ? await validateKidFriendlyContent(generatedContent.content, deepseekApiKey)
          : true;
        if (!isKidFriendly) {
          console.warn(`Content not kid-friendly for node ${node.nodeKey}, regenerating...`);
          continue;
        }

        const { data: updatedNode, error: updateError } = await supabase
          .from("story_nodes")
          .update({
            node_key: node.nodeKey,
            content: generatedContent.content,
            is_ending: generatedContent.isEnding || false,
            ending_type: generatedContent.endingType,
            is_placeholder: false,
            generation_attempts: 1,
          })
          .eq("id", node.parentNodeId)
          .select()
          .single();

        if (updateError || !updatedNode) {
          console.error("Failed to update node:", updateError);
          continue;
        }

        generatedCount++;
        const progress = Math.min(95, Math.floor((generatedCount / totalNodes) * 100));

        await supabase
          .from("stories")
          .update({
            nodes_generated: generatedCount,
            generation_progress: progress,
          })
          .eq("id", storyId);

        if (!updatedNode.audio_url) {
          await generateAudio(updatedNode.id, generatedContent.content, supabaseUrl, supabaseServiceKey);
        }

        if (!generatedContent.isEnding && generatedContent.choices && generatedContent.choices.length > 0 && node.depth < maxDepth) {
          for (let i = 0; i < generatedContent.choices.length; i++) {
            const choice = generatedContent.choices[i];
            
            const { data: placeholderNode } = await supabase
              .from("story_nodes")
              .insert({
                story_id: storyId,
                node_key: `node_${node.depth + 1}_${generatedCount}_${i}_placeholder`,
                content: "",
                is_placeholder: true,
                order_index: node.depth + 1,
              })
              .select()
              .single();

            if (placeholderNode) {
              await supabase
                .from("story_choices")
                .insert({
                  from_node_id: updatedNode.id,
                  to_node_id: placeholderNode.id,
                  choice_text: choice.text,
                  choice_hint: choice.hint,
                  choice_order: i,
                });

              queue.push({
                nodeKey: `node_${node.depth + 1}_${generatedCount}_${i}`,
                parentNodeId: placeholderNode.id,
                choiceText: choice.text,
                choiceHint: choice.hint,
                choiceOrder: i,
                depth: node.depth + 1,
                previousContent: generatedContent.content,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error generating node ${node.nodeKey}:`, error);
        
        await supabase
          .from("story_nodes")
          .update({
            generation_failed: true,
            generation_attempts: 1,
          })
          .eq("id", node.parentNodeId);
      }
    }

    await supabase
      .from("stories")
      .update({
        generation_status: "fully_generated",
        generation_progress: 100,
        generation_completed_at: new Date().toISOString(),
      })
      .eq("id", storyId);

    console.log(`Story ${storyId} fully generated`);

    try {
      console.log(`Generating all images for story ${storyId}`);
      await generateAllImages(storyId, supabaseUrl, supabaseServiceKey);
    } catch (error) {
      console.error(`Error generating images for story ${storyId}:`, error);
    }
  } catch (error) {
    console.error("Error in generateStoryTree:", error);
    
    await supabase
      .from("stories")
      .update({
        generation_status: "generation_failed",
      })
      .eq("id", storyId);
  }
}

async function validateKidFriendlyContent(content: string, deepseekApiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
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
            content: "You are a content moderator for children's stories. Analyze if the content is appropriate for kids aged 5-10. Return only 'YES' if appropriate or 'NO' if inappropriate.",
          },
          {
            role: "user",
            content: `Is this content appropriate for children aged 5-10? Check for violence, scary content, inappropriate themes, or anything that might frighten or upset young children.\n\nContent: ${content}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error("Validation API error:", await response.text());
      return true;
    }

    const data = await response.json();
    const result = data.choices[0].message.content.trim().toUpperCase();
    return result.includes("YES");
  } catch (error) {
    console.error("Error validating content:", error);
    return true;
  }
}

async function estimateTotalNodes(storyId: string, supabase: any): Promise<number> {
  const { count } = await supabase
    .from("story_nodes")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);
  
  return Math.max(count || 40, 40);
}

async function generateAudio(nodeId: string, content: string, supabaseUrl: string, supabaseServiceKey: string) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/text-to-speech`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          text: content,
          nodeId,
        }),
      }
    );

    if (!response.ok) {
      console.error(`Failed to generate audio for node ${nodeId}`);
    }
  } catch (error) {
    console.error(`Error generating audio for node ${nodeId}:`, error);
  }
}

async function generateAllImages(storyId: string, supabaseUrl: string, supabaseServiceKey: string) {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-all-images`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          storyId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.error(`Failed to generate images:`, errorData);
      throw new Error(errorData.error || "Failed to generate images");
    }

    const result = await response.json();
    console.log(`All images generated successfully for story ${storyId}`);
  } catch (error) {
    console.error(`Error generating images:`, error);
    throw error;
  }
}
