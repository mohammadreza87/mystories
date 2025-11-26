import { supabase } from './supabase';
import { progressQuest } from './questsService';

export interface PointsTransaction {
  readingPoints: number;
  creatingPoints: number;
  totalPoints: number;
}

export async function trackChapterRead(
  userId: string,
  storyId: string,
  nodeId: string,
  creatorId: string | null
): Promise<void> {
  if (!userId) return; // only track for authenticated users
  try {
    const { error: progressError } = await supabase
      .from('reading_progress')
      .upsert(
        {
          user_id: userId,
          story_id: storyId,
          node_id: nodeId,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,story_id,node_id',
          ignoreDuplicates: false,
        }
      );

    if (progressError && progressError.code !== '42501') {
      console.error('Error tracking reading progress:', progressError);
    }

    const { data: readerProfile } = await supabase
      .from('user_profiles')
      .select('reading_points, total_points')
      .eq('id', userId)
      .maybeSingle();

    if (readerProfile) {
      await supabase
        .from('user_profiles')
        .update({
          reading_points: (readerProfile.reading_points || 0) + 1,
          total_points: (readerProfile.total_points || 0) + 1,
        })
        .eq('id', userId);
    }

    if (creatorId && creatorId !== userId) {
      const { data: creatorProfile } = await supabase
        .from('user_profiles')
        .select('creating_points, total_points')
        .eq('id', creatorId)
        .maybeSingle();

      if (creatorProfile) {
        await supabase
          .from('user_profiles')
          .update({
            creating_points: (creatorProfile.creating_points || 0) + 1,
            total_points: (creatorProfile.total_points || 0) + 1,
          })
          .eq('id', creatorId);
      }
    }

    // Quest progress: daily read
    await progressQuest('read_chapter').catch(() => null);
  } catch (error) {
    console.error('Error in trackChapterRead:', error);
  }
}

export async function trackStoryCompletion(
  userId: string,
  storyId: string,
  creatorId: string | null
): Promise<boolean> {
  if (!userId) return false; // only track for authenticated users
  try {
    const { data: existingCompletion, error: checkError } = await supabase
      .from('story_completions')
      .select('id')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking completion:', checkError);
      return false;
    }

    if (existingCompletion) {
      return false;
    }

    const { error: insertError } = await supabase
      .from('story_completions')
      .insert({
        user_id: userId,
        story_id: storyId,
      });

    if (insertError) {
      console.error('Error inserting completion:', insertError);
      return false;
    }

    const { data: readerProfile } = await supabase
      .from('user_profiles')
      .select('reading_points, total_points')
      .eq('id', userId)
      .maybeSingle();

    if (readerProfile) {
      await supabase
        .from('user_profiles')
        .update({
          reading_points: (readerProfile.reading_points || 0) + 5,
          total_points: (readerProfile.total_points || 0) + 5,
        })
        .eq('id', userId);
    }

    if (creatorId && creatorId !== userId) {
      const { data: creatorProfile } = await supabase
        .from('user_profiles')
        .select('creating_points, total_points')
        .eq('id', creatorId)
        .maybeSingle();

      if (creatorProfile) {
        await supabase
          .from('user_profiles')
          .update({
            creating_points: (creatorProfile.creating_points || 0) + 5,
            total_points: (creatorProfile.total_points || 0) + 5,
          })
          .eq('id', creatorId);
      }
    }

    // Quest progress: weekly completion
    await progressQuest('complete_story').catch(() => null);

    return true;
  } catch (error) {
    console.error('Error in trackStoryCompletion:', error);
    return false;
  }
}

export async function getReadingProgress(
  userId: string,
  storyId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('reading_progress')
      .select('node_id')
      .eq('user_id', userId)
      .eq('story_id', storyId);

    if (error) {
      console.error('Error getting reading progress:', error);
      return [];
    }

    return data?.map((p) => p.node_id) || [];
  } catch (error) {
    console.error('Error in getReadingProgress:', error);
    return [];
  }
}

export async function resetStoryProgress(
  userId: string,
  storyId: string
): Promise<void> {
  try {
    await supabase
      .from('reading_progress')
      .delete()
      .eq('user_id', userId)
      .eq('story_id', storyId);
  } catch (error) {
    console.error('Error resetting progress:', error);
  }
}

export async function getUserPoints(userId: string): Promise<PointsTransaction | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('total_points, reading_points, creating_points')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      console.error('Error getting user points:', error);
      return null;
    }

    return {
      totalPoints: data.total_points || 0,
      readingPoints: data.reading_points || 0,
      creatingPoints: data.creating_points || 0,
    };
  } catch (error) {
    console.error('Error in getUserPoints:', error);
    return null;
  }
}

export async function awardStoryCreationPoints(
  userId: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('creating_points, total_points')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      await supabase
        .from('user_profiles')
        .update({
          creating_points: (profile.creating_points || 0) + 5,
          total_points: (profile.total_points || 0) + 5,
        })
        .eq('id', userId);
    }
  } catch (error) {
    console.error('Error awarding story creation points:', error);
  }
}
