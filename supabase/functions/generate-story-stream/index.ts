import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StoryRequest {
  storyContext?: string;
  userChoice?: string;
  previousContent?: string;
  storyTitle?: string;
  userPrompt?: string;
  generateFullStory?: boolean;
  chapterCount?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { storyContext, userChoice, previousContent, storyTitle, userPrompt, generateFullStory, chapterCount }: StoryRequest = await req.json();

    // Check usage limits for full story generation
    if (generateFullStory) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("subscription_tier, is_grandfathered, stories_generated_today, last_generation_date")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        const hasPro = profile.subscription_tier === "pro" || profile.is_grandfathered;
        if (!hasPro) {
          const today = new Date().toISOString().split('T')[0];
          const todayCount = profile.last_generation_date === today ? profile.stories_generated_today : 0;
          if (todayCount >= 1) {
            return new Response(
              JSON.stringify({
                error: "daily_limit_reached",
                message: "You've reached your daily limit of 1 story. Upgrade to Pro for unlimited stories!",
                limit: 1,
                used: todayCount
              }),
              {
                status: 403,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
      }
    }

    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: "DeepSeek API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Construct prompts (same as before)
    let systemPrompt = "";
    let actualUserPrompt = "";

    if (generateFullStory && userPrompt) {
      systemPrompt = `You are a creative children's story writer. Create a SHORT, PUNCHY opening chapter that HOOKS kids immediately!

CRITICAL LANGUAGE REQUIREMENT:
- Detect the language of the user's prompt
- Write EVERYTHING in THAT EXACT LANGUAGE

STORY RULES:
1. Keep content appropriate for children (no violence, scary content, or inappropriate themes)
2. Create engaging stories for kids aged 5-10
3. START WITH ACTION or something exciting - NO boring setup!
4. Opening: 1-2 SHORT paragraphs (3-4 sentences MAX). Make every word count!
5. Provide 2-3 exciting choices

Return ONLY valid JSON:
{
  "title": "Catchy Story Title",
  "description": "1 sentence HOOK",
  "ageRange": "5-10",
  "estimatedDuration": 10,
  "storyContext": "Key context for continuation",
  "startContent": "SHORT, PUNCHY opening (1-2 paragraphs, 3-4 sentences MAX)",
  "initialChoices": [
    {"text": "Exciting choice 1", "hint": "Quick hint"},
    {"text": "Exciting choice 2", "hint": "Quick hint"}
  ],
  "language": "en"
}`;

      actualUserPrompt = `User's story request: "${userPrompt}"
Create a SHORT, CATCHY opening that grabs attention IMMEDIATELY! No filler - jump into the action!`;
    } else {
      const currentChapter = chapterCount || 0;
      const minimumChapters = 3;
      const maximumChapters = 6;
      const shouldPreventEnding = currentChapter < minimumChapters;
      const shouldEncourageEnding = currentChapter >= maximumChapters;

      systemPrompt = `You are a creative children's story writer for kids aged 5-10. Keep it SHORT and EXCITING!

CRITICAL: Continue in the SAME LANGUAGE as the previous content.

STORY RULES:
1. Keep content appropriate for children
2. KEEP IT SHORT: 1-2 paragraphs (3-4 sentences MAX). No filler!
3. Jump to the consequences FAST - keep momentum high
4. Stories MUST have at least ${minimumChapters} chapters before ending
5. Stories SHOULD end by chapter ${maximumChapters}
6. ${shouldPreventEnding ? `Chapter ${currentChapter + 1}: DO NOT END. Provide 2-3 exciting choices.` : shouldEncourageEnding ? `Chapter ${currentChapter + 1}: Wrap up the story with a satisfying ending.` : `Chapter ${currentChapter + 1}: Keep it exciting and moving forward!`}

Return ONLY valid JSON:
{
  "content": "SHORT chapter text (1-2 paragraphs MAX)",
  "choices": [{"text": "Exciting choice 1", "hint": "Quick hint"}, {"text": "Exciting choice 2", "hint": "Quick hint"}],
  "isEnding": false,
  "endingType": null
}`;

      if (userChoice && previousContent) {
        actualUserPrompt = `Story Title: ${storyTitle || "Adventure"}
Previous part: ${previousContent}
The reader chose: "${userChoice}"
Continue the story - show consequences FAST. Keep it SHORT (1-2 paragraphs). No filler!`;
      } else {
        actualUserPrompt = `Start a new story with this theme: ${storyContext}
Create a SHORT, CATCHY opening with 2-3 exciting choices.`;
      }
    }

    // Create streaming response
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: actualUserPrompt }
        ],
        temperature: 0.8,
        max_tokens: 600,
        stream: true, // Enable streaming
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(
        JSON.stringify({ error: "Failed to generate story", details: error }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Set up SSE (Server-Sent Events) for streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  // Parse accumulated content and send final JSON
                  try {
                    const jsonMatch = accumulatedContent.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                      const storyData = JSON.parse(jsonMatch[0]);

                      // Update usage counter if needed
                      if (generateFullStory) {
                        const today = new Date().toISOString().split('T')[0];
                        const { data: currentProfile } = await supabase
                          .from("user_profiles")
                          .select("last_generation_date, stories_generated_today, total_stories_generated")
                          .eq("id", user.id)
                          .maybeSingle();

                        const isNewDay = currentProfile?.last_generation_date !== today;

                        await supabase
                          .from("user_profiles")
                          .update({
                            stories_generated_today: isNewDay ? 1 : (currentProfile?.stories_generated_today || 0) + 1,
                            last_generation_date: today,
                            total_stories_generated: (currentProfile?.total_stories_generated || 0) + 1,
                          })
                          .eq("id", user.id);
                      }

                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "complete", data: storyData })}\n\n`));
                    }
                  } catch (e) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Failed to parse response" })}\n\n`));
                  }
                  controller.close();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    accumulatedContent += content;
                    // Send progress updates
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "progress", content })}\n\n`));
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
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