# Next Tale - Implementation Checklist

## Updates (current state)
- Config now lives in `src/config/index.ts` with `src/config.ts` re-exporting it; skip the previous split/merge instructions and use that source moving forward.
- Zustand stores for auth/subscription/UI were removed as dead code; `AuthProvider` (context) remains the active auth mechanism.
- Follow logic is centralized in `src/lib/followService.ts` and used via hooks; duplicate functions were removed from `storyService`.
- Sharing now uses the shared `useShare` hook in StoryLibrary/Profile to avoid ad-hoc navigator/clipboard code.
- Next focus: feature-folder extraction (stories/reactions/social/auth), React Query-based services per entity, and reusable UI states (loading/error).

## Quick Start Guide

This checklist provides a step-by-step guide to implement the architectural refactoring.

---

## Phase 1: Foundation Fixes (Days 1-5)

### Day 1: Config Consolidation

**Task 1.1: Merge config files**
- [ ] Create `src/app/config/index.ts`
- [ ] Copy content from both `src/config.ts` and `src/config/index.ts`
- [ ] Update all imports from `../config` to `@/app/config`
- [ ] Delete old config files
- [ ] Test: `npm run build` should succeed

**Files to update:**
```
src/lib/supabase.ts
src/lib/stripe.ts
src/components/StoryCreator.tsx
src/components/ComicCreator.tsx
src/components/Subscription.tsx
```

**Search & Replace:**
```bash
# Find all imports
grep -r "from.*config" src/

# Replace
find src/ -type f -name "*.ts*" -exec sed -i '' 's|from.*config.*|from "@/app/config"|g' {} +
```

---

### Day 2: Auth State Consolidation

**Task 1.2: Remove React Context, use Zustand only**

**Step 1:** Update authStore
- [ ] Move `src/stores/authStore.ts` to `src/features/auth/stores/authStore.ts`
- [ ] Export as `useAuth` instead of `useAuthStore`
- [ ] Add profile fetching logic from authContext

**Step 2:** Update all components
- [ ] Find all `useAuth()` from authContext: `grep -r "from.*authContext" src/`
- [ ] Replace with `useAuth()` from authStore
- [ ] Update imports

**Step 3:** Delete old files
- [ ] Delete `src/lib/authContext.tsx`
- [ ] Delete `src/stores/index.ts` (if only exports authStore)

**Step 4:** Update App.tsx
- [ ] Remove `<AuthProvider>` wrapper
- [ ] Call `useAuth().initialize()` in App component

**Test:**
```bash
npm run dev
# Login/logout should work
# User state should persist on refresh
```

---

### Day 3: Extract Follow Functions

**Task 1.3: Consolidate follow logic**

**Step 1:** Create new structure
```bash
mkdir -p src/features/social/{services,hooks,components}
```

**Step 2:** Create followApi.ts
- [ ] Create `src/features/social/services/followApi.ts`
- [ ] Copy follow functions from `storyService.ts`
- [ ] Export as object: `export const followApi = { follow, unfollow, ... }`

**Step 3:** Create useFollow hook
- [ ] Create `src/features/social/hooks/useFollow.ts`
- [ ] Use React Query for data fetching
- [ ] Export `useFollow(targetUserId)` hook

**Step 4:** Update components
- [ ] Find all follow function calls: `grep -r "followUser\|unfollowUser" src/components/`
- [ ] Replace with `useFollow` hook
- [ ] Test follow/unfollow in UI

**Step 5:** Delete duplicates
- [ ] Remove follow functions from `src/lib/storyService.ts`
- [ ] Remove `src/lib/followService.ts`

---

### Day 4: Extract Reaction Functions

**Task 1.4: Consolidate reaction logic**

**Step 1:** Create structure
```bash
mkdir -p src/features/reactions/{services,hooks,components}
```

**Step 2:** Create reactionApi.ts
- [ ] Create `src/features/reactions/services/reactionApi.ts`
- [ ] Move reaction functions from storyService
- [ ] Export as object

