/**
 * Optimized prompt templates for adult comic book story generation.
 * These prompts are designed for consistency, quality, and speed.
 */

import type {
  StoryBible,
  ComicStoryRequest,
  ChapterContext,
  ArtStyle
} from './storyBible.types';

// =============================================================================
// STYLE PRESETS
// =============================================================================

export const COMIC_STYLE_PRESETS: Record<string, Partial<ArtStyle>> = {
  noir: {
    style: 'noir graphic novel',
    colorPalette: 'high contrast black and white with selective red accents',
    lineWork: 'heavy ink shadows, dramatic silhouettes',
    influences: ['Frank Miller', 'Sin City', 'Mike Mignola'],
    lighting: 'harsh chiaroscuro, venetian blind shadows',
    mood: 'gritty, atmospheric, morally ambiguous',
  },
  manga: {
    style: 'seinen manga',
    colorPalette: 'clean blacks and whites with screentone shading',
    lineWork: 'precise lineart, dynamic speed lines',
    influences: ['Takehiko Inoue', 'Naoki Urasawa', 'Kentaro Miura'],
    lighting: 'dramatic with high contrast action scenes',
    mood: 'intense, emotional, detailed',
  },
  western: {
    style: 'modern American comic',
    colorPalette: 'rich, saturated colors with dramatic shadows',
    lineWork: 'bold outlines, detailed crosshatching',
    influences: ['Alex Ross', 'Jim Lee', 'David Finch'],
    lighting: 'cinematic, dynamic rim lighting',
    mood: 'heroic, epic, intense',
  },
  cyberpunk: {
    style: 'cyberpunk graphic novel',
    colorPalette: 'neon pinks, blues, and purples against dark backgrounds',
    lineWork: 'sharp geometric lines, digital aesthetic',
    influences: ['Masamune Shirow', 'Josan Gonzalez', 'Blade Runner'],
    lighting: 'neon glow, holographic reflections',
    mood: 'dystopian, tech-noir, atmospheric',
  },
  horror: {
    style: 'horror comic',
    colorPalette: 'desaturated with sickly greens and blood reds',
    lineWork: 'scratchy, unsettling linework',
    influences: ['Junji Ito', 'Bernie Wrightson', 'Emily Carroll'],
    lighting: 'oppressive shadows, unnatural light sources',
    mood: 'dread, unease, visceral',
  },
  fantasy: {
    style: 'dark fantasy graphic novel',
    colorPalette: 'earthy tones with magical color accents',
    lineWork: 'detailed, painterly quality',
    influences: ['Frazetta', 'Moebius', 'Yoshitaka Amano'],
    lighting: 'mystical, ethereal glow effects',
    mood: 'epic, mysterious, otherworldly',
  },
};

// =============================================================================
// STORY BIBLE GENERATION
// =============================================================================

export const BIBLE_SYSTEM_PROMPT = `You are an expert comic book writer and art director creating a story bible for an adult graphic novel.

Your story bibles are known for:
1. MEMORABLE CHARACTERS with distinct visual identities and complex motivations
2. RICH WORLD-BUILDING that feels lived-in and consistent
3. VISUAL CLARITY - every character description can be drawn consistently
4. MATURE THEMES handled with nuance and depth
5. BRANCHING NARRATIVES with meaningful, consequential choices

CRITICAL RULES:
- This is for ADULTS. Include mature themes, moral complexity, real consequences.
- Character appearances must be SPECIFIC and CONSISTENT (exact details for image generation)
- Define a single art style that will be used for ALL panels
- Create a branching plot with 3-5 distinct endings
- Each character needs a unique visual identifier (scar, clothing, hairstyle, etc.)

You MUST respond with valid JSON only. No explanations outside the JSON.`;

