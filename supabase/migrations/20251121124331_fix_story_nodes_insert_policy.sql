/*
  # Fix story_nodes INSERT policy to allow readers to generate content
  
  1. Changes
    - Drop existing restrictive INSERT policies
    - Add new policy allowing authenticated users to insert nodes for ANY story they can read
    - This enables dynamic story generation during gameplay
  
  2. Security
    - Still requires authentication
    - Only allows INSERT, not destructive operations
    - Story nodes are still readable by everyone
    - Updates still restricted to creators and service role
*/

-- Drop existing INSERT policies that are too restrictive
DROP POLICY IF EXISTS "Authenticated users can insert nodes" ON story_nodes;
DROP POLICY IF EXISTS "Service role can insert nodes" ON story_nodes;

-- Create new policy: authenticated users can insert nodes for any public story or their own stories
CREATE POLICY "Authenticated users can insert story nodes"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Service role can insert anything
    (auth.jwt() ->> 'role')::text = 'service_role'
    OR
    -- User is the story creator
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = story_nodes.story_id 
      AND stories.created_by = auth.uid()
    )
    OR
    -- Story is public (anyone reading can generate content)
    EXISTS (
      SELECT 1 FROM stories 
      WHERE stories.id = story_nodes.story_id 
      AND stories.is_public = true
    )
  );
