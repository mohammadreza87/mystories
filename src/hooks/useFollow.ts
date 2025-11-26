import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount } from '../lib/storyService';
import { queryKeys } from '../lib/queryClient';

interface UseFollowResult {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  loading: boolean;
  toggleFollow: () => Promise<void>;
}

export function useFollow(
  currentUserId: string | undefined,
  targetUserId: string
): UseFollowResult {
  const queryClient = useQueryClient();
  const canFollow = !!currentUserId && currentUserId !== targetUserId;

  // Query for follow status
  const { data: followingStatus } = useQuery({
    queryKey: queryKeys.isFollowing(currentUserId || '', targetUserId),
    queryFn: () => isFollowing(targetUserId),
    enabled: canFollow,
  });

  // Query for follower count
  const { data: followersCount = 0 } = useQuery({
    queryKey: queryKeys.followers(targetUserId),
    queryFn: () => getFollowerCount(targetUserId),
  });

  // Query for following count
  const { data: followingCount = 0 } = useQuery({
    queryKey: queryKeys.following(targetUserId),
    queryFn: () => getFollowingCount(targetUserId),
  });

  // Mutation for toggle follow
  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (followingStatus) {
        await unfollowUser(targetUserId);
        return false;
      } else {
        await followUser(targetUserId);
        return true;
      }
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.isFollowing(currentUserId || '', targetUserId),
      });
      await queryClient.cancelQueries({
        queryKey: queryKeys.followers(targetUserId),
      });

      // Snapshot previous values
      const previousFollowing = queryClient.getQueryData(
        queryKeys.isFollowing(currentUserId || '', targetUserId)
      );
      const previousFollowers = queryClient.getQueryData(
        queryKeys.followers(targetUserId)
      );

      // Optimistically update
      const newFollowing = !followingStatus;
      queryClient.setQueryData(
        queryKeys.isFollowing(currentUserId || '', targetUserId),
        newFollowing
      );
      queryClient.setQueryData(
        queryKeys.followers(targetUserId),
        (old: number) => (newFollowing ? old + 1 : Math.max(0, old - 1))
      );

      return { previousFollowing, previousFollowers };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          queryKeys.isFollowing(currentUserId || '', targetUserId),
          context.previousFollowing
        );
        queryClient.setQueryData(
          queryKeys.followers(targetUserId),
          context.previousFollowers
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: queryKeys.isFollowing(currentUserId || '', targetUserId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.followers(targetUserId),
      });
    },
  });

  const toggleFollow = useCallback(async () => {
    if (!canFollow || toggleMutation.isPending) return;
    await toggleMutation.mutateAsync();
  }, [canFollow, toggleMutation]);

  return {
    isFollowing: followingStatus ?? false,
    followersCount,
    followingCount,
    loading: toggleMutation.isPending,
    toggleFollow,
  };
}

/**
 * Hook for tracking follow status of multiple users
 */
export function useFollowMultiple(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  const checkFollowing = useCallback(
    async (targetUserId: string): Promise<boolean> => {
      if (!currentUserId || currentUserId === targetUserId) return false;

      // Check cache first
      const cached = queryClient.getQueryData<boolean>(
        queryKeys.isFollowing(currentUserId, targetUserId)
      );
      if (cached !== undefined) return cached;

      // Fetch and cache
      const result = await isFollowing(targetUserId);
      queryClient.setQueryData(
        queryKeys.isFollowing(currentUserId, targetUserId),
        result
      );
      return result;
    },
    [currentUserId, queryClient]
  );

  const toggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!currentUserId || currentUserId === targetUserId) return;

      const currentlyFollowing =
        queryClient.getQueryData<boolean>(
          queryKeys.isFollowing(currentUserId, targetUserId)
        ) ?? false;

      try {
        if (currentlyFollowing) {
          await unfollowUser(targetUserId);
        } else {
          await followUser(targetUserId);
        }
        queryClient.setQueryData(
          queryKeys.isFollowing(currentUserId, targetUserId),
          !currentlyFollowing
        );
      } catch (error) {
        console.error('Error toggling follow:', error);
        throw error;
      }
    },
    [currentUserId, queryClient]
  );

  const isFollowingUser = useCallback(
    (userId: string): boolean => {
      return (
        queryClient.getQueryData<boolean>(
          queryKeys.isFollowing(currentUserId || '', userId)
        ) ?? false
      );
    },
    [currentUserId, queryClient]
  );

  return {
    checkFollowing,
    toggleFollow,
    isFollowing: isFollowingUser,
  };
}
