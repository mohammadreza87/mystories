/**
 * Follow service - single source of truth for follow/unfollow functionality.
 *
 * Uses cached counts from user_profiles table for performance.
 */

import { supabase } from './supabase';

/**
 * Follow a user.
 * @throws Error if not authenticated
 */
export async function followUser(followingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_follows')
    .insert({
      follower_id: session.user.id,
      following_id: followingId
    });

  if (error) throw error;
}

/**
 * Unfollow a user.
 * @throws Error if not authenticated
 */
export async function unfollowUser(followingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', session.user.id)
    .eq('following_id', followingId);

  if (error) throw error;
}

/**
 * Check if a user is following another user.
 *
 * @param followingId - The ID of the user to check
 * @param followerId - Optional follower ID. If not provided, uses current session user.
 * @returns true if following, false otherwise
 */
export async function isFollowing(followingId: string, followerId?: string): Promise<boolean> {
  let actualFollowerId = followerId;

  if (!actualFollowerId) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    actualFollowerId = session.user.id;
  }

  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', actualFollowerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

/**
 * Get the follower count for a user (from cached profile).
 */
export async function getFollowerCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_profiles')
    .select('followers_count')
    .eq('id', userId)
    .maybeSingle();

  return data?.followers_count || 0;
}

/**
 * Get the following count for a user (from cached profile).
 */
export async function getFollowingCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_profiles')
    .select('following_count')
    .eq('id', userId)
    .maybeSingle();

  return data?.following_count || 0;
}
