/**
 * Story Bible types for comic book consistency.
 * The bible contains all the information needed to maintain
 * character, visual, and narrative consistency across chapters.
 */

export interface StoryCharacter {
  name: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  appearance: string;      // Detailed visual description for image generation
  personality: string;     // Character traits and behavior
  background: string;      // Brief backstory
  arc: string;            // Character development through the story
  voiceStyle?: string;    // For TTS consistency (e.g., "deep, gravelly")
}

export interface StorySetting {
  world: string;          // World description
  timePeriod: string;     // When the story takes place
  locations: {
    name: string;
    description: string;
    atmosphere: string;
  }[];
  atmosphere: string;     // Overall mood/feeling
  rules?: string;         // Any special rules of this world
}

export interface ArtStyle {
  style: string;          // e.g., "noir comic", "manga", "western comic"
  colorPalette: string;   // e.g., "dark muted tones with neon accents"
  lineWork: string;       // e.g., "heavy ink shadows", "clean lines"
  influences: string[];   // e.g., ["Frank Miller", "Mike Mignola"]
  lighting: string;       // e.g., "dramatic chiaroscuro", "soft ambient"
  mood: string;           // e.g., "gritty and atmospheric"
}

export interface NarrativeStructure {
  genre: string;          // e.g., "noir thriller", "sci-fi horror"
  tone: string;           // e.g., "dark and suspenseful"
  themes: string[];       // Core themes explored
  plotOutline: string;    // High-level story summary
  totalChapters: number;  // Expected chapter count
  possibleEndings: {
    type: 'good' | 'bad' | 'neutral' | 'bittersweet';
    description: string;
  }[];
}

export interface PlotBranch {
  nodeKey: string;
  title: string;
  summary: string;
  choices: {
    text: string;
    leadsTo: string;      // nodeKey of next branch
    consequence: string;
  }[];
  isEnding: boolean;
  endingType?: string;
}

export interface StoryBible {
  id: string;
  storyId: string;

  // Core elements
  characters: StoryCharacter[];
  setting: StorySetting;
  artStyle: ArtStyle;
  narrative: NarrativeStructure;

  // Image generation helpers
  stylePromptPrefix: string;           // Prepended to ALL image prompts
  characterPromptMap: Record<string, string>;  // Character name -> visual prompt

  // Plot structure
  plotOutline?: PlotBranch[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Database row type (snake_case)
export interface StoryBibleRow {
  id: string;
  story_id: string;
  characters: StoryCharacter[];
  setting: StorySetting;
  art_style: ArtStyle;
  narrative: NarrativeStructure;
  style_prompt_prefix: string;
  character_prompt_map: Record<string, string>;
  plot_outline: PlotBranch[] | null;
  created_at: string;
  updated_at: string;
}

// Chapter context for AI consistency
export interface ChapterContext {
  nodeKey: string;
  title: string;
  summary: string;
  charactersPresent: string[];
  keyEvents: string[];
  choiceMade?: string;
}

// Generation request types
export interface ComicStoryRequest {
  prompt: string;
  comicStyle: 'noir' | 'manga' | 'western' | 'cyberpunk' | 'horror' | 'fantasy';
  tone: 'dark' | 'gritty' | 'suspenseful' | 'action' | 'psychological';
  targetAudience: 'young_adult' | 'adult';
}

export interface ChapterGenerationResult {
  title: string;
  content: string;
  panelDescription: string;
  chapterSummary: string;
  charactersPresent: string[];
  isEnding: boolean;
  endingType?: 'good' | 'bad' | 'neutral' | 'bittersweet';
  choices: {
    text: string;
    consequenceHint: string;
    emotionalWeight: string;
    generationPriority: number;
  }[];
}

// Convert database row to application type
export function bibleFromRow(row: StoryBibleRow): StoryBible {
  return {
    id: row.id,
    storyId: row.story_id,
    characters: row.characters,
    setting: row.setting,
    artStyle: row.art_style,
    narrative: row.narrative,
    stylePromptPrefix: row.style_prompt_prefix,
    characterPromptMap: row.character_prompt_map,
    plotOutline: row.plot_outline ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Convert application type to database row
export function bibleToRow(bible: Partial<StoryBible>): Partial<StoryBibleRow> {
  const row: Partial<StoryBibleRow> = {};

  if (bible.storyId) row.story_id = bible.storyId;
  if (bible.characters) row.characters = bible.characters;
  if (bible.setting) row.setting = bible.setting;
  if (bible.artStyle) row.art_style = bible.artStyle;
  if (bible.narrative) row.narrative = bible.narrative;
  if (bible.stylePromptPrefix) row.style_prompt_prefix = bible.stylePromptPrefix;
  if (bible.characterPromptMap) row.character_prompt_map = bible.characterPromptMap;
  if (bible.plotOutline) row.plot_outline = bible.plotOutline;

  return row;
}
