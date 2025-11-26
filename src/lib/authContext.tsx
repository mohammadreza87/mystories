/**
 * Authentication context and hook.
 *
 * This provides the useAuth() hook that components use to access auth state.
 * Internally uses the Zustand authStore for state management.
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { useAuthStore } from '../stores/authStore';
import type { UserProfile } from './database.types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading, initialize, signOut, refreshProfile } = useAuthStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    initialize().then((unsubscribe) => {
      cleanup = unsubscribe;
    });

    return () => {
      cleanup?.();
    };
  }, [initialize]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication state and actions.
 *
 * @returns { user, profile, loading, signOut, refreshProfile }
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
