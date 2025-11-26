import { supabase } from './supabase';

async function requireSessionUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return session.user.id;
}

export async function followUser(targetUserId: string): Promise<void> {
  const followerId = await requireSessionUserId();

  const { error } = await supabase
    .from('user_follows')
    .insert({
      follower_id: followerId,
      following_id: targetUserId,
    });

  // Ignore duplicate follows; Postgres will throw but state is already correct
  if (error && error.code !== '23505') throw error;
}

export async function unfollowUser(targetUserId: string): Promise<void> {
  const followerId = await requireSessionUserId();

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', targetUserId);

  if (error) throw error;
}

export async function isFollowing(targetUserId: string, followerId?: string): Promise<boolean> {
  const currentFollowerId = followerId ?? await requireSessionUserId();

  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', currentFollowerId)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function getFollowingIds(followerId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', followerId);

  if (error) throw error;
  return data?.map((row) => row.following_id) ?? [];
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  if (error) throw error;
  return count ?? 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) throw error;
  return count ?? 0;
}
