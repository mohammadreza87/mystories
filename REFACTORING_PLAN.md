# MyStories - Detailed Refactoring Plan

## Phase 1: Foundation Fixes (Week 1)

### 1.1 Merge Config Files

**BEFORE:**
```typescript
// src/config.ts
import { getConfig } from './lib/env';
const envConfig = getConfig();
export const config = {
  supabase: { url: envConfig.supabase.url, anonKey: envConfig.supabase.anonKey },
  stripe: { publishableKey: envConfig.stripe.publishableKey },
};

// src/config/index.ts
export const config = {
  supabase: { url: requireEnv('VITE_SUPABASE_URL'), ... },
  limits: { free: { storiesPerDay: 1 }, pro: { storiesPerDay: Infinity } },
  gamification: { points: { readChapter: 10, ... } },
};
```

**AFTER:**
```typescript
// src/app/config/index.ts (single source of truth)
import { getConfig } from './env';

const envConfig = getConfig();

export const config = {
  supabase: {
    url: envConfig.supabase.url,
    anonKey: envConfig.supabase.anonKey,
    functionsUrl: `${envConfig.supabase.url}/functions/v1`,
  },
  stripe: {
    publishableKey: envConfig.stripe.publishableKey,
  },
  limits: {
    free: { storiesPerDay: 1 },
    pro: { storiesPerDay: Infinity },
  },
  gamification: {
    points: { readChapter: 1, completeStory: 5, createStory: 5 },
  },
  features: {
    enableAudioNarration: true,
    enableImageGeneration: true,
  },
} as const;
```

---

### 1.2 Consolidate Auth State (Remove Context)

**BEFORE:**
```typescript
// src/lib/authContext.tsx (DELETE THIS)
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // ... 50 lines of duplicate logic
}

// src/stores/authStore.ts (KEEP THIS)
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  // ... same logic
}));
```

**AFTER:**
```typescript
// src/features/auth/stores/authStore.ts (single source)
import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
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
    set({ loading: true });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user });
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ profile });
    }
    
    supabase.auth.onAuthStateChange(async (_, session) => {
      set({ user: session?.user ?? null });
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ profile });
      } else {
        set({ profile: null });
      }
    });
    
    set({ loading: false, initialized: true });
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
    set({ profile });
  },
}));

// Usage in components:
const { user, loading, signOut } = useAuth();
```

---

### 1.3 Extract Follow Functions (Single Location)

**BEFORE (Duplicated):**
```typescript
// src/lib/storyService.ts (lines 300-350)
export async function followUser(followingId: string) { /* ... */ }
export async function unfollowUser(followingId: string) { /* ... */ }
export async function isFollowing(userId: string, followingId: string) { /* ... */ }
export async function getFollowerCount(userId: string) { /* ... */ }
export async function getFollowingCount(userId: string) { /* ... */ }

// src/lib/followService.ts (lines 1-60) - EXACT DUPLICATES
export async function followUser(followingId: string) { /* ... */ }
export async function unfollowUser(followingId: string) { /* ... */ }
// ... etc
```

**AFTER (Single Source):**
```typescript
// src/features/social/services/followApi.ts
import { supabase } from '@/lib/supabase/client';

export const followApi = {
  async follow(followingId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('user_follows')
      .insert({ follower_id: session.user.id, following_id: followingId });

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

// src/features/social/hooks/useFollow.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { followApi } from '../services/followApi';

export function useFollow(targetUserId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: isFollowing = false } = useQuery({
    queryKey: ['follow', user?.id, targetUserId],
    queryFn: () => followApi.isFollowing(targetUserId),
    enabled: !!user && user.id !== targetUserId,
  });

  const toggleMutation = useMutation({
    mutationFn: () => isFollowing 
      ? followApi.unfollow(targetUserId) 
      : followApi.follow(targetUserId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow'] });
      queryClient.invalidateQueries({ queryKey: ['followers', targetUserId] });
    },
  });

  return {
    isFollowing,
    toggle: toggleMutation.mutate,
    loading: toggleMutation.isPending,
  };
}
```

