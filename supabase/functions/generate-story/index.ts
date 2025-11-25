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

    const { storyContext, userChoice, previousContent, storyTitle, userPrompt, generateFullStory, chapterCount }: StoryRequest = await req.json();

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

    if (generateFullStory && userPrompt) {
      systemPrompt = `Create children's story metadata and opening chapter.

Language rules (MANDATORY):
- Detect the language of the user prompt.
- Use that SAME language for EVERY field (title, description, storyContext, startContent, choices, styleGuide).
- If the user writes in English, respond ONLY in English.
- Never switch languages or translate to a different language.

Rules:
- Age 5-10, child-appropriate content
- Opening: 2-3 SHORT paragraphs (4-5 sentences max)
- Provide 2-3 meaningful choices
- Match language of user prompt exactly

Return ONLY valid JSON:
{
  "title": "Story Title",
  "description": "1-2 sentence description",
  "ageRange": "5-10",
  "estimatedDuration": 10,
  "storyContext": "Brief context for continuation",
  "startContent": "Opening paragraphs (2-3 SHORT paragraphs)",
  "initialChoices": [
    {"text": "Choice 1", "hint": "What might happen"},
    {"text": "Choice 2", "hint": "What might happen"}
  ],
  "language": "en", // ISO 639-1 code of detected language
  "styleGuide": {
    "characters": [{"name": "Name", "description": "Appearance, clothing, colors"}],
    "artStyle": "Warm, colorful children's book illustration",
    "setting": "Where the story takes place",
    "colorPalette": "Primary colors to keep consistent"
  }
}`;

      actualUserPrompt = `Story request: "${userPrompt}"

Constraints:
- Detect language of the request and use it everywhere (title/description/content/choices/styleGuide).
- Keep it friendly for ages 5-10; no fear/violence/sadness/bullying/weapons.
- Short sentences and simple words.`;
    } else {
      const currentChapter = chapterCount || 0;
      const minimumChapters = 3;
      const maximumChapters = 6;
      const shouldPreventEnding = currentChapter < minimumChapters;
      const mustEnd = currentChapter >= maximumChapters;
      const shouldEncourageEnding = currentChapter >= 4 && currentChapter < maximumChapters;

      systemPrompt = `Children's story writer for ages 5-10. Write in SAME language as previous content.

Rules:
- Child-appropriate, simple language, no fear/violence/bullying/weapons/sadness
- 2 SHORT paragraphs (max 4-5 sentences total)
- Stories must be ${minimumChapters}-${maximumChapters} chapters
- ${shouldPreventEnding ? `Chapter ${currentChapter + 1}: DO NOT END. Provide 2-3 choices.` : mustEnd ? `Chapter ${currentChapter + 1}: THIS IS THE FINAL CHAPTER. You MUST end the story now. Set isEnding=true, provide endingType, set choices=[]` : shouldEncourageEnding ? `Chapter ${currentChapter + 1}: Start wrapping up. Resolve the main conflict and prepare to end.` : `Chapter ${currentChapter + 1}: Build to conclusion.`}
- Endings: happy/learning_moment/neutral
- If ending: choices = []

Return ONLY JSON:
{
  "content": "Story text (2 SHORT paragraphs)",
  "choices": [{"text": "Choice 1", "hint": "Hint"}],
  "isEnding": false,
  "endingType": null
}

${shouldPreventEnding ? 'Must provide 2-3 choices.' : mustEnd ? 'MUST set isEnding=true, endingType (happy/learning_moment/neutral), choices=[]' : shouldEncourageEnding ? 'Continue building to ending or end if story naturally concludes.' : 'Continue or end appropriately.'}`;

      if (userChoice && previousContent) {
        const trimmedPrevious = (previousContent || "").slice(-1200);
        actualUserPrompt = `Title: ${storyTitle || "Adventure"}

Previous (trimmed):
${trimmedPrevious}

Chosen: "${userChoice}"

Continue in same language.`;
      } else {
        const trimmedContext = (storyContext || "").slice(0, 1200);
        actualUserPrompt = `Theme: ${trimmedContext}

Create opening with 2-3 choices in same language.`;
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
        temperature: generateFullStory ? 0.5 : 0.55,
        max_tokens: generateFullStory ? 650 : 480,
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