**Step 3:** Create useReactions hook
- [ ] Create `src/features/reactions/hooks/useReactions.ts`
- [ ] Use React Query with optimistic updates
- [ ] Export `useReactions(storyId)` hook

**Step 4:** Create ReactionButtons component
- [ ] Create `src/features/reactions/components/ReactionButtons.tsx`
- [ ] Extract button UI from StoryLibrary/StoryReader
- [ ] Make reusable

**Step 5:** Update components
- [ ] Replace inline reaction logic with `useReactions` hook
- [ ] Use `<ReactionButtons />` component
- [ ] Delete old code

---

### Day 5: Shared Components

**Task 1.5: Create reusable UI components**

**Step 1:** Create LoadingState
```bash
mkdir -p src/shared/components/LoadingState
```
- [ ] Create `LoadingState.tsx`
- [ ] Add props: size, fullScreen, message
- [ ] Export component

**Step 2:** Create ErrorState
```bash
mkdir -p src/shared/components/ErrorState
```
- [ ] Create `ErrorState.tsx`
- [ ] Add props: error, retry, fullScreen
- [ ] Export component

**Step 3:** Replace all loading spinners
```bash
# Find all loading spinners
grep -r "animate-spin" src/components/

# Replace with <LoadingState />
```

**Step 4:** Create barrel exports
- [ ] Create `src/shared/components/index.ts`
- [ ] Export all shared components

---

## Phase 2: Feature Extraction (Days 6-10)

### Day 6: Create Feature Structure

**Task 2.1: Set up feature folders**

```bash
# Create all feature folders
mkdir -p src/features/{auth,stories,reactions,social,subscription,profile}/{components,hooks,services,stores}

# Create barrel exports
touch src/features/{auth,stories,reactions,social,subscription,profile}/index.ts
```

---

### Day 7: Move Auth Feature

**Task 2.2: Migrate auth to features**

**Files to move:**
```
src/components/Auth.tsx → src/features/auth/components/Auth.tsx
src/components/auth/LoginForm.tsx → src/features/auth/components/LoginForm.tsx
src/components/auth/SignupForm.tsx → src/features/auth/components/SignupForm.tsx
src/components/ResetPassword.tsx → src/features/auth/components/ResetPassword.tsx
src/stores/authStore.ts → src/features/auth/stores/authStore.ts (already done)
```

**Steps:**
- [ ] Move files
- [ ] Update imports in moved files
- [ ] Create `src/features/auth/index.ts` barrel export
- [ ] Update imports in other files
- [ ] Test auth flow

---

### Day 8-9: Move Stories Feature

**Task 2.3: Migrate stories to features**

**Files to move:**
```
src/components/StoryLibrary.tsx → src/features/stories/containers/StoryLibraryContainer.tsx
src/components/StoryCreator.tsx → src/features/stories/containers/StoryCreatorContainer.tsx
src/components/StoryReader.tsx → src/features/stories/containers/StoryReaderContainer.tsx
src/components/StoryDetail.tsx → src/features/stories/containers/StoryDetailContainer.tsx
src/components/story/* → src/features/stories/components/
src/lib/storyService.ts → src/features/stories/services/storyApi.ts
src/lib/storyStreamService.ts → src/features/stories/services/storyStreamApi.ts
```

**Steps:**
- [ ] Move files (keep old ones for now)
- [ ] Update imports
- [ ] Create barrel export
- [ ] Test all story features
- [ ] Delete old files once confirmed working

---

### Day 10: Move Remaining Features

**Task 2.4: Migrate subscription and profile**

**Subscription:**
```
src/components/Subscription.tsx → src/features/subscription/containers/
src/components/subscription/* → src/features/subscription/components/
src/lib/subscriptionService.ts → src/features/subscription/services/subscriptionApi.ts
src/stores/subscriptionStore.ts → src/features/subscription/stores/
```

