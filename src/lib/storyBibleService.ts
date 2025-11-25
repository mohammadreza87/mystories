/**
 * Story Bible Service
 * Handles bible generation, storage, and retrieval for consistent comic stories.
 */

import { supabase } from './supabase';
import type {
  StoryBible,
  StoryBibleRow,
  ComicStoryRequest,
  ChapterContext,
  ChapterGenerationResult,
} from './storyBible.types';
import { bibleFromRow, bibleToRow } from './storyBible.types';
import {
  BIBLE_SYSTEM_PROMPT,
  buildBibleUserPrompt,
  CHAPTER_SYSTEM_PROMPT,
  buildChapterUserPrompt,
  buildImagePrompt,
  getVoiceSettings,
} from './comicPrompts';
import { config } from '../config';

// =============================================================================
// BIBLE OPERATIONS
// =============================================================================

/**
 * Generate a new story bible from user prompt.
 */
export async function generateStoryBible(
  request: ComicStoryRequest,
  accessToken: string
): Promise<StoryBible> {
  const response = await fetch(
    `${config.supabase.functionsUrl}/generate-story-bible`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to generate story bible');
  }

  return response.json();
}

/**
 * Save story bible to database.
 */
export async function saveStoryBible(bible: Partial<StoryBible>): Promise<StoryBible> {
  const row = bibleToRow(bible);

  const { data, error } = await supabase
    .from('story_bibles')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return bibleFromRow(data as StoryBibleRow);
}

/**
 * Get story bible by story ID.
 */
export async function getStoryBible(storyId: string): Promise<StoryBible | null> {
  const { data, error } = await supabase
    .from('story_bibles')
    .select('*')
    .eq('story_id', storyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return bibleFromRow(data as StoryBibleRow);
}

/**
 * Update story bible.
 */
export async function updateStoryBible(
  bibleId: string,
  updates: Partial<StoryBible>
): Promise<StoryBible> {
  const row = bibleToRow(updates);

  const { data, error } = await supabase
    .from('story_bibles')
    .update(row)
    .eq('id', bibleId)
    .select()
    .single();

  if (error) throw error;
  return bibleFromRow(data as StoryBibleRow);
}

// =============================================================================
// CHAPTER GENERATION
// =============================================================================

/**
 * Generate a chapter using the story bible for consistency.
 */
export async function generateChapter(
  bible: StoryBible,
  contextChain: ChapterContext[],
  selectedChoice?: string,
  accessToken?: string
): Promise<ChapterGenerationResult> {
  const response = await fetch(
    `${config.supabase.functionsUrl}/generate-comic-chapter`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || config.supabase.anonKey}`,
      },
      body: JSON.stringify({
        bible,
        contextChain,
        selectedChoice,
        isFirstChapter: contextChain.length === 0,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Failed to generate chapter');
  }

  return response.json();
}

// =============================================================================
// CONTEXT CHAIN MANAGEMENT
// =============================================================================

/**
 * Get the context chain for a node (all parent chapters).
 */
export async function getContextChain(nodeId: string): Promise<ChapterContext[]> {
  const { data, error } = await supabase
    .from('story_nodes')
    .select('context_chain')
    .eq('id', nodeId)
    .single();

  if (error) throw error;
  return (data?.context_chain as ChapterContext[]) || [];
}

/**
 * Build context chain by traversing parent nodes.
 */
export async function buildContextChain(
  storyId: string,
  currentNodeId: string | null
): Promise<ChapterContext[]> {
  if (!currentNodeId) return [];

  const chain: ChapterContext[] = [];
  let nodeId: string | null = currentNodeId;

  // Traverse up the tree (max 20 levels to prevent infinite loops)
  for (let i = 0; i < 20 && nodeId; i++) {
    const { data: node, error } = await supabase
      .from('story_nodes')
      .select(`
        id,
        node_key,
        content,
        chapter_summary,
        characters_present,
        parent_choice_id,
        story_choices!parent_choice_id (
          choice_text
        )
      `)
      .eq('id', nodeId)
      .single();

    if (error || !node) break;

    // Get the choice that led to this node
    const parentChoice = node.story_choices as { choice_text: string } | null;

    chain.unshift({
      nodeKey: node.node_key,
      title: `Chapter ${chain.length + 1}`,
      summary: node.chapter_summary || node.content.substring(0, 100) + '...',
      charactersPresent: node.characters_present || [],
      keyEvents: [],
      choiceMade: parentChoice?.choice_text,
    });

    // Get parent node ID through the choice
    if (node.parent_choice_id) {
      const { data: choice } = await supabase
        .from('story_choices')
        .select('from_node_id')
        .eq('id', node.parent_choice_id)
        .single();

      nodeId = choice?.from_node_id || null;
    } else {
      nodeId = null;
    }
  }

  return chain;
}

// =============================================================================
// IMAGE GENERATION FOR COMICS
// =============================================================================

/**
 * Generate a comic panel image using the bible for consistency.
 */
export async function generatePanelImage(
  bible: StoryBible,
  panelDescription: string,
  charactersInScene: string[],
  accessToken?: string
): Promise<string | null> {
  const prompt = buildImagePrompt(bible, panelDescription, charactersInScene);

  const response = await fetch(
    `${config.supabase.functionsUrl}/generate-image`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || config.supabase.anonKey}`,
      },
      body: JSON.stringify({
        prompt,
        styleReference: bible.stylePromptPrefix,
      }),
    }
  );

  if (!response.ok) {
    // Silently fail for billing issues
    if (response.status === 400 || response.status === 429) {
      console.warn('Image generation unavailable');
      return null;
    }
    console.error('Image generation failed:', response.status);
    return null;
  }

  const data = await response.json();
  return data.imageUrl;
}

