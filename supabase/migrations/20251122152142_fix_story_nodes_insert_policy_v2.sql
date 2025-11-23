/*
  # Fix story_nodes INSERT policy to check ownership

  1. Changes
    - Drop the existing weak INSERT policy for story_nodes
    - Create a new INSERT policy that verifies the user owns the story via created_by
  
  2. Security
    - Users can only insert nodes for stories they created
    - Prevents unauthorized node creation
*/

-- Drop the existing weak policy
DROP POLICY IF EXISTS "Authenticated users can insert story nodes" ON story_nodes;

-- Create a new policy that checks story ownership
CREATE POLICY "Users can insert nodes for their own stories"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_nodes.story_id
      AND stories.created_by = auth.uid()
    )
  );