**Profile:**
```
src/components/Profile.tsx → src/features/profile/containers/
src/components/ProfileEdit.tsx → src/features/profile/components/
src/components/PublicProfile.tsx → src/features/profile/containers/
```

---

## Phase 3: Component Refactoring (Days 11-15)

### Day 11-12: Refactor StoryLibrary

**Task 3.1: Break down StoryLibrary (450 lines → 3 components)**

**Step 1:** Create hooks
- [ ] Create `src/features/stories/hooks/useStories.ts`
- [ ] Move data fetching logic from component

**Step 2:** Create presentational components
- [ ] Create `StoryCard.tsx` (80 lines)
- [ ] Create `StoryList.tsx` (40 lines)
- [ ] Create `LibraryHeader.tsx` (30 lines)

**Step 3:** Create container
- [ ] Create `StoryLibraryContainer.tsx` (60 lines)
- [ ] Use hooks for data
- [ ] Compose presentational components

**Step 4:** Test
- [ ] All stories display correctly
- [ ] Reactions work
- [ ] Follow buttons work
- [ ] Share works

---

### Day 13-14: Refactor StoryReader

**Task 3.2: Break down StoryReader (800 lines → 5 components)**

**Step 1:** Create hooks
- [ ] Create `useStoryReader.ts` (150 lines)
- [ ] Create `useAudioPlayer.ts` (60 lines)

**Step 2:** Create components
- [ ] Create `ChapterContent.tsx` (80 lines)
- [ ] Create `AudioPlayer.tsx` (60 lines)
- [ ] Create `ReaderHeader.tsx` (50 lines)
- [ ] Create `StoryProgress.tsx` (40 lines)

**Step 3:** Create container
- [ ] Create `StoryReaderContainer.tsx` (100 lines)
- [ ] Compose all components

---

### Day 15: Refactor Profile

**Task 3.3: Break down Profile (500 lines → 4 components)**

**Step 1:** Create hooks
- [ ] Create `useProfile.ts`

**Step 2:** Create components
- [ ] Create `ProfileHeader.tsx` (80 lines)
- [ ] Create `SubscriptionCard.tsx` (60 lines)
- [ ] Create `StoryTabs.tsx` (100 lines)

**Step 3:** Create container
- [ ] Create `ProfileContainer.tsx` (80 lines)

---

## Phase 4: Hooks & Services (Days 16-20)

### Day 16-17: Standardize Data Fetching

**Task 4.1: Convert all data fetching to React Query**

**Step 1:** Audit current data fetching
```bash
# Find all useState + useEffect patterns
grep -A 5 "useState.*\[\]" src/features/
```

**Step 2:** Create API services
- [ ] Ensure all features have `services/*Api.ts` files
- [ ] All API calls in service layer (not components)

**Step 3:** Create React Query hooks
- [ ] Create `use*` hooks for each feature
- [ ] Use `useQuery` for reads
- [ ] Use `useMutation` for writes

**Step 4:** Update components
- [ ] Replace useState/useEffect with hooks
- [ ] Remove manual loading/error states
- [ ] Use React Query's built-in states

---

### Day 18-19: Extract Business Logic

**Task 4.2: Move logic from components to hooks**

**Pattern:**
```typescript
// BEFORE: Logic in component
function Component() {
  const [data, setData] = useState();
  const [loading, setLoading] = useState(false);
  
  const handleAction = async () => {
    setLoading(true);
    // 50 lines of logic
    setLoading(false);
  };
  
  return <UI onClick={handleAction} />;
}

// AFTER: Logic in hook
function useFeature() {
  const mutation = useMutation({
    mutationFn: async () => {
      // 50 lines of logic
    },
  });
  
  return { action: mutation.mutate, loading: mutation.isPending };
}

function Component() {
  const { action, loading } = useFeature();
  return <UI onClick={action} />;
}
```

**Components to refactor:**
- [ ] StoryCreator
- [ ] ComicCreator
- [ ] Subscription
- [ ] Quests

