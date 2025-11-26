# Next Tale - Refactoring Code Examples

This document provides concrete before/after code examples for the most critical refactorings.

---

## Example 1: Auth State Consolidation

### BEFORE (Dual State Management)

```typescript
// ❌ src/lib/authContext.tsx (DELETE THIS FILE)
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

```typescript
// ❌ src/stores/authStore.ts (DUPLICATE LOGIC)
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  // ... duplicate logic
}

export const useAuthStore = create<AuthState>((set) => ({
  // ... same logic as AuthContext
}));
```

### AFTER (Single Source of Truth)

```typescript
// ✅ src/features/auth/stores/authStore.ts (SINGLE SOURCE)
import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile } from '@/shared/types/database.types';

interface AuthState {
  // State
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    try {
      set({ loading: true });

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user });

        // Fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({ profile });
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        const newUser = session?.user ?? null;
        set({ user: newUser });

        if (newUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', newUser.id)
            .single();

          set({ profile: profile ?? null });
        } else {
          set({ profile: null });
        }
      });
    } finally {
      set({ loading: false, initialized: true });
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
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      set({ profile });
    }
  },
}));

// ✅ src/features/auth/index.ts (Barrel export)
export { useAuth } from './stores/authStore';
export { Auth } from './components/Auth';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
```

```typescript
// ✅ src/App.tsx (Updated)
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/features/auth'; // ← Single import
import { queryClient } from '@/lib/queryClient';
import { router } from './routes';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { ToastProvider } from '@/shared/components/Toast';

function App() {
  const initialize = useAuth((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
```

**Benefits:**
- ✅ Single source of truth (no sync issues)
- ✅ Better performance (Zustand is faster than Context)
- ✅ Simpler API (no Provider wrapper needed)
- ✅ Easier to test (mock the store)

---

## Example 2: Follow System Consolidation

### BEFORE (Duplicated in 2 files)

```typescript
// ❌ src/lib/storyService.ts (lines 300-350)
export async function followUser(followingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: user.id, following_id: followingId });

  if (error) throw error;
}

export async function unfollowUser(followingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', followingId);

  if (error) throw error;
}

export async function isFollowing(userId: string, followingId: string): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', userId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

// ... more duplicate functions
```

```typescript
// ❌ src/lib/followService.ts (EXACT DUPLICATES)
export async function followUser(followingId: string): Promise<void> {
  // ... exact same code
}

export async function unfollowUser(followingId: string): Promise<void> {
  // ... exact same code
}

export async function isFollowing(followingId: string): Promise<boolean> {
  // ... exact same code
}
```

### AFTER (Single Location with Hook)

```typescript
// ✅ src/features/social/services/followApi.ts
import { supabase } from '@/lib/supabase/client';

export const followApi = {
  async follow(followingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_follows')
      .insert({
        follower_id: session.user.id,
        following_id: followingId,
      });

    if (error) throw error;
  },

  async unfollow(followingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', followingId);

    if (error) throw error;
  },

  async isFollowing(followingId: string): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data } = await supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', followingId)
      .maybeSingle();

    return !!data;
  },

  async getFollowerCount(userId: string): Promise<number> {
    const { data } = await supabase
      .from('profiles')
      .select('followers_count')
      .eq('id', userId)
      .maybeSingle();

    return data?.followers_count || 0;
  },

  async getFollowingCount(userId: string): Promise<number> {
    const { data } = await supabase
      .from('profiles')
      .select('following_count')
      .eq('id', userId)
      .maybeSingle();

    return data?.following_count || 0;
  },
};
```

```typescript
// ✅ src/features/social/hooks/useFollow.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import { followApi } from '../services/followApi';

export function useFollow(targetUserId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const canFollow = !!user && user.id !== targetUserId;

  // Query for follow status
  const { data: isFollowing = false, isLoading } = useQuery({
    queryKey: ['follow', user?.id, targetUserId],
    queryFn: () => followApi.isFollowing(targetUserId),
    enabled: canFollow,
  });

  // Mutation for toggle follow
  const toggleMutation = useMutation({
    mutationFn: () =>
      isFollowing
        ? followApi.unfollow(targetUserId)
        : followApi.follow(targetUserId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['follow', user?.id, targetUserId],
      });

      // Snapshot previous value
      const previousFollowing = queryClient.getQueryData([
        'follow',
        user?.id,
        targetUserId,
      ]);

      // Optimistically update
      queryClient.setQueryData(
        ['follow', user?.id, targetUserId],
        !isFollowing
      );

      return { previousFollowing };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousFollowing !== undefined) {
        queryClient.setQueryData(
          ['follow', user?.id, targetUserId],
          context.previousFollowing
        );
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({
        queryKey: ['follow', user?.id, targetUserId],
      });
      queryClient.invalidateQueries({
        queryKey: ['followers', targetUserId],
      });
    },
  });

  return {
    isFollowing,
    loading: isLoading || toggleMutation.isPending,
    toggle: toggleMutation.mutate,
  };
}
```

```typescript
// ✅ src/features/social/components/FollowButton.tsx
import { UserPlus, UserCheck, Loader } from 'lucide-react';
import { useFollow } from '../hooks/useFollow';

