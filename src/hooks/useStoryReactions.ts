import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserReaction, addReaction, updateReaction, removeReaction } from '../lib/storyService';
import { queryKeys } from '../lib/queryClient';
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
  const queryClient = useQueryClient();

  // Track counts locally since they may differ from initial values
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [dislikesCount, setDislikesCount] = useState(initialDislikes);

  // Fetch user's reaction
  const { data: userReaction } = useQuery({
    queryKey: queryKeys.userReaction(userId || '', storyId),
    queryFn: () => getUserReaction(userId!, storyId),
    enabled: !!userId,
  });

  // Mutation for handling reactions
  const reactionMutation = useMutation({
    mutationFn: async (type: 'like' | 'dislike') => {
      if (!userId) throw new Error('User not authenticated');

      if (userReaction?.reaction_type === type) {
        // Remove reaction
        await removeReaction(userId, storyId);
        return { action: 'remove', type };
      } else if (userReaction) {
        // Change reaction
        await updateReaction(userId, storyId, type);
        return { action: 'change', type, previousType: userReaction.reaction_type };
      } else {
        // Add new reaction
        await addReaction(userId, storyId, type);
        return { action: 'add', type };
      }
    },
    onMutate: async (type) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.userReaction(userId || '', storyId),
      });

      // Snapshot previous value
      const previousReaction = queryClient.getQueryData(
        queryKeys.userReaction(userId || '', storyId)
      );

      // Optimistically update
      if (userReaction?.reaction_type === type) {
        // Removing reaction
        queryClient.setQueryData(
          queryKeys.userReaction(userId || '', storyId),
          null
        );
        if (type === 'like') {
          setLikesCount((prev) => Math.max(0, prev - 1));
        } else {
          setDislikesCount((prev) => Math.max(0, prev - 1));
        }
      } else if (userReaction) {
        // Changing reaction
        queryClient.setQueryData(
          queryKeys.userReaction(userId || '', storyId),
          {
            user_id: userId,
            story_id: storyId,
            reaction_type: type,
            created_at: new Date().toISOString(),
          }
        );
        if (type === 'like') {
          setLikesCount((prev) => prev + 1);
          setDislikesCount((prev) => Math.max(0, prev - 1));
        } else {
          setDislikesCount((prev) => prev + 1);
          setLikesCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        // Adding reaction
        queryClient.setQueryData(
          queryKeys.userReaction(userId || '', storyId),
          {
            user_id: userId,
            story_id: storyId,
            reaction_type: type,
            created_at: new Date().toISOString(),
          }
        );
        if (type === 'like') {
          setLikesCount((prev) => prev + 1);
        } else {
          setDislikesCount((prev) => prev + 1);
        }
      }

      return { previousReaction };
    },
    onError: (_, type, context) => {
      // Rollback on error
      if (context?.previousReaction !== undefined) {
        queryClient.setQueryData(
          queryKeys.userReaction(userId || '', storyId),
          context.previousReaction
        );
        // Reset counts (simplified - in production might want more accurate rollback)
        setLikesCount(initialLikes);
        setDislikesCount(initialDislikes);
      }
    },
  });

  const handleLike = useCallback(async () => {
    if (!userId || reactionMutation.isPending) return;
    await reactionMutation.mutateAsync('like');
  }, [userId, reactionMutation]);

  const handleDislike = useCallback(async () => {
    if (!userId || reactionMutation.isPending) return;
    await reactionMutation.mutateAsync('dislike');
  }, [userId, reactionMutation]);

  return {
    userReaction: userReaction ?? null,
    likesCount,
    dislikesCount,
    loading: reactionMutation.isPending,
    handleLike,
    handleDislike,
  };
}