---

### Day 20: Optimize Performance

**Task 4.3: Add memoization where needed**

**Step 1:** Identify expensive renders
```bash
# Add React DevTools Profiler
# Record interactions
# Find components that re-render unnecessarily
```

**Step 2:** Add memoization
- [ ] Wrap expensive components in `React.memo()`
- [ ] Use `useMemo` for expensive calculations
- [ ] Use `useCallback` for functions passed as props

**Step 3:** Optimize React Query
- [ ] Set appropriate `staleTime` for each query
- [ ] Use `select` to transform data
- [ ] Enable `keepPreviousData` for pagination

---

## Phase 5: Testing & Documentation (Days 21-25)

### Day 21-22: Unit Tests

**Task 5.1: Write tests for hooks**

**Test each hook:**
- [ ] `useAuth` - login, logout, session persistence
- [ ] `useStories` - fetch, create, delete
- [ ] `useFollow` - follow, unfollow, optimistic updates
- [ ] `useReactions` - like, dislike, toggle
- [ ] `useProfile` - fetch, update

**Coverage target:** > 80%

---

### Day 23: Integration Tests

**Task 5.2: Write integration tests**

**Test user flows:**
- [ ] Auth flow (signup → login → logout)
- [ ] Story creation flow
- [ ] Story reading flow
- [ ] Profile management flow
- [ ] Subscription upgrade flow

---

### Day 24: Documentation

**Task 5.3: Update documentation**

**Documents to create/update:**
- [ ] Update README.md with new structure
- [ ] Create ARCHITECTURE.md
- [ ] Create CONTRIBUTING.md
- [ ] Add JSDoc comments to all public APIs
- [ ] Create Storybook stories for components

---

### Day 25: Final Review

**Task 5.4: Code review and cleanup**

**Checklist:**
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Bundle size < 500KB
- [ ] Build time < 10 seconds
- [ ] All features working in production build
- [ ] Performance metrics acceptable

---

## Post-Refactor Maintenance

### Ongoing Tasks

**Code Quality:**
- [ ] Set up pre-commit hooks (Husky)
- [ ] Add commit message linting
- [ ] Set up CI/CD for tests
- [ ] Add bundle size monitoring

**Documentation:**
- [ ] Keep architecture docs updated
- [ ] Document new patterns
- [ ] Create ADRs for major decisions

**Team:**
- [ ] Conduct code review training
- [ ] Share refactoring learnings
- [ ] Update team guidelines

---

## Rollback Plan

If issues arise during refactoring:

1. **Keep old code** until new code is proven
2. **Feature flags** for gradual rollout
3. **Git branches** for each phase
4. **Backup database** before major changes
5. **Monitor errors** in production

**Rollback steps:**
```bash
# Revert to previous version
git revert <commit-hash>

# Or reset to before refactor
git reset --hard <commit-before-refactor>

# Deploy previous version
npm run build
npm run deploy
```

---

## Success Metrics

Track these metrics before and after:

**Code Quality:**
- Lines of code: 8,500 → 6,800 (20% reduction)
- Average component size: 350 lines → 100 lines
- Test coverage: 30% → 80%
- TypeScript strict mode: No → Yes

**Performance:**
- Build time: 15s → 10s
- Bundle size: 650KB → 500KB
- First contentful paint: 2.5s → 1.8s
- Time to interactive: 4.2s → 3.0s

**Developer Experience:**
- Time to find code: 5 min → 1 min
- Time to add feature: 2 days → 1 day
- Onboarding time: 2 weeks → 1 week

---

## Questions & Support

**Stuck on a task?**
1. Check the detailed examples in `REFACTORING_PLAN.md`
2. Review the architecture in `ARCHITECTURE_REVIEW.md`
3. Ask team for help
4. Document the issue for future reference

**Found a better approach?**
1. Document the alternative
2. Discuss with team
3. Update this checklist
4. Share learnings

---

**Good luck with the refactoring! 🚀**
