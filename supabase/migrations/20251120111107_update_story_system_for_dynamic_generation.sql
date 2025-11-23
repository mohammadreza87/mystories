/*
  # Update story system for dynamic generation

  1. Changes
    - Add `story_context` column to `stories` table for initial story theme/prompt
    - Add `parent_choice_id` column to `story_nodes` to track which choice led to this node
    - Update `story_nodes` to support dynamic generation flags
    - Add index for faster node lookups

  2. Notes
    - Stories now start with a context/theme and generate dynamically
    - Each node tracks which choice created it for story continuity
    - The first node (start) is generated when story is first played
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'story_context'
  ) THEN
    ALTER TABLE stories ADD COLUMN story_context text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'parent_choice_id'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN parent_choice_id uuid REFERENCES story_choices(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_story_nodes_story_id_node_key ON story_nodes(story_id, node_key);
CREATE INDEX IF NOT EXISTS idx_story_choices_from_node ON story_choices(from_node_id);
