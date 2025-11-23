/*
  # Add Service Role Support for Story Generation

  ## Changes Made

  1. **Add Service Role Policies**
     - Add policies to allow service role operations on story_nodes
     - Add policies to allow service role operations on story_choices
     - These policies check if auth.uid() is NULL (service role context)
     
  2. **Purpose**
     - Allows edge functions using service role key to create/update nodes
     - Maintains security for regular authenticated users
*/

-- ============================================================================
-- SERVICE ROLE POLICIES FOR STORY_NODES
-- ============================================================================

-- Allow service role to insert nodes (when auth.uid() is NULL)
CREATE POLICY "Service role can insert nodes"
  ON story_nodes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NULL);

-- Allow service role to update nodes (when auth.uid() is NULL)
CREATE POLICY "Service role can update nodes"
  ON story_nodes FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NULL)
  WITH CHECK ((select auth.uid()) IS NULL);

-- ============================================================================
-- SERVICE ROLE POLICIES FOR STORY_CHOICES
-- ============================================================================

-- Allow service role to insert choices (when auth.uid() is NULL)
CREATE POLICY "Service role can insert choices"
  ON story_choices FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NULL);

-- Allow service role to update choices (when auth.uid() is NULL)
CREATE POLICY "Service role can update choices"
  ON story_choices FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NULL)
  WITH CHECK ((select auth.uid()) IS NULL);

-- ============================================================================
-- SERVICE ROLE POLICIES FOR STORIES
-- ============================================================================

-- Allow service role to update stories (when auth.uid() is NULL)
CREATE POLICY "Service role can update stories"
  ON stories FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) IS NULL)
  WITH CHECK ((select auth.uid()) IS NULL);