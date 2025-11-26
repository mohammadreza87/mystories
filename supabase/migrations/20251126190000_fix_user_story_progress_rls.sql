/*
  # Fix User Story Progress RLS Policy Gaps

  ## Issue
  The user_story_progress table has overly permissive RLS policies that allow
  any authenticated user to read, insert, and update any other user's progress.
  This is a security vulnerability.

  ## Changes
  1. Drop existing overly permissive policies
  2. Create proper policies that enforce user_id = auth.uid() checks
  3. Use the optimized (select auth.uid()) pattern for performance
*/

-- ============================================================================
-- DROP EXISTING OVERLY PERMISSIVE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own progress" ON user_story_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON user_story_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON user_story_progress;

-- ============================================================================
-- CREATE PROPERLY SECURED POLICIES
-- ============================================================================

-- Users can only view their own progress
CREATE POLICY "Users can view their own progress"
  ON user_story_progress FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Users can only insert progress for themselves
CREATE POLICY "Users can insert their own progress"
  ON user_story_progress FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can only update their own progress
CREATE POLICY "Users can update their own progress"
  ON user_story_progress FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Users can only delete their own progress
CREATE POLICY "Users can delete their own progress"
  ON user_story_progress FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- SERVICE ROLE ACCESS (for edge functions)
-- ============================================================================

-- Service role can manage all progress records
CREATE POLICY "Service role full access to user_story_progress"
  ON user_story_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