interface FollowButtonProps {
  userId: string;
  className?: string;
}

export function FollowButton({ userId, className = '' }: FollowButtonProps) {
  const { isFollowing, loading, toggle } = useFollow(userId);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold disabled:opacity-50 ${
        isFollowing
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-blue-500 text-white hover:bg-blue-600'
      } ${className}`}
    >
      {loading ? (
        <Loader className="w-3 h-3 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserCheck className="w-3 h-3" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-3 h-3" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
```

```typescript
// ✅ Usage in components
import { FollowButton } from '@/features/social';

function StoryCard({ story }) {
  return (
    <div>
      <h3>{story.title}</h3>
      {story.created_by && (
        <FollowButton userId={story.created_by} />
      )}
    </div>
  );
}
```

**Benefits:**
- ✅ No duplication (single source of truth)
- ✅ Reusable hook (use anywhere)
- ✅ Optimistic updates (instant UI feedback)
- ✅ Automatic caching (React Query)
- ✅ Easy to test (mock the API)

---

## Example 3: Component Refactoring (StoryLibrary)

### BEFORE (450 lines monolith)

```typescript
// ❌ src/components/StoryLibrary.tsx (450 lines)
export function StoryLibrary({ onSelectStory, onViewProfile, userId }: Props) {
  // 50 lines of state
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState<Record<string, StoryReaction>>({});
  const [followingUsers, setFollowingUsers] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  // 100 lines of data fetching
  useEffect(() => {
    loadStories();
    loadUserReactions();
    loadFollowingStatus();

    const channel = supabase
      .channel('story_reactions_changes')
      .on('postgres_changes', { /* ... */ }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStories = async () => {
    try {
      const data = await getStories();
      setStories(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stories:', error);
      setLoading(false);
    }
  };

  const loadUserReactions = async () => {
    // ... 30 lines
  };

  const loadFollowingStatus = async () => {
    // ... 40 lines
  };

  // 100 lines of handlers
  const handleReaction = async (storyId: string, type: 'like' | 'dislike') => {
    // ... 40 lines
  };

  const handleFollowToggle = async (creatorId: string) => {
    // ... 30 lines
  };

  const handleShare = async (storyId: string, title: string) => {
    // ... 30 lines
  };

  // 200 lines of JSX
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* 150 lines of nested JSX */}
        <div className="space-y-4">
          {stories.map((story) => (
            <div key={story.id} className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* 100 lines of card JSX */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### AFTER (Split into 4 focused files)

```typescript
// ✅ src/features/stories/hooks/useStories.ts (80 lines)
import { useQuery } from '@tanstack/react-query';
import { storyApi } from '../services/storyApi';

export function useStories() {
  const { data: stories = [], isLoading, error } = useQuery({
    queryKey: ['stories'],
    queryFn: storyApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stories,
    loading: isLoading,
    error,
  };
}
```

```typescript
// ✅ src/features/stories/components/StoryCard.tsx (80 lines)
import { Clock, Users, CheckCircle2, Share2 } from 'lucide-react';
import { Story } from '@/shared/types';
import { ReactionButtons } from '@/features/reactions';
import { FollowButton } from '@/features/social';

interface StoryCardProps {
  story: Story;
  onSelect: (id: string) => void;
  onViewProfile: (userId: string) => void;
}

export function StoryCard({ story, onSelect, onViewProfile }: StoryCardProps) {
  const handleShare = async () => {
    const url = `${window.location.origin}/story/${story.id}`;
    if (navigator.share) {
      await navigator.share({ title: story.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <div
      className="bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer"
      onClick={() => onSelect(story.id)}
    >
      {/* Cover Image */}
      <div className="h-40 bg-gradient-to-br from-yellow-200 via-orange-200 to-pink-200">
        {story.cover_image_url && (
          <img
            src={story.cover_image_url}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-800 mb-2">{story.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{story.description}</p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{story.estimated_duration} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>Ages {story.age_range}</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle2 className="w-3 h-3" />
            <span>{story.completion_count || 0} completed</span>
          </div>
        </div>

        {/* Creator */}
        {story.creator && (
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewProfile(story.created_by);
              }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              {story.creator.avatar_url && (
                <img
                  src={story.creator.avatar_url}
                  alt={story.creator.display_name}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span>By {story.creator.display_name}</span>
            </button>
            {story.created_by && (
              <FollowButton userId={story.created_by} />
            )}
          </div>
        )}

        {/* Reactions */}
        <div className="flex items-center justify-between mb-3">
          <ReactionButtons
            storyId={story.id}
            likesCount={story.likes_count}
            dislikesCount={story.dislikes_count}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(story.id);
          }}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl"
        >
          Start Adventure
        </button>
      </div>
    </div>
  );
}
```

```typescript
// ✅ src/features/stories/components/StoryList.tsx (40 lines)
import { Story } from '@/shared/types';
import { StoryCard } from './StoryCard';
import { EmptyState } from '@/shared/components/EmptyState';

interface StoryListProps {
  stories: Story[];
  onSelectStory: (id: string) => void;
  onViewProfile: (userId: string) => void;
}

export function StoryList({ stories, onSelectStory, onViewProfile }: StoryListProps) {
  if (stories.length === 0) {
    return <EmptyState message="No stories available yet." />;
  }

  return (
    <div className="space-y-4">
      {stories.map((story) => (
        <StoryCard
          key={story.id}
          story={story}
          onSelect={onSelectStory}
          onViewProfile={onViewProfile}
        />
      ))}
    </div>
  );
}
```

```typescript
// ✅ src/features/stories/containers/StoryLibraryContainer.tsx (60 lines)
import { Bird } from 'lucide-react';
import { useStories } from '../hooks/useStories';
import { StoryList } from '../components/StoryList';
import { LoadingState } from '@/shared/components/LoadingState';
import { ErrorState } from '@/shared/components/ErrorState';

interface StoryLibraryContainerProps {
  onSelectStory: (id: string) => void;
  onViewProfile: (userId: string) => void;
}

export function StoryLibraryContainer({
  onSelectStory,
  onViewProfile,
}: StoryLibraryContainerProps) {
  const { stories, loading, error } = useStories();

  if (loading) {
    return <LoadingState fullScreen message="Loading stories..." />;
  }

  if (error) {
    return <ErrorState error={error} fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl shadow-lg mb-3">
            <Bird className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Next Tale</h1>
          <p className="text-sm text-gray-600">Discover your next adventure</p>
        </div>

        {/* Story List */}
        <StoryList
          stories={stories}
          onSelectStory={onSelectStory}
          onViewProfile={onViewProfile}
        />
      </div>
    </div>
  );
}
```

**Benefits:**
- ✅ 450 lines → 4 files (~60 lines each)
- ✅ Clear separation (Container → List → Card)
- ✅ Reusable components (StoryCard, StoryList)
- ✅ Easy to test (mock hooks)
- ✅ Easy to understand (single responsibility)

---

## Example 4: Shared Components

### BEFORE (Repeated everywhere)

```typescript
// ❌ Repeated in 15+ components
{loading && (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
  </div>
)}

{error && (
  <div className="text-red-500 p-4">
    Error: {error.message}
  </div>
)}
```

### AFTER (Reusable components)

```typescript
// ✅ src/shared/components/LoadingState/LoadingState.tsx
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export function LoadingState({
  size = 'md',
  fullScreen = false,
  message,
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-4',
    lg: 'h-24 w-24 border-4',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size]}`}
      />
      {message && <p className="text-gray-600 text-sm">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {content}
      </div>
    );
  }

  return content;
}
```

```typescript
// ✅ src/shared/components/ErrorState/ErrorState.tsx
interface ErrorStateProps {
  error: Error | string;
  retry?: () => void;
  fullScreen?: boolean;
}

export function ErrorState({ error, retry, fullScreen }: ErrorStateProps) {
  const message = typeof error === 'string' ? error : error.message;

  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="text-red-500 text-5xl">⚠️</div>
      <h3 className="text-xl font-bold text-gray-800">Something went wrong</h3>
      <p className="text-gray-600 text-center max-w-md">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600"
        >
          Try Again
        </button>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
```

```typescript
// ✅ Usage
import { LoadingState, ErrorState } from '@/shared/components';

function MyComponent() {
  const { data, loading, error, refetch } = useQuery(/* ... */);

  if (loading) return <LoadingState fullScreen message="Loading data..." />;
  if (error) return <ErrorState error={error} retry={refetch} fullScreen />;

  return <div>{/* render data */}</div>;
}
```

**Benefits:**
- ✅ DRY (Don't Repeat Yourself)
- ✅ Consistent UI across app
- ✅ Easy to update (change once, applies everywhere)
- ✅ Smaller bundle (code reuse)

---

## Summary

These examples demonstrate the key refactoring patterns:

1. **Consolidate duplicate code** into single sources
2. **Extract hooks** for business logic
3. **Create small components** with single responsibilities
4. **Use React Query** for data fetching
5. **Build reusable components** for common UI patterns

Apply these patterns throughout the codebase for a clean, maintainable architecture.