// =============================================================================
// FULL STORY CREATION FLOW
// =============================================================================

export interface CreateComicStoryResult {
  storyId: string;
  bibleId: string;
  firstChapter: {
    nodeId: string;
    content: string;
    imageUrl: string | null;
    audioUrl: string | null;
    choices: ChapterGenerationResult['choices'];
  };
}

/**
 * Create a complete comic story with bible and first chapter.
 * This is the main entry point for story creation.
 */
export async function createComicStory(
  request: ComicStoryRequest,
  userId: string,
  accessToken: string
): Promise<CreateComicStoryResult> {
  // Step 1: Generate story bible
  const bible = await generateStoryBible(request, accessToken);

  // Step 2: Create story record
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .insert({
      title: `${bible.narrative.genre} Story`, // Will be updated
      description: bible.narrative.plotOutline,
      story_context: request.prompt,
      created_by: userId,
      is_public: false,
      is_user_generated: true,
      target_audience: request.targetAudience,
      comic_style: request.comicStyle,
      generation_status: 'generating',
      generation_progress: 10,
    })
    .select()
    .single();

  if (storyError) throw storyError;

  // Step 3: Save bible linked to story
  const { data: savedBible, error: bibleError } = await supabase
    .from('story_bibles')
    .insert({
      story_id: story.id,
      characters: bible.characters,
      setting: bible.setting,
      art_style: bible.artStyle,
      narrative: bible.narrative,
      style_prompt_prefix: bible.stylePromptPrefix,
      character_prompt_map: bible.characterPromptMap,
    })
    .select()
    .single();

  if (bibleError) throw bibleError;

  // Update story with bible reference
  await supabase
    .from('stories')
    .update({ bible_id: savedBible.id, generation_progress: 20 })
    .eq('id', story.id);

  // Step 4: Generate first chapter
  const firstChapter = await generateChapter(
    bibleFromRow(savedBible as StoryBibleRow),
    [],
    undefined,
    accessToken
  );

  // Update progress
  await supabase
    .from('stories')
    .update({
      title: firstChapter.title || bible.narrative.genre + ' Story',
      generation_progress: 40,
    })
    .eq('id', story.id);

  // Step 5: Save first chapter node
  const { data: firstNode, error: nodeError } = await supabase
    .from('story_nodes')
    .insert({
      story_id: story.id,
      node_key: 'start',
      content: firstChapter.content,
      is_ending: firstChapter.isEnding,
      ending_type: firstChapter.endingType,
      order_index: 0,
      chapter_summary: firstChapter.chapterSummary,
      characters_present: firstChapter.charactersPresent,
      panel_description: firstChapter.panelDescription,
      generation_status: 'generating',
      context_chain: [],
    })
    .select()
    .single();

  if (nodeError) throw nodeError;

  // Step 6: Generate image (parallel with audio)
  const bibleData = bibleFromRow(savedBible as StoryBibleRow);
  const imagePromise = generatePanelImage(
    bibleData,
    firstChapter.panelDescription,
    firstChapter.charactersPresent,
    accessToken
  );

  // Step 7: Generate audio
  const voiceSettings = getVoiceSettings(request.comicStyle);
  const audioPromise = generateNarration(
    firstChapter.content,
    voiceSettings.voice,
    voiceSettings.speed,
    accessToken
  );

  // Wait for both
  const [imageUrl, audioUrl] = await Promise.all([imagePromise, audioPromise]);

  // Update node with media
  await supabase
    .from('story_nodes')
    .update({
      image_url: imageUrl,
      audio_url: audioUrl,
      generation_status: 'ready',
    })
    .eq('id', firstNode.id);

  // Update story progress
  await supabase
    .from('stories')
    .update({
      cover_image_url: imageUrl,
      generation_progress: 60,
    })
    .eq('id', story.id);

  // Step 8: Create placeholder nodes for choices and queue background generation
  const choicePromises = firstChapter.choices.map(async (choice, index) => {
    // Create placeholder node
    const { data: placeholderNode } = await supabase
      .from('story_nodes')
      .insert({
        story_id: story.id,
        node_key: `chapter_1_choice_${index}`,
        content: '', // Will be generated
        is_ending: false,
        order_index: index + 1,
        generation_status: 'pending',
        context_chain: [{
          nodeKey: 'start',
          title: firstChapter.title,
          summary: firstChapter.chapterSummary,
          charactersPresent: firstChapter.charactersPresent,
          keyEvents: [],
        }],
      })
      .select()
      .single();

    if (!placeholderNode) return null;

    // Create choice linking nodes
    const { data: choiceRecord } = await supabase
      .from('story_choices')
      .insert({
        from_node_id: firstNode.id,
        to_node_id: placeholderNode.id,
        choice_text: choice.text,
        consequence_hint: choice.consequenceHint,
        choice_order: index,
        generation_priority: choice.generationPriority,
        emotional_weight: choice.emotionalWeight,
      })
      .select()
      .single();

    return { choice: choiceRecord, node: placeholderNode };
  });

  await Promise.all(choicePromises);

  // Step 9: Queue background generation
  await supabase
    .from('generation_queue')
    .insert({
      story_id: story.id,
      user_id: userId,
      status: 'pending',
      priority: 1,
    });

  // Update story as ready for reading
  await supabase
    .from('stories')
    .update({
      generation_status: 'partial',
      generation_progress: 70,
      nodes_generated: 1,
      total_nodes_planned: firstChapter.choices.length + 1,
    })
    .eq('id', story.id);

  return {
    storyId: story.id,
    bibleId: savedBible.id,
    firstChapter: {
      nodeId: firstNode.id,
      content: firstChapter.content,
      imageUrl,
      audioUrl,
      choices: firstChapter.choices,
    },
  };
}

// =============================================================================
// AUDIO GENERATION
// =============================================================================

async function generateNarration(
  text: string,
  voice: string,
  speed: number,
  accessToken?: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `${config.supabase.functionsUrl}/text-to-speech`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken || config.supabase.anonKey}`,
        },
        body: JSON.stringify({ text, voice, speed }),
      }
    );

    if (!response.ok) {
      if (response.status === 400 || response.status === 429) {
        console.warn('TTS unavailable');
        return null;
      }
      return null;
    }

    const data = await response.json();
    return data.audio || null;
  } catch (error) {
    console.error('TTS error:', error);
    return null;
  }
}
