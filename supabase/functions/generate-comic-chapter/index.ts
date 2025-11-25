/**
 * Generate Comic Chapter Edge Function
 *
 * Generates a chapter for an adult comic book story using the story bible
 * and context chain for consistency.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  handleCors,
  authenticate,
  isAuthError,
  success,
  errors,
} from '../_shared/index.ts';

// Types
interface StoryCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  appearance: string;
  personality: string;
  background: string;
  arc: string;
}

interface StoryBible {
  characters: StoryCharacter[];
  setting: {
    world: string;
    timePeriod: string;
    locations: { name: string; description: string; atmosphere: string }[];
    atmosphere: string;
  };
  artStyle: {
    style: string;
    colorPalette: string;
    lineWork: string;
    influences: string[];
    lighting: string;
    mood: string;
  };
  narrative: {
    genre: string;
    tone: string;
    themes: string[];
    plotOutline: string;
    totalChapters: number;
    possibleEndings: { type: string; description: string }[];
  };
  stylePromptPrefix: string;
  characterPromptMap: Record<string, string>;
}

interface ChapterContext {
  nodeKey: string;
  title: string;
  summary: string;
  charactersPresent: string[];
  keyEvents: string[];
  choiceMade?: string;
}

interface ChapterChoice {
  text: string;
  consequenceHint: string;
  emotionalWeight: 'hope' | 'fear' | 'anger' | 'determination' | 'despair' | 'curiosity';
  generationPriority: number;
}

interface ChapterGenerationResult {
  title: string;
  content: string;
  panelDescription: string;
  chapterSummary: string;
  charactersPresent: string[];
  isEnding: boolean;
  endingType?: 'good' | 'bad' | 'neutral' | 'bittersweet';
  choices: ChapterChoice[];
}

interface ChapterRequest {
  bible: StoryBible;
  contextChain: ChapterContext[];
  selectedChoice?: string;
  isFirstChapter?: boolean;
}

const CHAPTER_SYSTEM_PROMPT = `You are writing chapters for an adult graphic novel. Your writing is CINEMATIC and VISUAL.

CRITICAL RULES:
1. Stay STRICTLY consistent with the story bible - characters look and act as defined
2. Each chapter MUST logically follow from previous events
3. Write what we SEE and HEAR - this is a visual medium
4. End non-ending chapters with 2-3 MEANINGFUL choices
5. Choices must have REAL consequences, not just flavor text
6. Keep chapters 250-400 words - tight pacing like a comic
7. Include a detailed panelDescription for the KEY visual moment

NEVER:
- Contradict established character traits or appearances
- Ignore previous chapter events
- Create choices without real consequences
- Write walls of exposition

You MUST respond with valid JSON only.`;

function buildChapterUserPrompt(
  bible: StoryBible,
  contextChain: ChapterContext[],
  selectedChoice?: string,
  isFirstChapter: boolean = false
): string {
  // Build context summary
  const contextSummary = contextChain.length > 0
    ? contextChain.map((ctx, i) =>
        `Chapter ${i + 1}: ${ctx.summary}${ctx.choiceMade ? ` [Choice: ${ctx.choiceMade}]` : ''}`
      ).join('\n')
    : 'This is the opening chapter.';

  // Build character reference
  const characterRef = bible.characters.map(c =>
    `- ${c.name} (${c.role}): ${c.appearance.substring(0, 100)}...`
  ).join('\n');

  // Determine chapter number for pacing
  const chapterNum = contextChain.length + 1;
  const totalChapters = bible.narrative.totalChapters || 10;
  const isNearEnd = chapterNum >= totalChapters - 2;
  const mustEnd = chapterNum >= totalChapters;

  let pacingInstruction = '';
  if (mustEnd) {
    pacingInstruction = 'This is the FINAL chapter. You MUST conclude the story. Set isEnding: true.';
  } else if (isNearEnd) {
    pacingInstruction = 'We are approaching the climax. Start wrapping up plot threads.';
  } else if (chapterNum <= 2) {
    pacingInstruction = 'Early story - focus on establishing characters and conflict.';
  } else {
    pacingInstruction = 'Build tension, develop characters, move the plot forward.';
  }

  return `STORY BIBLE SUMMARY:
Genre: ${bible.narrative.genre}
Tone: ${bible.narrative.tone}
Setting: ${bible.setting.world}
Themes: ${bible.narrative.themes.join(', ')}

CHARACTERS:
${characterRef}

STORY SO FAR:
${contextSummary}

${selectedChoice ? `THE READER CHOSE: "${selectedChoice}"` : ''}

PACING (Chapter ${chapterNum}/${totalChapters}): ${pacingInstruction}

${isFirstChapter
  ? 'Write the OPENING chapter. Hook the reader immediately. Introduce the protagonist and central conflict.'
  : 'Write the NEXT chapter. Build on previous events. Escalate tension or reveal new information.'}

OUTPUT THIS EXACT JSON:
{
  "title": "Chapter Title",
  "content": "The narrative text. 250-400 words. Cinematic, visual writing. What we see and hear.",
  "panelDescription": "DETAILED description of the key visual moment for image generation. Include characters present, their poses, expressions, the environment, lighting, and mood. 2-3 sentences.",
  "chapterSummary": "One sentence summary of key events for context chain.",
  "charactersPresent": ["Character names who appear in this chapter"],
  "isEnding": false,
  "endingType": null,
  "choices": [
    {
      "text": "Choice text the reader sees",
      "consequenceHint": "Subtle hint about where this leads",
      "emotionalWeight": "hope|fear|anger|determination|despair|curiosity",
      "generationPriority": 1
    }
  ]
}

For endings, set isEnding: true, endingType: "good|bad|neutral|bittersweet", and choices: [].
For non-endings, provide 2-3 choices with generationPriority 1 (most likely) to 3 (least likely).`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    // Authenticate user
    const authResult = await authenticate(req);
    if (isAuthError(authResult)) {
      return authResult;
    }

    // Parse request
    const body: ChapterRequest = await req.json();

    if (!body.bible) {
      return errors.badRequest('Story bible is required');
    }

    if (!body.bible.characters || body.bible.characters.length === 0) {
      return errors.badRequest('Story bible must include characters');
    }

    const contextChain = body.contextChain || [];
    const isFirstChapter = body.isFirstChapter ?? contextChain.length === 0;

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return errors.internal('OpenAI API key not configured');
    }

    // Generate chapter with OpenAI GPT-4
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: CHAPTER_SYSTEM_PROMPT },
          { role: 'user', content: buildChapterUserPrompt(
            body.bible,
            contextChain,
            body.selectedChoice,
            isFirstChapter
          )},
        ],
        temperature: 0.75,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return errors.externalApi('OpenAI', errorText);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    let chapter: ChapterGenerationResult;
    try {
      chapter = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        chapter = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse chapter JSON:', content);
        return errors.internal('Failed to parse chapter from AI response');
      }
    }

    // Validate required fields
    if (!chapter.content || typeof chapter.content !== 'string') {
      return errors.internal('Invalid chapter: missing content');
    }

    if (!chapter.panelDescription) {
      // Generate a basic panel description from content
      chapter.panelDescription = chapter.content.substring(0, 200);
    }

    if (!chapter.chapterSummary) {
      chapter.chapterSummary = chapter.content.substring(0, 100) + '...';
    }

    if (!chapter.charactersPresent) {
      // Extract character names mentioned in the content
      chapter.charactersPresent = body.bible.characters
        .filter(c => chapter.content.toLowerCase().includes(c.name.toLowerCase()))
        .map(c => c.name);
    }

    // Validate choices for non-endings
    if (!chapter.isEnding) {
      if (!chapter.choices || chapter.choices.length === 0) {
        console.error('AI generated non-ending chapter with no choices');
        // Generate default choices as fallback
        chapter.choices = [
          {
            text: 'Continue cautiously',
            consequenceHint: 'A careful approach',
            emotionalWeight: 'determination',
            generationPriority: 1,
          },
          {
            text: 'Take a risk',
            consequenceHint: 'A bold decision',
            emotionalWeight: 'courage' as any,
            generationPriority: 2,
          },
        ];
      }

      // Ensure at least 2 choices
      if (chapter.choices.length < 2) {
        chapter.choices.push({
          text: 'Try another approach',
          consequenceHint: 'An alternative path',
          emotionalWeight: 'curiosity',
          generationPriority: 3,
        });
      }
    } else {
      // Endings should have empty choices
      chapter.choices = [];
    }

    // Normalize emotional weights
    const validWeights = ['hope', 'fear', 'anger', 'determination', 'despair', 'curiosity'];
    chapter.choices = chapter.choices.map(choice => ({
      ...choice,
      emotionalWeight: validWeights.includes(choice.emotionalWeight)
        ? choice.emotionalWeight
        : 'curiosity' as ChapterChoice['emotionalWeight'],
    }));

    return success(chapter);

  } catch (error) {
    console.error('Error generating chapter:', error);
    return errors.internal(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});
