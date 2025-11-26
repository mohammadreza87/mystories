import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryClient';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  is_profile_public: boolean;
  subscription_tier: string;
  is_grandfathered: boolean;
  total_points: number;
  reading_points: number;
  creating_points: number;
}

interface UseProfileResult {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateProfileApi(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export function useProfile(userId: string | undefined): UseProfileResult {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.profile(userId || ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<UserProfile>) =>
      updateProfileApi(userId!, updates),
    onSuccess: (_, updates) => {
      // Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.profile(userId!),
        (old: UserProfile | null) => (old ? { ...old, ...updates } : null)
      );
    },
  });

  const refresh = async () => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;
    await updateMutation.mutateAsync(updates);
  };

  return {
    profile: profile ?? null,
    loading: isLoading,
    error: (error || updateMutation.error) as Error | null,
    refresh,
    updateProfile,
  };
}

/**
 * Hook for loading a public profile (for viewing other users)
 */
async function fetchPublicProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, bio, avatar_url, is_profile_public')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  // Check if profile is public
  if (data && !data.is_profile_public) {
    throw new Error('This profile is private');
  }

  return data as UserProfile | null;
}

export function usePublicProfile(userId: string | undefined) {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.publicProfile(userId || ''),
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });

  return {
    profile: profile ?? null,
    loading: isLoading,
    error: error as Error | null,
  };
}
