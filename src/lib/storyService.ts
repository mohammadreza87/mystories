/**
 * Story service - handles all story-related data operations.
 * Refactored to eliminate duplication in story fetching logic.
 */

import { supabase } from './supabase';
import { apiRequest } from '../shared/api/apiClient';
import type { Story, StoryNode, StoryChoice, StoryReaction } from './types';

// ============================================================================
// Story Fetching (Consolidated - was 3 nearly identical functions)
// ============================================================================

interface FetchStoriesOptions {
  userId?: string;       // Filter by creator
  publicOnly?: boolean;  // Only public stories
}

/**
 * Internal helper to enrich a story with creator info and fallback cover.
 * Extracted to eliminate duplication across getStories/getUserStories/getPublicUserStories.
 */
async function enrichStoryWithCreator(story: Story): Promise<Story> {
  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', story.created_by)
    .maybeSingle();

  // Fallback cover image from start node if no cover
  let coverImage = story.cover_image_url;
  if (!coverImage) {
    const { data: startNode } = await supabase
      .from('story_nodes')
      .select('image_url')
      .eq('story_id', story.id)
      .eq('node_key', 'start')
      .maybeSingle();

    if (startNode?.image_url) {
      coverImage = startNode.image_url;
    }
  }

  return { ...story, cover_image_url: coverImage, creator };
}

/**
 * Fetch stories with optional filtering.
 * Consolidates getStories, getUserStories, and getPublicUserStories.
 */
async function fetchStoriesInternal(options: FetchStoriesOptions = {}): Promise<Story[]> {
  const { userId, publicOnly } = options;

  let query = supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('created_by', userId);
  }

  if (publicOnly) {
    query = query.eq('is_public', true);
  }

  const { data: stories, error } = await query;

  if (error) throw error;
  if (!stories) return [];

  // Enrich all stories with creator info
  // Note: This causes N+1 queries - optimize with JOIN in future iteration
  return Promise.all(stories.map(enrichStoryWithCreator));
}

// Public API - maintains backward compatibility with existing imports
export const getStories = () => fetchStoriesInternal();
export const getUserStories = (userId: string) => fetchStoriesInternal({ userId });
export const getPublicUserStories = (userId: string) => fetchStoriesInternal({ userId, publicOnly: true });

// ============================================================================
// Single Story Operations
// ============================================================================

export async function getStory(storyId: string): Promise<Story | null> {
  const { data: story, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .maybeSingle();

  if (error) throw error;
  if (!story) return null;

  const { data: creator } = await supabase
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('id', story.created_by)
    .maybeSingle();

  return { ...story, creator };
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId);

  if (error) throw error;
}

export async function updateStoryVisibility(storyId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ is_public: isPublic })
    .eq('id', storyId);

  if (error) throw error;
}

export async function updateStoryCoverImage(storyId: string, coverImageUrl: string): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ cover_image_url: coverImageUrl })
    .eq('id', storyId);

  if (error) throw error;
}

// ============================================================================
// Story Node Operations
// ============================================================================

