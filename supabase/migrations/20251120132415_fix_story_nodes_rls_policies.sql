/*
  # Fix Story Nodes RLS Policies

  1. Changes
    - Add INSERT policy for story_nodes to allow users to create nodes for their own stories
    - Add proper policies for story_choices to allow users to create choices for their own stories

  2. Security
    - Users can only create nodes for stories they own
    - Users can only create choices for stories they own
*/

-- Drop existing policies for story_nodes
DROP POLICY IF EXISTS "Story nodes can be updated" ON story_nodes;

-- Create comprehensive RLS policies for story_nodes
CREATE POLICY "Users can insert nodes for their stories"
  ON story_nodes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_nodes.story_id
      AND stories.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update nodes for their stories"
  ON story_nodes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_nodes.story_id
      AND stories.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_nodes.story_id
      AND stories.created_by = auth.uid()
    )
  );

-- Add policies for story_choices
DROP POLICY IF EXISTS "Story choices are publicly readable" ON story_choices;

CREATE POLICY "Users can view choices"
  ON story_choices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert choices for their stories"
  ON story_choices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes
      JOIN stories ON stories.id = story_nodes.story_id
      WHERE story_nodes.id = story_choices.from_node_id
      AND stories.created_by = auth.uid()
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
      AND stories.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM story_nodes
      JOIN stories ON stories.id = story_nodes.story_id
      WHERE story_nodes.id = story_choices.from_node_id
      AND stories.created_by = auth.uid()
    )
  );