---

### 1.4 Extract Reaction Functions

**BEFORE (Duplicated in storyService + components):**
```typescript
// src/lib/storyService.ts
export async function getUserReaction(userId, storyId) { /* ... */ }
export async function addReaction(userId, storyId, type) { /* ... */ }
export async function updateReaction(userId, storyId, type) { /* ... */ }
export async function removeReaction(userId, storyId) { /* ... */ }

// Also repeated inline in StoryLibrary.tsx, StoryReader.tsx
```

**AFTER:**
```typescript
// src/features/reactions/services/reactionApi.ts
import { supabase } from '@/lib/supabase/client';

export const reactionApi = {
  async getUserReaction(userId: string, storyId: string) {
    const { data } = await supabase
      .from('story_reactions')
      .select('*')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .maybeSingle();
    return data;
  },

  async add(userId: string, storyId: string, type: 'like' | 'dislike') {
    const { error } = await supabase
      .from('story_reactions')
      .insert({ user_id: userId, story_id: storyId, reaction_type: type });
    if (error) throw error;
  },

  async update(userId: string, storyId: string, type: 'like' | 'dislike') {
    const { error } = await supabase
      .from('story_reactions')
      .update({ reaction_type: type })
      .eq('user_id', userId)
      .eq('story_id', storyId);
    if (error) throw error;
  },

  async remove(userId: string, storyId: string) {
    const { error } = await supabase
      .from('story_reactions')
      .delete()
      .eq('user_id', userId)
      .eq('story_id', storyId);
    if (error) throw error;
  },
};

// src/features/reactions/hooks/useReactions.ts
export function useReactions(storyId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: userReaction } = useQuery({
    queryKey: ['reaction', user?.id, storyId],
    queryFn: () => reactionApi.getUserReaction(user!.id, storyId),
    enabled: !!user,
  });

  const reactMutation = useMutation({
    mutationFn: (type: 'like' | 'dislike') => {
      if (!user) throw new Error('Not authenticated');
      
      if (userReaction?.reaction_type === type) {
        return reactionApi.remove(user.id, storyId);
      } else if (userReaction) {
        return reactionApi.update(user.id, storyId, type);
      } else {
        return reactionApi.add(user.id, storyId, type);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reaction'] });
      queryClient.invalidateQueries({ queryKey: ['story', storyId] });
    },
  });

  return {
    userReaction,
    react: reactMutation.mutate,
    loading: reactMutation.isPending,
  };
}
```

---

### 1.5 Create Shared Components

**BEFORE (Repeated 15+ times):**
```typescript
// In every component:
{loading && (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent"></div>
  </div>
)}
```

**AFTER:**
```typescript
// src/shared/components/LoadingState/LoadingState.tsx
interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
}

export function LoadingState({ 
  size = 'md', 
  fullScreen = false,
  message 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-2',
    md: 'h-16 w-16 border-4',
    lg: 'h-24 w-24 border-4',
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClasses[size]}`} />
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

