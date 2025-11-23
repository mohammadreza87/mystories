/*
  # Fix Database Security and Performance Issues

  ## Changes Made

  1. **Add Missing Indexes for Foreign Keys**
     - Add index on `generation_queue.user_id`
     - Add index on `stories.created_by`
     - Add index on `story_choices.to_node_id`
     - Add index on `story_nodes.parent_choice_id`
     - Add index on `story_reactions.story_id`
     - Add index on `user_story_progress.current_node_id`
     - Add index on `user_story_progress.story_id`

  2. **Optimize RLS Policies**
     - Replace `auth.uid()` with `(select auth.uid())` in all policies
     - This prevents re-evaluation of auth functions for each row
     - Significantly improves query performance at scale

  3. **Remove Duplicate Policies**
     - Remove conflicting permissive policies on stories table
     - Keep only the most specific policies

  4. **Remove Unused Indexes**
     - Drop indexes that are not being used

  5. **Fix Function Search Paths**
     - Set explicit search_path for all functions to prevent security issues
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_generation_queue_user_id 
  ON generation_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_stories_created_by 
  ON stories(created_by);

CREATE INDEX IF NOT EXISTS idx_story_choices_to_node_id 
  ON story_choices(to_node_id);

CREATE INDEX IF NOT EXISTS idx_story_nodes_parent_choice_id 
  ON story_nodes(parent_choice_id);

CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id 
  ON story_reactions(story_id);

CREATE INDEX IF NOT EXISTS idx_user_story_progress_current_node_id 
  ON user_story_progress(current_node_id);

CREATE INDEX IF NOT EXISTS idx_user_story_progress_story_id 
  ON user_story_progress(story_id);

-- ============================================================================
-- 2. REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_story_nodes_story_id_node_key;
DROP INDEX IF EXISTS idx_generation_queue_status_priority;
DROP INDEX IF EXISTS idx_stories_generation_status;

-- ============================================================================
-- 3. OPTIMIZE RLS POLICIES - USER PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view public profiles or their own" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can view public profiles or their own"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_profile_public = true OR (select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- 4. OPTIMIZE RLS POLICIES - GENERATION QUEUE
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own generation queue" ON generation_queue;
DROP POLICY IF EXISTS "Users can insert own generation queue" ON generation_queue;
DROP POLICY IF EXISTS "Users can update own generation queue" ON generation_queue;

CREATE POLICY "Users can view own generation queue"
  ON generation_queue FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own generation queue"
  ON generation_queue FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own generation queue"
  ON generation_queue FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================================
-- 5. OPTIMIZE RLS POLICIES - STORY REACTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can create their own reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON story_reactions;

CREATE POLICY "Users can create their own reactions"
  ON story_reactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own reactions"
  ON story_reactions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON story_reactions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 6. OPTIMIZE RLS POLICIES - STORIES (REMOVE DUPLICATES)
-- ============================================================================

DROP POLICY IF EXISTS "Stories are publicly readable" ON stories;
DROP POLICY IF EXISTS "Users can view public stories" ON stories;
DROP POLICY IF EXISTS "Stories can be updated" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;

-- Keep only the most specific policies
CREATE POLICY "Users can view public stories"
  ON stories FOR SELECT
  TO authenticated
  USING (is_public = true OR (select auth.uid()) = created_by);

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = created_by);

-- ============================================================================
-- 7. OPTIMIZE RLS POLICIES - STORY NODES
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert nodes for their stories" ON story_nodes;
DROP POLICY IF EXISTS "Users can update nodes for their stories" ON story_nodes;

CREATE POLICY "Users can insert nodes for their stories"
  ON story_nodes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can update nodes for their stories"
  ON story_nodes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (select auth.uid())
    )
  );

-- ============================================================================
-- 8. OPTIMIZE RLS POLICIES - STORY CHOICES
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert choices for their stories" ON story_choices;
DROP POLICY IF EXISTS "Users can update choices for their stories" ON story_choices;

CREATE POLICY "Users can insert choices for their stories"
  ON story_choices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes 
      JOIN stories ON stories.id = story_nodes.story_id 
      WHERE story_nodes.id = story_choices.from_node_id 
      AND stories.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Users can update choices for their stories"
  ON story_choices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_nodes 
      JOIN stories ON stories.id = story_nodes.story_id 
      WHERE story_nodes.id = story_choices.from_node_id 
      AND stories.created_by = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes 
      JOIN stories ON stories.id = story_nodes.story_id 
      WHERE story_nodes.id = story_choices.from_node_id 
      AND stories.created_by = (select auth.uid())
    )
  );

-- ============================================================================
-- 9. FIX FUNCTION SEARCH PATHS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_story_reaction_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories
    SET 
      likes_count = COALESCE(likes_count, 0) + CASE WHEN NEW.reaction_type = 'like' THEN 1 ELSE 0 END,
      dislikes_count = COALESCE(dislikes_count, 0) + CASE WHEN NEW.reaction_type = 'dislike' THEN 1 ELSE 0 END
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE stories
    SET 
      likes_count = COALESCE(likes_count, 0) - CASE WHEN OLD.reaction_type = 'like' THEN 1 ELSE 0 END + CASE WHEN NEW.reaction_type = 'like' THEN 1 ELSE 0 END,
      dislikes_count = COALESCE(dislikes_count, 0) - CASE WHEN OLD.reaction_type = 'dislike' THEN 1 ELSE 0 END + CASE WHEN NEW.reaction_type = 'dislike' THEN 1 ELSE 0 END
    WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories
    SET 
      likes_count = GREATEST(0, COALESCE(likes_count, 0) - CASE WHEN OLD.reaction_type = 'like' THEN 1 ELSE 0 END),
      dislikes_count = GREATEST(0, COALESCE(dislikes_count, 0) - CASE WHEN OLD.reaction_type = 'dislike' THEN 1 ELSE 0 END)
    WHERE id = OLD.story_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, is_profile_public)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;