export async function getStoryNode(storyId: string, nodeKey: string): Promise<StoryNode | null> {
  const { data, error } = await supabase
    .from('story_nodes')
    .select('*')
    .eq('story_id', storyId)
    .eq('node_key', nodeKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getNodeChoices(nodeId: string): Promise<(StoryChoice & { to_node: StoryNode })[]> {
  const { data, error } = await supabase
    .from('story_choices')
    .select(`
      *,
      to_node:story_nodes!story_choices_to_node_id_fkey(*)
    `)
    .eq('from_node_id', nodeId)
    .order('choice_order');

  if (error) throw error;
  return data || [];
}

export async function createStoryNode(
  storyId: string,
  nodeKey: string,
  content: string,
  isEnding: boolean,
  endingType: string | null,
  orderIndex: number,
  parentChoiceId: string | null = null
): Promise<StoryNode> {
  const { data, error } = await supabase
    .from('story_nodes')
    .insert({
      story_id: storyId,
      node_key: nodeKey,
      content,
      is_ending: isEnding,
      ending_type: endingType,
      order_index: orderIndex,
      parent_choice_id: parentChoiceId,
      image_url: null,
      image_prompt: null
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createStoryChoice(
  fromNodeId: string,
  toNodeId: string,
  choiceText: string,
  consequenceHint: string | null,
  choiceOrder: number
): Promise<StoryChoice> {
  const { data, error } = await supabase
    .from('story_choices')
    .insert({
      from_node_id: fromNodeId,
      to_node_id: toNodeId,
      choice_text: choiceText,
      consequence_hint: consequenceHint,
      choice_order: choiceOrder
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNodeImage(nodeId: string, imageUrl: string, imagePrompt: string): Promise<void> {
  const { error } = await supabase
    .from('story_nodes')
    .update({ image_url: imageUrl, image_prompt: imagePrompt })
    .eq('id', nodeId);

  if (error) throw error;
}

export async function updateNodeAudio(nodeId: string, audioUrl: string | null): Promise<void> {
  const { error } = await supabase
    .from('story_nodes')
    .update({ audio_url: audioUrl })
    .eq('id', nodeId);

  if (error) throw error;
}

// ============================================================================
// User Progress
// ============================================================================

export async function saveProgress(
  userId: string,
  storyId: string,
  currentNodeId: string,
  pathTaken: string[],
  completed: boolean
): Promise<void> {
  if (!userId) return;

  const { data: existing } = await supabase
    .from('user_story_progress')
    .select('id')
    .eq('user_id', userId)
    .eq('story_id', storyId)
    .maybeSingle();

  const progressData = {
    user_id: userId,
    story_id: storyId,
    current_node_id: currentNodeId,
    path_taken: pathTaken,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from('user_story_progress')
      .update(progressData)
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('user_story_progress')
      .insert({
        ...progressData,
        started_at: new Date().toISOString(),
      });
    if (error) throw error;
  }
}

export async function getProgress(userId: string, storyId: string) {
  const { data, error } = await supabase
    .from('user_story_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('story_id', storyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// ============================================================================
// Reactions
// Note: Components should prefer useStoryReactions hook over direct service calls
// ============================================================================

export async function getUserReaction(userId: string, storyId: string): Promise<StoryReaction | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('story_reactions')
    .select('*')
    .eq('user_id', userId)
    .eq('story_id', storyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function addReaction(userId: string, storyId: string, reactionType: 'like' | 'dislike'): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('story_reactions')
    .insert({
      user_id: userId,
      story_id: storyId,
      reaction_type: reactionType
    });

  if (error) throw error;
}

export async function updateReaction(userId: string, storyId: string, reactionType: 'like' | 'dislike'): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('story_reactions')
    .update({ reaction_type: reactionType })
    .eq('user_id', userId)
    .eq('story_id', storyId);

  if (error) throw error;
}

export async function removeReaction(userId: string, storyId: string): Promise<void> {
  if (!userId) return;

  const { error } = await supabase
    .from('story_reactions')
    .delete()
    .eq('user_id', userId)
    .eq('story_id', storyId);

  if (error) throw error;
}

// ============================================================================
// Story Generation (uses shared apiClient for auth)
// ============================================================================

export async function startStoryGeneration(storyId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('generation_queue')
    .insert({
      story_id: storyId,
      user_id: userId,
      status: 'pending',
      priority: 0,
    });

  if (error) throw error;

  // Fire-and-forget: Start background generation without waiting for completion.
  // The edge function will await the full generation process internally.
  // We don't await here so the user can start reading immediately.
  apiRequest('process-story-queue', {
    body: { storyId }
  }).catch((err) => {
    // Log but don't throw - generation continues on server even if request times out
    console.error('Background generation request error:', err);
  });
}

export async function getStoryGenerationStatus(storyId: string): Promise<{
  status: string;
  progress: number;
  nodesGenerated: number;
  totalNodesPlanned: number;
} | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('generation_status, generation_progress, nodes_generated, total_nodes_planned')
    .eq('id', storyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    status: data.generation_status || 'pending',
    progress: data.generation_progress || 0,
    nodesGenerated: data.nodes_generated || 0,
    totalNodesPlanned: data.total_nodes_planned || 0,
  };
}