// Usage:
<LoadingState fullScreen message="Loading stories..." />
```

```typescript
// src/shared/components/ErrorState/ErrorState.tsx
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
    return <div className="min-h-screen flex items-center justify-center">{content}</div>;
  }

  return content;
}
```

---

## Phase 2: Feature Extraction (Week 2)

### 2.1 Create Feature Folders

```bash
mkdir -p src/features/{auth,stories,reactions,social,subscription,profile}
mkdir -p src/features/{auth,stories,reactions,social,subscription,profile}/{components,hooks,services}
```

### 2.2 Move Auth Feature

**Files to move:**
```
src/components/Auth.tsx → src/features/auth/components/Auth.tsx
src/components/auth/* → src/features/auth/components/
src/stores/authStore.ts → src/features/auth/stores/authStore.ts
```

**Create barrel export:**
```typescript
// src/features/auth/index.ts
export { useAuth } from './stores/authStore';
export { Auth } from './components/Auth';
export { LoginForm } from './components/LoginForm';
export { SignupForm } from './components/SignupForm';
```

### 2.3 Move Stories Feature

**Files to move:**
```
src/components/StoryLibrary.tsx → src/features/stories/containers/StoryLibraryContainer.tsx
src/components/StoryCreator.tsx → src/features/stories/containers/StoryCreatorContainer.tsx
src/components/StoryReader.tsx → src/features/stories/containers/StoryReaderContainer.tsx
src/components/StoryDetail.tsx → src/features/stories/containers/StoryDetailContainer.tsx
src/components/story/* → src/features/stories/components/
src/lib/storyService.ts → src/features/stories/services/storyApi.ts
```

---

## Phase 3: Component Refactoring (Week 3)

### 3.1 Refactor StoryLibrary (450 lines → 3 components)

**BEFORE (450 lines, mixed concerns):**
```typescript
// src/components/StoryLibrary.tsx
export function StoryLibrary({ onSelectStory, onViewProfile, userId }) {
  // 50 lines of state
  const [stories, setStories] = useState([]);
  const [userReactions, setUserReactions] = useState({});
  const [followingUsers, setFollowingUsers] = useState({});
  // ... more state

  // 100 lines of data fetching
  useEffect(() => { loadStories(); }, []);
  useEffect(() => { loadUserReactions(); }, [userId]);
  useEffect(() => { loadFollowingStatus(); }, [userId]);

  // 50 lines of handlers
  const handleReaction = async (storyId, type) => { /* ... */ };
  const handleFollowToggle = async (creatorId) => { /* ... */ };
  const handleShare = async (storyId, title) => { /* ... */ };
  const generateCoverImage = async (story) => { /* ... */ };

  // 250 lines of JSX
  return (
    <div>
      {/* massive JSX */}
    </div>
  );
}
```

**AFTER (Split into 3 focused components):**

```typescript
// src/features/stories/hooks/useStories.ts (data + logic)
export function useStories() {
  const { user } = useAuth();

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: storyApi.getAll,
  });

  return { stories, loading: isLoading };
}

// src/features/stories/components/StoryCard.tsx (presentational, ~80 lines)
interface StoryCardProps {
  story: Story;
  onSelect: (id: string) => void;
  onViewProfile: (userId: string) => void;
}

export function StoryCard({ story, onSelect, onViewProfile }: StoryCardProps) {
  const { user } = useAuth();
  const { userReaction, react } = useReactions(story.id);
  const { isFollowing, toggle: toggleFollow } = useFollow(story.created_by);

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
      <StoryCover story={story} />
      <div className="p-4">
        <StoryHeader story={story} />
        <StoryMeta story={story} />
        <StoryCreator 
          creator={story.creator} 
          isFollowing={isFollowing}
          onToggleFollow={toggleFollow}
          onViewProfile={() => onViewProfile(story.created_by)}
        />
        <ReactionButtons
          storyId={story.id}
          userReaction={userReaction}
          likesCount={story.likes_count}
          dislikesCount={story.dislikes_count}
          onReact={react}
        />
        <button onClick={() => onSelect(story.id)}>
          Start Adventure
        </button>
      </div>
    </div>
  );
}

// src/features/stories/components/StoryList.tsx (presentational, ~40 lines)
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

