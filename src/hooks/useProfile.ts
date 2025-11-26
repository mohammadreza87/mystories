import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

export function useProfile(userId: string | undefined): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err : new Error('Failed to load profile'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!userId || !profile) return;

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  }, [userId, profile]);

  return {
    profile,
    loading,
    error,
    refresh: loadProfile,
    updateProfile,
  };
}

/**
 * Hook for loading a public profile (for viewing other users)
 */
export function usePublicProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('user_profiles')
          .select('id, username, display_name, bio, avatar_url, is_profile_public')
          .eq('id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        // Check if profile is public
        if (data && !data.is_profile_public) {
          setProfile(null);
          setError(new Error('This profile is private'));
        } else {
          setProfile(data);
        }
      } catch (err) {
        console.error('Error loading public profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to load profile'));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  return { profile, loading, error };
}
