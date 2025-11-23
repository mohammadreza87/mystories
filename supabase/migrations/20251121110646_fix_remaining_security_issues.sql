/*
  # Fix Remaining Security Issues

  1. Add Indexes for Foreign Keys
    - Add covering indexes for all foreign keys that are missing them
    - Improves query performance for joins and foreign key lookups
    - Tables: generation_queue, stories, story_choices, story_nodes, story_reactions, user_story_progress
    
  2. Optimize RLS Policies
    - Fix all RLS policies to use (select auth.uid()) and (select auth.jwt())
    - Prevents re-evaluation for each row, improving performance at scale
    - Tables: stories, story_choices, story_nodes

  Note: Leaked Password Protection must be enabled through Supabase Dashboard:
  Settings > Authentication > Security > Password Protection
*/

-- ==========================================
-- 1. ADD INDEXES FOR FOREIGN KEYS
-- ==========================================

-- Generation queue - user_id foreign key
CREATE INDEX IF NOT EXISTS idx_generation_queue_user_id 
ON generation_queue(user_id);

-- Stories - created_by foreign key
CREATE INDEX IF NOT EXISTS idx_stories_created_by 
ON stories(created_by);

-- Story choices - to_node_id foreign key
CREATE INDEX IF NOT EXISTS idx_story_choices_to_node_id 
ON story_choices(to_node_id);

-- Story nodes - parent_choice_id foreign key
CREATE INDEX IF NOT EXISTS idx_story_nodes_parent_choice_id 
ON story_nodes(parent_choice_id);

-- Story reactions - story_id foreign key
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id 
ON story_reactions(story_id);

-- User story progress - current_node_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_story_progress_current_node_id 
ON user_story_progress(current_node_id);

-- User story progress - story_id foreign key
CREATE INDEX IF NOT EXISTS idx_user_story_progress_story_id 
ON user_story_progress(story_id);

-- ==========================================
-- 2. OPTIMIZE RLS POLICIES
-- ==========================================

-- Stories - Optimize UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update stories" ON stories;

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

-- Story choices - Optimize INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert choices" ON story_choices;

CREATE POLICY "Authenticated users can insert choices"
  ON story_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    )
  );

-- Story choices - Optimize UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update choices" ON story_choices;

CREATE POLICY "Authenticated users can update choices"
  ON story_choices
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM story_nodes sn
      INNER JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id 
      AND s.created_by = (SELECT auth.uid())
    )
  );

-- Story nodes - Optimize INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert nodes" ON story_nodes;

CREATE POLICY "Authenticated users can insert nodes"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    )
  );

-- Story nodes - Optimize UPDATE policy
DROP POLICY IF EXISTS "Authenticated users can update nodes" ON story_nodes;

CREATE POLICY "Authenticated users can update nodes"
  ON story_nodes
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'service_role' OR
    EXISTS (
      SELECT 1 FROM stories 
      WHERE id = story_nodes.story_id 
      AND created_by = (SELECT auth.uid())
    )
  );