// src/features/stories/containers/StoryLibraryContainer.tsx (smart, ~60 lines)
export function StoryLibraryContainer({ onSelectStory, onViewProfile }: Props) {
  const { stories, loading } = useStories();

  if (loading) return <LoadingState fullScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <LibraryHeader />
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
- ✅ Each component < 100 lines
- ✅ Clear separation: Container (data) → List (layout) → Card (item)
- ✅ Reusable components (StoryCard can be used elsewhere)
- ✅ Easy to test (mock hooks in container)
- ✅ Easy to understand (single responsibility)

---

### 3.2 Refactor StoryReader (800 lines → 5 components)

**BEFORE (800+ lines monolith):**
```typescript
// src/components/StoryReader.tsx
export function StoryReader({ storyId, userId, onComplete }) {
  // 100 lines of state
  const [chapters, setChapters] = useState([]);
  const [pathTaken, setPathTaken] = useState(['start']);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  // ... 20+ more state variables

  // 200 lines of effects and handlers
  useEffect(() => { loadStory(); }, [storyId]);
  useEffect(() => { loadProgress(); }, [userId, storyId]);
  useEffect(() => { generateAudio(); }, [currentChapter]);
  // ... 10+ more effects

  const handleChoice = async (choice) => { /* 50 lines */ };
  const handleAudioToggle = () => { /* 30 lines */ };
  const handleReaction = async (type) => { /* 40 lines */ };
  const handleShare = async () => { /* 30 lines */ };
  const handleRestart = () => { /* 20 lines */ };
  // ... more handlers

  // 500 lines of JSX
  return (
    <div>
      {/* massive nested JSX */}
    </div>
  );
}
```

**AFTER (Split into 5 focused components):**

```typescript
// src/features/stories/hooks/useStoryReader.ts (business logic, ~150 lines)
export function useStoryReader(storyId: string) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [pathTaken, setPathTaken] = useState<string[]>(['start']);

  const { data: story } = useQuery({
    queryKey: ['story', storyId],
    queryFn: () => storyApi.getById(storyId),
  });

  const loadChapter = useCallback(async (nodeKey: string) => {
    const node = await storyApi.getNode(storyId, nodeKey);
    if (!node) return;

    const choices = await storyApi.getChoices(node.id);
    setChapters(prev => [...prev, { node, choices }]);
    setPathTaken(prev => [...prev, nodeKey]);

    // Save progress
    if (user) {
      await storyApi.saveProgress(user.id, storyId, node.id, pathTaken, node.is_ending);
    }
  }, [storyId, user, pathTaken]);

  const handleChoice = useCallback(async (choice: StoryChoice) => {
    await loadChapter(choice.to_node.node_key);
  }, [loadChapter]);

  const restart = useCallback(() => {
    setChapters([]);
    setPathTaken(['start']);
    loadChapter('start');
  }, [loadChapter]);

  useEffect(() => {
    loadChapter('start');
  }, [storyId]);

  return {
    story,
    chapters,
    currentChapter: chapters[chapters.length - 1],
    handleChoice,
    restart,
  };
}

// src/features/stories/components/ChapterContent.tsx (~80 lines)
interface ChapterContentProps {
  chapter: StoryChapter;
  onChoice: (choice: StoryChoice) => void;
}

export function ChapterContent({ chapter, onChoice }: ChapterContentProps) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      {chapter.node.image_url && (
        <ChapterImage src={chapter.node.image_url} alt="Chapter illustration" />
      )}
      <ChapterText content={chapter.node.content} />
      {!chapter.node.is_ending && (
        <ChoiceButtons choices={chapter.choices} onSelect={onChoice} />
      )}
      {chapter.node.is_ending && (
        <EndingBadge type={chapter.node.ending_type} />
      )}
    </div>
  );
}

// src/features/stories/components/AudioPlayer.tsx (~60 lines)
interface AudioPlayerProps {
  audioUrl: string | null;
  isPlaying: boolean;
  onToggle: () => void;
}

export function AudioPlayer({ audioUrl, isPlaying, onToggle }: AudioPlayerProps) {
  if (!audioUrl) return null;

  return (
    <button
      onClick={onToggle}
      className="fixed bottom-24 right-6 w-16 h-16 bg-blue-500 rounded-full shadow-lg"
    >
      {isPlaying ? <Pause /> : <Play />}
    </button>
  );
}

// src/features/stories/components/ReaderHeader.tsx (~50 lines)
interface ReaderHeaderProps {
  story: Story;
  onBack: () => void;
  onRestart: () => void;
  onShare: () => void;
}

export function ReaderHeader({ story, onBack, onRestart, onShare }: ReaderHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white shadow-md">
      <button onClick={onBack}><ArrowLeft /></button>
      <h1 className="text-lg font-bold">{story.title}</h1>
      <div className="flex gap-2">
        <button onClick={onRestart}><RotateCcw /></button>
        <button onClick={onShare}><Share2 /></button>
      </div>
    </div>
  );
}

// src/features/stories/components/StoryProgress.tsx (~40 lines)
interface StoryProgressProps {
  currentChapter: number;
  totalChapters: number;
}

export function StoryProgress({ currentChapter, totalChapters }: StoryProgressProps) {
  const progress = (currentChapter / totalChapters) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-500 h-2 rounded-full transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// src/features/stories/containers/StoryReaderContainer.tsx (~100 lines)
export function StoryReaderContainer({ storyId, onComplete }: Props) {
  const { story, chapters, currentChapter, handleChoice, restart } = useStoryReader(storyId);
  const { audioUrl, isPlaying, toggle: toggleAudio } = useAudioPlayer(currentChapter?.node);
  const { userReaction, react } = useReactions(storyId);

  if (!story || !currentChapter) {
    return <LoadingState fullScreen message="Loading story..." />;
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/story/${storyId}`;
    await navigator.share({ title: story.title, url });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 pb-20">
      <ReaderHeader
        story={story}
        onBack={onComplete}
        onRestart={restart}
        onShare={handleShare}
      />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <StoryProgress
          currentChapter={chapters.length}
          totalChapters={10}
        />
        <ChapterContent
          chapter={currentChapter}
          onChoice={handleChoice}
        />
        <ReactionButtons
          storyId={storyId}
          userReaction={userReaction}
          likesCount={story.likes_count}
          dislikesCount={story.dislikes_count}
          onReact={react}
        />
      </div>
      <AudioPlayer
        audioUrl={audioUrl}
        isPlaying={isPlaying}
        onToggle={toggleAudio}
      />
    </div>
  );
}
```

**Benefits:**
- ✅ 800 lines → 5 components (~100 lines each)
- ✅ Business logic in hook (testable)
- ✅ UI components are pure (easy to style)
- ✅ Reusable components (AudioPlayer, ReaderHeader)
- ✅ Clear data flow

---

### 3.3 Refactor Profile (500 lines → 4 components)

**BEFORE (500 lines):**
```typescript
// src/components/Profile.tsx
export function Profile({ userId, onSelectStory }) {
  // 80 lines of state
  const [completedStories, setCompletedStories] = useState([]);
  const [createdStories, setCreatedStories] = useState([]);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('completed');
  const [subscription, setSubscription] = useState(null);
  // ... more state

  // 150 lines of data fetching
  useEffect(() => { loadProfile(); }, [userId]);
  useEffect(() => { loadCompletedStories(); }, [userId]);
  useEffect(() => { loadCreatedStories(); }, [userId]);
  useEffect(() => { loadSubscription(); }, [userId]);

  // 100 lines of handlers
  const handleDeleteStory = async (storyId) => { /* ... */ };
  const handleToggleVisibility = async (storyId, visibility) => { /* ... */ };
  const handleManageSubscription = async () => { /* ... */ };

  // 270 lines of JSX
  return (
    <div>
      {/* massive nested JSX */}
    </div>
  );
}
```

**AFTER (Split into 4 components):**

```typescript
// src/features/profile/hooks/useProfile.ts
export function useProfile(userId: string) {
  const { data: profile } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileApi.getById(userId),
  });

  const { data: completedStories = [] } = useQuery({
    queryKey: ['completedStories', userId],
    queryFn: () => storyApi.getCompleted(userId),
  });

  const { data: createdStories = [] } = useQuery({
    queryKey: ['createdStories', userId],
    queryFn: () => storyApi.getByUser(userId),
  });

  const { data: subscription } = useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => subscriptionApi.get(userId),
  });

  return { profile, completedStories, createdStories, subscription };
}

