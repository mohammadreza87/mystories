/*
  # Fix Security Issues

  1. RLS Policy Optimization
    - Fix user_follows policies to use (select auth.uid()) for better performance
    
  2. Drop Unused Indexes
    - Remove indexes that are not being used to reduce overhead
    - Indexes: generation_queue user_id, stories created_by, story_choices to_node_id,
      story_nodes parent_choice_id, story_reactions story_id, user_story_progress current_node_id,
      user_story_progress story_id
    
  3. Consolidate Multiple Permissive Policies
    - Combine duplicate policies for stories, story_choices, and story_nodes
    - Replace multiple permissive policies with single comprehensive policies
    
  4. Fix Function Search Path
    - Set explicit search_path for generate_random_username and handle_new_user_profile
    - Prevents search_path hijacking security issues
*/

-- ==========================================
-- 1. FIX RLS POLICIES FOR PERFORMANCE
-- ==========================================

-- Drop and recreate user_follows policies with optimized auth function calls
DROP POLICY IF EXISTS "Users can follow others" ON user_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON user_follows;

CREATE POLICY "Users can follow others"
  ON user_follows
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = follower_id AND follower_id != following_id);

CREATE POLICY "Users can unfollow"
  ON user_follows
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = follower_id);

-- ==========================================
-- 2. DROP UNUSED INDEXES
-- ==========================================

DROP INDEX IF EXISTS idx_generation_queue_user_id;
DROP INDEX IF EXISTS idx_stories_created_by;
DROP INDEX IF EXISTS idx_story_choices_to_node_id;
DROP INDEX IF EXISTS idx_story_nodes_parent_choice_id;
DROP INDEX IF EXISTS idx_story_reactions_story_id;
DROP INDEX IF EXISTS idx_user_story_progress_current_node_id;
DROP INDEX IF EXISTS idx_user_story_progress_story_id;

-- ==========================================
-- 3. CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- ==========================================

-- Stories table - consolidate UPDATE policies
DROP POLICY IF EXISTS "Service role can update stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;

CREATE POLICY "Authenticated users can update stories"
  ON stories
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Story choices - consolidate INSERT policies
-- Note: story_choices links nodes via from_node_id/to_node_id
-- We need to check the story ownership via story_nodes
DROP POLICY IF EXISTS "Service role can insert choices" ON story_choices;
DROP POLICY IF EXISTS "Users can insert choices for their stories" ON story_choices;

CREATE POLICY "Authenticated users can insert choices"
  ON story_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Story choices - consolidate UPDATE policies
DROP POLICY IF EXISTS "Service role can update choices" ON story_choices;
DROP POLICY IF EXISTS "Users can update choices for their stories" ON story_choices;

CREATE POLICY "Authenticated users can update choices"
  ON story_choices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Story nodes - consolidate INSERT policies
DROP POLICY IF EXISTS "Service role can insert nodes" ON story_nodes;
DROP POLICY IF EXISTS "Users can insert nodes for their stories" ON story_nodes;

CREATE POLICY "Authenticated users can insert nodes"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- Story nodes - consolidate UPDATE policies
DROP POLICY IF EXISTS "Service role can update nodes" ON story_nodes;
DROP POLICY IF EXISTS "Users can update nodes for their stories" ON story_nodes;

CREATE POLICY "Authenticated users can update nodes"
  ON story_nodes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    ) OR 
    (SELECT auth.jwt()->>'role') = 'service_role'
  );

-- ==========================================
-- 4. FIX FUNCTION SEARCH PATH MUTABILITY
-- ==========================================

-- Recreate generate_random_username with explicit search_path
CREATE OR REPLACE FUNCTION generate_random_username()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_str text;
  new_username text;
  username_exists boolean;
BEGIN
  LOOP
    random_str := substr(md5(random()::text), 1, 8);
    new_username := 'user_' || random_str;
    
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE username = new_username) INTO username_exists;
    
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
  END LOOP;
END;
$$;

-- Recreate handle_new_user_profile with explicit search_path
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    generate_random_username(),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;