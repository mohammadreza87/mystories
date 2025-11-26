import { supabase } from './supabase';
import type { Story, StoryNode, StoryChoice, StoryReaction } from './types';

export async function getStories(): Promise<Story[]> {
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!stories) return [];

  const storiesWithCreators = await Promise.all(
    stories.map(async (story) => {
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', story.created_by)
        .maybeSingle();

      // If no cover image, try to get the start node's image as fallback
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
    })
  );

  return storiesWithCreators;
}

export async function getUserStories(userId: string): Promise<Story[]> {
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!stories) return [];

  const storiesWithCreators = await Promise.all(
    stories.map(async (story) => {
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', story.created_by)
        .maybeSingle();

      // If no cover image, try to get the start node's image as fallback
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
    })
  );

  return storiesWithCreators;
}

export async function getPublicUserStories(userId: string): Promise<Story[]> {
  const { data: stories, error } = await supabase
    .from('stories')
    .select('*')
    .eq('created_by', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!stories) return [];

  const storiesWithCreators = await Promise.all(
    stories.map(async (story) => {
      const { data: creator } = await supabase
        .from('user_profiles')
        .select('display_name, avatar_url')
        .eq('id', story.created_by)
        .maybeSingle();

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
    })
  );

  return storiesWithCreators;
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId);

  if (error) throw error;
}

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

export async function saveProgress(
  userId: string,
  storyId: string,
  currentNodeId: string,
  pathTaken: string[],
  completed: boolean
) {
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

export async function updateStoryCoverImage(storyId: string, coverImageUrl: string) {
  const { error } = await supabase
    .from('stories')
    .update({ cover_image_url: coverImageUrl })
    .eq('id', storyId);

  if (error) throw error;
}

export async function updateNodeImage(nodeId: string, imageUrl: string, imagePrompt: string) {
  const { error } = await supabase
    .from('story_nodes')
    .update({
      image_url: imageUrl,
      image_prompt: imagePrompt
    })
    .eq('id', nodeId);

  if (error) throw error;
}

export async function updateNodeAudio(nodeId: string, audioUrl: string | null) {
  const { error } = await supabase
    .from('story_nodes')
    .update({ audio_url: audioUrl })
    .eq('id', nodeId);

  if (error) throw error;
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
      content: content,
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

  // Get current session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-story-queue`;
  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log('Triggering story generation for:', storyId);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ storyId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Story generation trigger failed:', response.status, errorData);
      throw new Error(`Failed to trigger story generation: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('Story generation triggered successfully:', result);
  } catch (error) {
    console.error('Error starting story generation:', error);
    throw error;
  }
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

export async function updateStoryVisibility(storyId: string, isPublic: boolean): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ is_public: isPublic })
    .eq('id', storyId);

  if (error) throw error;
}

// Follow functions have been moved to followService.ts
// Import from '../lib/followService' instead