// src/features/profile/components/ProfileHeader.tsx (~80 lines)
export function ProfileHeader({ profile, subscription, onEdit, onSignOut }: Props) {
  return (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <div className="flex items-center gap-4">
        <ProfileAvatar profile={profile} />
        <ProfileInfo profile={profile} subscription={subscription} />
      </div>
      <ProfileStats profile={profile} />
      <div className="flex gap-2 mt-4">
        <button onClick={onEdit}>Edit Profile</button>
        <button onClick={onSignOut}>Sign Out</button>
      </div>
    </div>
  );
}

// src/features/profile/components/SubscriptionCard.tsx (~60 lines)
export function SubscriptionCard({ subscription, onUpgrade, onManage }: Props) {
  const isPro = subscription.tier === 'pro' || subscription.is_grandfathered;

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6">
      <h3>Subscription</h3>
      {isPro ? (
        <ProSubscriptionDetails subscription={subscription} onManage={onManage} />
      ) : (
        <FreeSubscriptionDetails subscription={subscription} onUpgrade={onUpgrade} />
      )}
    </div>
  );
}

// src/features/profile/components/StoryTabs.tsx (~100 lines)
export function StoryTabs({ 
  completedStories, 
  createdStories, 
  onSelectStory,
  onDeleteStory,
  onToggleVisibility 
}: Props) {
  const [activeTab, setActiveTab] = useState<'completed' | 'created'>('completed');

  return (
    <div className="bg-white rounded-3xl shadow-xl">
      <TabButtons activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'completed' ? (
        <CompletedStoriesList stories={completedStories} onSelect={onSelectStory} />
      ) : (
        <CreatedStoriesList 
          stories={createdStories}
          onSelect={onSelectStory}
          onDelete={onDeleteStory}
          onToggleVisibility={onToggleVisibility}
        />
      )}
    </div>
  );
}

