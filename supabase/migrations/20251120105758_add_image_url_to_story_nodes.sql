/*
  # Add image URL support to story nodes

  1. Changes
    - Add `image_url` column to `story_nodes` table to store AI-generated chapter images
    - Add `image_prompt` column to store the prompt used for generation (for reference/regeneration)

  2. Notes
    - Images will be generated on-demand when chapters are loaded
    - URLs are temporary from OpenAI (valid for 1 hour), so they're generated fresh each time
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'image_prompt'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN image_prompt text;
  END IF;
END $$;
