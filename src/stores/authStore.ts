/**
 * Authentication store using Zustand.
 * Single source of truth for user authentication state.
 *
 * This store is used internally by AuthProvider in authContext.tsx.
 * Components should use the useAuth() hook from authContext.tsx.
 */

import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/database.types';

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<() => void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    // Prevent double initialization
    if (get().initialized) {
      return () => {}; // No-op cleanup
    }

    set({ loading: true });

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user });
        // Fetch profile in parallel
        get().refreshProfile();
      }

      // Subscribe to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          const newUser = session?.user ?? null;
          set({ user: newUser });

          if (newUser) {
            await get().refreshProfile();
          } else {
            set({ profile: null });
          }
        }
      );

      set({ loading: false, initialized: true });

      // Return cleanup function
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({ loading: false, initialized: true });
      return () => {};
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    set({ profile: profile ?? null });
  },
}));
