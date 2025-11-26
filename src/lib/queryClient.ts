/**
 * React Query client configuration.
 * Centralized query client with default options for caching and error handling.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * Query keys for consistent cache invalidation.
 */
export const queryKeys = {
  // User-related queries
  profile: (userId: string) => ['profile', userId] as const,
  publicProfile: (userId: string) => ['publicProfile', userId] as const,
  subscriptionUsage: (userId: string) => ['subscriptionUsage', userId] as const,

  // Story-related queries
  stories: () => ['stories'] as const,
  story: (storyId: string) => ['story', storyId] as const,
  userStories: (userId: string) => ['userStories', userId] as const,
  storyReactions: (storyId: string) => ['storyReactions', storyId] as const,
  userReaction: (userId: string, storyId: string) =>
    ['userReaction', userId, storyId] as const,

  // Follow-related queries
  followers: (userId: string) => ['followers', userId] as const,
  following: (userId: string) => ['following', userId] as const,
  isFollowing: (currentUserId: string, targetUserId: string) =>
    ['isFollowing', currentUserId, targetUserId] as const,

  // Feed queries
  feed: () => ['feed'] as const,
  publicStories: () => ['publicStories'] as const,
};
