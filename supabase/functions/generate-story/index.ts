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
  targetAudience?: 'children' | 'young_adult' | 'adult';
}

interface GeneratedStory {
  content: string;
  choices: {
    text: string;
    hint: string;
  }[];
  isEnding: boolean;
  endingType?: string;
}

interface FullStoryData {
  title: string;
  description: string;
  ageRange: string;
  estimatedDuration: number;
  storyContext: string;
  startContent: string;
  initialChoices: {
    text: string;
    hint: string;
  }[];
  language?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get user from authorization header
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

    const { storyContext, userChoice, previousContent, storyTitle, userPrompt, generateFullStory, chapterCount, targetAudience = 'children' }: StoryRequest = await req.json();

    // Only check usage limits for full story generation (new story creation)
    if (generateFullStory) {
      // Get user profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("subscription_tier, is_grandfathered, stories_generated_today, last_generation_date")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch user profile" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if user has pro access (subscription or grandfathered)
      const hasPro = profile.subscription_tier === "pro" || profile.is_grandfathered;

      if (!hasPro) {
        // Free user - check daily limit
        const today = new Date().toISOString().split('T')[0];
        const lastGenDate = profile.last_generation_date;
        const todayCount = lastGenDate === today ? profile.stories_generated_today : 0;

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

    if (!storyContext && !userPrompt) {
      return new Response(
        JSON.stringify({ error: "Story context or user prompt is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    let systemPrompt = "";
    let actualUserPrompt = "";

    // Audience-specific configurations
    const audienceConfig = {
      children: {
        ageRange: "5-10",
        contentRules: "Child-appropriate content only. No violence, fear, weapons, death, or mature themes. Simple vocabulary.",
        chapterLength: "2-3 SHORT paragraphs (4-5 sentences max)",
        artStyle: "Warm, colorful children's book illustration",
        endingTypes: "happy/learning_moment/neutral",
        minChapters: 3,
        maxChapters: 6,
        maxTokens: 480,
        contextLength: 1200,
      },
      young_adult: {
        ageRange: "13-18",
        contentRules: "Teen-appropriate content. Mild conflict and drama allowed. No explicit content.",
        chapterLength: "3-4 paragraphs with more detail and emotional depth",
        artStyle: "Dynamic, modern YA book cover style",
        endingTypes: "triumphant/bittersweet/cliffhanger/redemption",
        minChapters: 4,
        maxChapters: 10,
        maxTokens: 700,
        contextLength: 2000,
      },
      adult: {
        ageRange: "18+",
        contentRules: "Adult content allowed. Complex themes, moral ambiguity, historical accuracy, political intrigue, war, consequences. No explicit sexual content.",
        chapterLength: "4-6 detailed paragraphs with rich narrative, dialogue, and character development",
        artStyle: "Cinematic, realistic, dramatic illustration",
        endingTypes: "triumphant/tragic/bittersweet/ambiguous/pyrrhic_victory/redemption",
        minChapters: 5,
        maxChapters: 15,
        maxTokens: 1200,
        contextLength: 3000,
      },
    };

    const config = audienceConfig[targetAudience] || audienceConfig.children;

    if (generateFullStory && userPrompt) {
      systemPrompt = `Create interactive story metadata and opening chapter for ${config.ageRange} audience.

Language rules (MANDATORY):
- Detect the language of the user prompt.
- Use that SAME language for EVERY field (title, description, storyContext, startContent, choices, styleGuide).
- If the user writes in English, respond ONLY in English.
- Never switch languages or translate to a different language.

Content rules for ${targetAudience} audience:
${config.contentRules}

Writing style:
- Opening chapter: ${config.chapterLength}
- Provide 2-3 meaningful choices that significantly impact the story direction
- For historical/biographical stories: Present real decision points the subject faced
- Make choices feel weighty with real consequences
- Match language of user prompt exactly

Return ONLY valid JSON:
{
  "title": "Story Title",
  "description": "2-3 sentence compelling description",
  "ageRange": "${config.ageRange}",
  "estimatedDuration": ${targetAudience === 'adult' ? 25 : targetAudience === 'young_adult' ? 15 : 10},
  "storyContext": "Detailed context for story continuation including key characters, setting, and narrative threads",
  "startContent": "Opening chapter (${config.chapterLength})",
  "initialChoices": [
    {"text": "Choice 1 - clear action", "hint": "Potential consequence or direction"},
    {"text": "Choice 2 - alternative path", "hint": "Different outcome possibility"}
  ],
  "language": "en",
  "styleGuide": {
    "characters": [{"name": "Name", "description": "Detailed appearance, personality, motivations"}],
    "artStyle": "${config.artStyle}",
    "setting": "Detailed setting description",
    "colorPalette": "Color scheme for visual consistency",
    "tone": "Overall narrative tone (dark/light/neutral)"
  }
}`;

      actualUserPrompt = `Story request: "${userPrompt}"

Target audience: ${targetAudience} (${config.ageRange})
Content guidelines: ${config.contentRules}

Create an engaging, immersive opening that hooks the reader and presents meaningful choices.
For historical/biographical content: Be historically accurate while allowing reader agency at key decision points.`;
    } else {
      const currentChapter = chapterCount || 0;
      const minimumChapters = config.minChapters;
      const maximumChapters = config.maxChapters;
      const shouldPreventEnding = currentChapter < minimumChapters;
      const mustEnd = currentChapter >= maximumChapters;
      const shouldEncourageEnding = currentChapter >= (maximumChapters - 2) && currentChapter < maximumChapters;

      systemPrompt = `Interactive story writer for ${config.ageRange} audience. Write in SAME language as previous content.

Content rules: ${config.contentRules}

Writing rules:
- Chapter length: ${config.chapterLength}
- Stories should be ${minimumChapters}-${maximumChapters} chapters
- ${shouldPreventEnding ? `Chapter ${currentChapter + 1}: DO NOT END. Provide 2-3 meaningful choices.` : mustEnd ? `Chapter ${currentChapter + 1}: THIS IS THE FINAL CHAPTER. You MUST end the story now. Set isEnding=true, provide endingType, set choices=[]` : shouldEncourageEnding ? `Chapter ${currentChapter + 1}: Start wrapping up. Build toward a satisfying conclusion.` : `Chapter ${currentChapter + 1}: Develop the plot with consequences from previous choice.`}
- Ending types for this audience: ${config.endingTypes}
- If ending: choices = []
- Each choice should lead to meaningfully different outcomes

Return ONLY JSON:
{
  "content": "Chapter content (${config.chapterLength})",
  "choices": [{"text": "Choice action", "hint": "Consequence hint"}],
  "isEnding": false,
  "endingType": null
}

${shouldPreventEnding ? 'Must provide 2-3 impactful choices.' : mustEnd ? `MUST set isEnding=true, endingType (${config.endingTypes}), choices=[]` : shouldEncourageEnding ? 'Build toward conclusion or end if narratively appropriate.' : 'Continue story with meaningful progression.'}`;

      if (userChoice && previousContent) {
        const trimmedPrevious = (previousContent || "").slice(-config.contextLength);
        actualUserPrompt = `Title: ${storyTitle || "Story"}
Target audience: ${targetAudience}

Previous content:
${trimmedPrevious}

Reader chose: "${userChoice}"

Continue the story showing consequences of this choice. Maintain narrative consistency.`;
      } else {
        const trimmedContext = (storyContext || "").slice(0, config.contextLength);
        actualUserPrompt = `Theme: ${trimmedContext}
Target audience: ${targetAudience}

Create opening with 2-3 meaningful choices.`;
      }
    }

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
        temperature: generateFullStory ? 0.6 : 0.65,
        max_tokens: generateFullStory ? (config.maxTokens + 400) : config.maxTokens,
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

    const data = await response.json();
    const content = data.choices[0].message.content;

    let storyData: GeneratedStory | FullStoryData;
    try {
      storyData = JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        storyData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse story JSON from response");
      }
    }

    // Backstop: force an ending when chapter count exceeds the max we prompt for
    if (!generateFullStory && typeof chapterCount === "number") {
      const maximumChapters = 6;
      if ("isEnding" in storyData && !storyData.isEnding && chapterCount >= maximumChapters) {
        storyData = {
          ...(storyData as GeneratedStory),
          isEnding: true,
          endingType: (storyData as GeneratedStory).endingType || "happy",
          choices: [],
        };
      }
    }

    // Validate that non-ending stories have choices
    if (!generateFullStory && 'isEnding' in storyData) {
      const generatedStory = storyData as GeneratedStory;
      if (!generatedStory.isEnding) {
        if (!generatedStory.choices || generatedStory.choices.length === 0) {
          console.error('AI generated non-ending story with no choices:', generatedStory);
          throw new Error('Invalid story: Non-ending story must have at least 2 choices');
        }
        if (generatedStory.choices.length < 2) {
          console.warn('AI generated story with only 1 choice, should have 2-3');
        }
      }
    }

    // Update usage counter for full story generation
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

    return new Response(
      JSON.stringify(storyData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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