// src/features/profile/containers/ProfileContainer.tsx (~80 lines)
export function ProfileContainer({ userId, onSelectStory }: Props) {
  const { user, signOut } = useAuth();
  const { profile, completedStories, createdStories, subscription } = useProfile(userId);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: storyApi.delete,
    onSuccess: () => queryClient.invalidateQueries(['createdStories']),
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      storyApi.updateVisibility(id, isPublic),
    onSuccess: () => queryClient.invalidateQueries(['createdStories']),
  });

  if (!profile) return <LoadingState fullScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <ProfileHeader
          profile={profile}
          subscription={subscription}
          onEdit={() => setShowEditModal(true)}
          onSignOut={signOut}
        />
        <SubscriptionCard
          subscription={subscription}
          onUpgrade={() => setShowUpgradeModal(true)}
          onManage={handleManageSubscription}
        />
        <StoryTabs
          completedStories={completedStories}
          createdStories={createdStories}
          onSelectStory={onSelectStory}
          onDeleteStory={deleteMutation.mutate}
          onToggleVisibility={(id, isPublic) => 
            toggleVisibilityMutation.mutate({ id, isPublic })
          }
        />
      </div>
      {showEditModal && <ProfileEditModal onClose={() => setShowEditModal(false)} />}
      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
}
```

---

## Phase 4: Hooks & Services (Week 4)

### 4.1 Standardize Data Fetching with React Query

**Pattern to follow:**

```typescript
// src/features/stories/services/storyApi.ts (API layer)
export const storyApi = {
  async getAll(): Promise<Story[]> {
    const { data, error } = await supabase
      .from('stories')
      .select('*, creator:profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Story> {
    const { data, error } = await supabase
      .from('stories')
      .select('*, creator:profiles(display_name, avatar_url)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(story: CreateStoryInput): Promise<Story> {
    const { data, error } = await supabase
      .from('stories')
      .insert(story)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// src/features/stories/hooks/useStories.ts (React Query hook)
export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: storyApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useStory(id: string) {
  return useQuery({
    queryKey: ['story', id],
    queryFn: () => storyApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storyApi.create,
    onSuccess: (newStory) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      // Or optimistically update
      queryClient.setQueryData(['story', newStory.id], newStory);
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: storyApi.delete,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.removeQueries({ queryKey: ['story', deletedId] });
    },
  });
}

// Usage in components:
function StoryList() {
  const { data: stories, isLoading, error } = useStories();
  const deleteMutation = useDeleteStory();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <div>
      {stories.map(story => (
        <StoryCard 
          key={story.id} 
          story={story}
          onDelete={() => deleteMutation.mutate(story.id)}
        />
      ))}
    </div>
  );
}
```

---

## Phase 5: Testing & Documentation (Week 5)

### 5.1 Unit Tests for Hooks

```typescript
// src/features/stories/hooks/__tests__/useStories.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStories } from '../useStories';
import { storyApi } from '../../services/storyApi';

jest.mock('../../services/storyApi');

describe('useStories', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it('should fetch stories successfully', async () => {
    const mockStories = [
      { id: '1', title: 'Story 1' },
      { id: '2', title: 'Story 2' },
    ];

    (storyApi.getAll as jest.Mock).mockResolvedValue(mockStories);

    const { result } = renderHook(() => useStories(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStories);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to fetch');
    (storyApi.getAll as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useStories(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(mockError);
  });
});
```

### 5.2 Integration Tests

```typescript
// src/features/stories/__tests__/StoryLibrary.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoryLibraryContainer } from '../containers/StoryLibraryContainer';
import { TestProviders } from '@/test/utils';

describe('StoryLibrary Integration', () => {
  it('should display stories and allow interaction', async () => {
    render(
      <TestProviders>
        <StoryLibraryContainer 
          onSelectStory={jest.fn()} 
          onViewProfile={jest.fn()} 
        />
      </TestProviders>
    );

    // Wait for stories to load
    await waitFor(() => {
      expect(screen.getByText('Story 1')).toBeInTheDocument();
    });

    // Click like button
    const likeButton = screen.getByLabelText('Like story');
    await userEvent.click(likeButton);

    // Verify like count increased
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });
});
```

---

## Summary of Changes

### Files Deleted (Duplicates)
- ❌ `src/lib/authContext.tsx` (use Zustand instead)
- ❌ `src/config.ts` (merged into config/index.ts)
- ❌ Duplicate functions in `storyService.ts` (moved to feature modules)

### Files Created (New Structure)
- ✅ `src/features/auth/stores/authStore.ts`
- ✅ `src/features/social/services/followApi.ts`
- ✅ `src/features/reactions/services/reactionApi.ts`
- ✅ `src/shared/components/LoadingState/`
- ✅ `src/shared/components/ErrorState/`
- ✅ Feature-based folder structure

### Lines of Code
- **Before:** ~8,500 lines
- **After:** ~6,800 lines
- **Reduction:** 20% (1,700 lines removed)

### Component Sizes
- **Before:** 5 components > 400 lines
- **After:** All components < 150 lines

### Test Coverage
- **Before:** ~30%
- **After Target:** > 80%

---

## Migration Checklist

### Week 1: Foundation
- [ ] Merge config files
- [ ] Remove authContext, use Zustand
- [ ] Extract follow functions
- [ ] Extract reaction functions
- [ ] Create shared components

### Week 2: Features
- [ ] Create feature folders
- [ ] Move auth feature
- [ ] Move stories feature
- [ ] Move social feature
- [ ] Move subscription feature

### Week 3: Components
- [ ] Refactor StoryLibrary
- [ ] Refactor StoryReader
- [ ] Refactor Profile
- [ ] Refactor StoryCreator

### Week 4: Hooks
- [ ] Create useStories hook
- [ ] Create useStoryReader hook
- [ ] Create useStoryCreation hook
- [ ] Standardize React Query usage

### Week 5: Quality
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Performance audit

---

**Next:** Start with Phase 1, Task 1.1 (Merge Config Files)
