import { useState, useEffect, useCallback } from 'react';
import { getUserReaction, addReaction, updateReaction, removeReaction } from '../lib/storyService';
import type { StoryReaction } from '../lib/types';

interface UseStoryReactionsResult {
  userReaction: StoryReaction | null;
  likesCount: number;
  dislikesCount: number;
  loading: boolean;
  handleLike: () => Promise<void>;
  handleDislike: () => Promise<void>;
}

export function useStoryReactions(
  userId: string | undefined,
  storyId: string,
  initialLikes: number = 0,
  initialDislikes: number = 0
): UseStoryReactionsResult {
  const [userReaction, setUserReaction] = useState<StoryReaction | null>(null);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [dislikesCount, setDislikesCount] = useState(initialDislikes);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadReaction = async () => {
      if (!userId) return;

      try {
        const reaction = await getUserReaction(userId, storyId);
        setUserReaction(reaction);
      } catch (error) {
        console.error('Error loading reaction:', error);
      }
    };

    loadReaction();
  }, [userId, storyId]);

  const handleReaction = useCallback(async (type: 'like' | 'dislike') => {
    if (!userId || loading) return;

    setLoading(true);
    try {
      if (userReaction?.reaction_type === type) {
        // Remove reaction
        await removeReaction(userId, storyId);
        setUserReaction(null);
        if (type === 'like') {
          setLikesCount(prev => prev - 1);
        } else {
          setDislikesCount(prev => prev - 1);
        }
      } else if (userReaction) {
        // Change reaction
        await updateReaction(userId, storyId, type);
        if (type === 'like') {
          setLikesCount(prev => prev + 1);
          setDislikesCount(prev => prev - 1);
        } else {
          setDislikesCount(prev => prev + 1);
          setLikesCount(prev => prev - 1);
        }
        setUserReaction({
          user_id: userId,
          story_id: storyId,
          reaction_type: type,
          created_at: new Date().toISOString(),
        });
      } else {
        // Add new reaction
        await addReaction(userId, storyId, type);
        if (type === 'like') {
          setLikesCount(prev => prev + 1);
        } else {
          setDislikesCount(prev => prev + 1);
        }
        setUserReaction({
          user_id: userId,
          story_id: storyId,
          reaction_type: type,
          created_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userId, storyId, userReaction, loading]);

  const handleLike = useCallback(() => handleReaction('like'), [handleReaction]);
  const handleDislike = useCallback(() => handleReaction('dislike'), [handleReaction]);

  return {
    userReaction,
    likesCount,
    dislikesCount,
    loading,
    handleLike,
    handleDislike,
  };
}
