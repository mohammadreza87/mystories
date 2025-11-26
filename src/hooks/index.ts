/**
 * Custom React hooks for the MyStories application.
 *
 * These hooks encapsulate common patterns used across components,
 * promoting code reuse and separation of concerns.
 */

// Subscription and usage tracking
export { useSubscriptionUsage } from './useSubscriptionUsage';

// Story reactions (likes/dislikes)
export { useStoryReactions } from './useStoryReactions';

// Follow/unfollow users
export { useFollow, useFollowMultiple } from './useFollow';

// Share functionality
export { useShare } from './useShare';

// User profile management
export { useProfile, usePublicProfile } from './useProfile';
export type { UserProfile } from './useProfile';

// Timer utilities (memory-safe timeouts and intervals)
export { useTimeout, useInterval, useIsMounted, useSafeAsync } from './useTimeout';
