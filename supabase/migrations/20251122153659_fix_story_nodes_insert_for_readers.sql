/*
  # Fix Story Nodes Insert Policy for Dynamic Generation
  
  1. Changes
    - Drop the restrictive insert policy for story_nodes that only allows story owners
    - Create a new policy that allows any authenticated user to insert nodes
    - This enables dynamic story generation to work for all readers, not just creators
  
  2. Security
    - Still requires authentication
    - Readers can contribute to the story by generating new branches
    - The story's initial structure is still controlled by the creator
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can insert nodes for their own stories" ON story_nodes;

-- Create a new policy that allows any authenticated user to insert nodes
CREATE POLICY "Authenticated users can insert nodes"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
