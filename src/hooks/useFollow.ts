import { useState, useEffect, useCallback } from 'react';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount } from '../lib/storyService';

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
  const [following, setFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!currentUserId || currentUserId === targetUserId) return;

      try {
        const [isFollowingUser, followers, following] = await Promise.all([
          isFollowing(targetUserId),
          getFollowerCount(targetUserId),
          getFollowingCount(targetUserId),
        ]);

        setFollowing(isFollowingUser);
        setFollowersCount(followers);
        setFollowingCount(following);
      } catch (error) {
        console.error('Error loading follow status:', error);
      }
    };

    loadFollowStatus();
  }, [currentUserId, targetUserId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || currentUserId === targetUserId || loading) return;

    setLoading(true);
    try {
      if (following) {
        await unfollowUser(targetUserId);
        setFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await followUser(targetUserId);
        setFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, targetUserId, following, loading]);

  return {
    isFollowing: following,
    followersCount,
    followingCount,
    loading,
    toggleFollow,
  };
}

/**
 * Hook for tracking follow status of multiple users
 */
export function useFollowMultiple(currentUserId: string | undefined) {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const checkFollowing = useCallback(async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return false;

    try {
      const isFollowingUser = await isFollowing(targetUserId);
      setFollowingMap(prev => ({ ...prev, [targetUserId]: isFollowingUser }));
      return isFollowingUser;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }, [currentUserId]);

  const toggleFollow = useCallback(async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId || loadingMap[targetUserId]) return;

    setLoadingMap(prev => ({ ...prev, [targetUserId]: true }));
    try {
      if (followingMap[targetUserId]) {
        await unfollowUser(targetUserId);
        setFollowingMap(prev => ({ ...prev, [targetUserId]: false }));
      } else {
        await followUser(targetUserId);
        setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      throw error;
    } finally {
      setLoadingMap(prev => ({ ...prev, [targetUserId]: false }));
    }
  }, [currentUserId, followingMap, loadingMap]);

  return {
    followingMap,
    loadingMap,
    checkFollowing,
    toggleFollow,
    isFollowing: (userId: string) => followingMap[userId] ?? false,
    isLoading: (userId: string) => loadingMap[userId] ?? false,
  };
}
