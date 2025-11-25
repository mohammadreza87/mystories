import { supabase } from './supabase';

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

export async function isFollowing(followingId: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', session.user.id)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('followers_count')
    .eq('id', userId)
    .maybeSingle();

  return data?.followers_count || 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { data } = await supabase
    .from('profiles')
    .select('following_count')
    .eq('id', userId)
    .maybeSingle();

  return data?.following_count || 0;
}