export function buildBibleUserPrompt(request: ComicStoryRequest): string {
  const stylePreset = COMIC_STYLE_PRESETS[request.comicStyle] || COMIC_STYLE_PRESETS.noir;

  return `Create a story bible for this adult graphic novel concept:

"${request.prompt}"

REQUIREMENTS:
- Style: ${request.comicStyle.toUpperCase()} comic (${stylePreset.style})
- Tone: ${request.tone}
- Audience: ${request.targetAudience === 'adult' ? 'Mature adults (18+)' : 'Young adults (16+)'}
- Visual influences: ${stylePreset.influences?.join(', ')}

OUTPUT THIS EXACT JSON STRUCTURE:
{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist|antagonist|supporting|minor",
      "appearance": "DETAILED physical description: age, build, face, hair, distinctive features, typical clothing. Be SPECIFIC for image consistency.",
      "personality": "Core traits, mannerisms, speech patterns",
      "background": "Brief but relevant backstory",
      "arc": "How this character changes through the story"
    }
  ],
  "setting": {
    "world": "Description of the world/reality",
    "timePeriod": "When this takes place",
    "locations": [
      {
        "name": "Location Name",
        "description": "Visual description",
        "atmosphere": "Mood and feeling"
      }
    ],
    "atmosphere": "Overall world atmosphere"
  },
  "artStyle": {
    "style": "${stylePreset.style}",
    "colorPalette": "${stylePreset.colorPalette}",
    "lineWork": "${stylePreset.lineWork}",
    "influences": ${JSON.stringify(stylePreset.influences)},
    "lighting": "${stylePreset.lighting}",
    "mood": "${stylePreset.mood}"
  },
  "narrative": {
    "genre": "Specific genre",
    "tone": "${request.tone}",
    "themes": ["theme1", "theme2", "theme3"],
    "plotOutline": "2-3 sentence plot summary",
    "totalChapters": 10,
    "possibleEndings": [
      {"type": "good|bad|neutral|bittersweet", "description": "Brief ending description"}
    ]
  },
  "stylePromptPrefix": "A ${stylePreset.style} panel. ${stylePreset.colorPalette}. ${stylePreset.lineWork}. ${stylePreset.lighting}. Style of ${stylePreset.influences?.[0]}.",
  "characterPromptMap": {
    "Character Name": "Exact visual description for image prompts"
  }
}

Create 2-4 compelling characters. Make the story ORIGINAL and ENGAGING.`;
}

// =============================================================================
// CHAPTER GENERATION
// =============================================================================

export const CHAPTER_SYSTEM_PROMPT = `You are writing chapters for an adult graphic novel. Your writing is CINEMATIC and VISUAL.

CRITICAL RULES:
1. Stay STRICTLY consistent with the story bible - characters look and act as defined
2. Each chapter MUST logically follow from previous events
3. Write what we SEE and HEAR - this is a visual medium
4. End non-ending chapters with 2-3 MEANINGFUL choices
5. Choices must have REAL consequences, not just flavor text
6. Keep chapters 250-400 words - tight pacing like a comic
7. Include a detailed panel_description for the KEY visual moment

NEVER:
- Contradict established character traits or appearances
- Ignore previous chapter events
- Create choices without real consequences
- Write walls of exposition

You MUST respond with valid JSON only.`;

export function buildChapterUserPrompt(
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

// =============================================================================
// IMAGE GENERATION
// =============================================================================

export function buildImagePrompt(
  bible: StoryBible,
  panelDescription: string,
  charactersInScene: string[]
): string {
  // Start with style prefix
  let prompt = bible.stylePromptPrefix;

  // Add character visual references
  for (const charName of charactersInScene) {
    const charPrompt = bible.characterPromptMap[charName];
    if (charPrompt) {
      prompt += ` Character ${charName}: ${charPrompt}.`;
    }
  }

  // Add scene description
  prompt += ` SCENE: ${panelDescription}`;

  // Add quality modifiers
  prompt += ` Highly detailed, professional comic book art, cinematic composition, dramatic angles.`;

  // Truncate if too long (DALL-E has limits)
  if (prompt.length > 3800) {
    prompt = prompt.substring(0, 3800) + '...';
  }

  return prompt;
}

// =============================================================================
// VOICE/NARRATION
// =============================================================================

export const NARRATOR_VOICE_SETTINGS = {
  noir: { voice: 'onyx', speed: 0.85 },      // Deep, gravelly
  manga: { voice: 'nova', speed: 0.95 },      // Clear, expressive
  western: { voice: 'echo', speed: 0.9 },     // Heroic, strong
  cyberpunk: { voice: 'fable', speed: 0.95 }, // Smooth, tech-noir
  horror: { voice: 'onyx', speed: 0.8 },      // Slow, ominous
  fantasy: { voice: 'shimmer', speed: 0.9 },  // Mystical, ethereal
};

export function getVoiceSettings(comicStyle: string): { voice: string; speed: number } {
  return NARRATOR_VOICE_SETTINGS[comicStyle as keyof typeof NARRATOR_VOICE_SETTINGS]
    || NARRATOR_VOICE_SETTINGS.noir;
}
