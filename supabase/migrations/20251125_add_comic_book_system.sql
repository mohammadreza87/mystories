/*
  # Comic Book Story System

  1. New Tables
    - `story_bibles` - Stores character, setting, and style consistency data

  2. Changes to existing tables
    - `stories` - Add target_audience, comic_style fields
    - `story_nodes` - Add context chain fields for consistency

  3. Purpose
    - Enable consistent adult comic book style stories
    - Support character and visual consistency across chapters
    - Enable smart background generation with context
*/

-- Story Bibles table for consistency
CREATE TABLE IF NOT EXISTS story_bibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE UNIQUE,

  -- Characters with detailed visual descriptions
  characters jsonb NOT NULL DEFAULT '[]',

  -- World building
  setting jsonb NOT NULL DEFAULT '{}',

  -- Visual style for image consistency
  art_style jsonb NOT NULL DEFAULT '{}',

  -- Narrative structure
  narrative jsonb NOT NULL DEFAULT '{}',

  -- Image generation prefix (prepended to ALL image prompts)
  style_prompt_prefix text NOT NULL DEFAULT '',

  -- Character name -> visual description mapping
  character_prompt_map jsonb NOT NULL DEFAULT '{}',

  -- Full plot outline with branches
  plot_outline jsonb DEFAULT NULL,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add new columns to stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE stories ADD COLUMN target_audience text DEFAULT 'adult'
      CHECK (target_audience IN ('children', 'young_adult', 'adult'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'comic_style'
  ) THEN
    ALTER TABLE stories ADD COLUMN comic_style text DEFAULT 'noir';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'bible_id'
  ) THEN
    ALTER TABLE stories ADD COLUMN bible_id uuid REFERENCES story_bibles(id);
  END IF;
END $$;

-- Add context chain columns to story_nodes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'chapter_summary'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN chapter_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'characters_present'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN characters_present text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'panel_description'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN panel_description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'generation_status'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN generation_status text DEFAULT 'pending'
      CHECK (generation_status IN ('pending', 'generating', 'ready', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'context_chain'
  ) THEN
    -- Stores summary of all previous chapters for AI context
    ALTER TABLE story_nodes ADD COLUMN context_chain jsonb DEFAULT '[]';
  END IF;
END $$;

-- Add generation priority to choices for smart pre-fetching
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_choices' AND column_name = 'generation_priority'
  ) THEN
    ALTER TABLE story_choices ADD COLUMN generation_priority integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_choices' AND column_name = 'emotional_weight'
  ) THEN
    ALTER TABLE story_choices ADD COLUMN emotional_weight text;
  END IF;
END $$;

-- Enable RLS on story_bibles
ALTER TABLE story_bibles ENABLE ROW LEVEL SECURITY;

-- Policies for story_bibles
CREATE POLICY "Users can view bibles for their stories"
  ON story_bibles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_bibles.story_id
      AND (stories.is_public = true OR stories.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can create bibles for their stories"
  ON story_bibles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_bibles.story_id
      AND stories.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update bibles for their stories"
  ON story_bibles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_bibles.story_id
      AND stories.created_by = auth.uid()
    )
  );

-- Service role policies
CREATE POLICY "Service role full access to story_bibles"
  ON story_bibles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_bibles_story_id ON story_bibles(story_id);
CREATE INDEX IF NOT EXISTS idx_story_nodes_generation_status ON story_nodes(generation_status);
CREATE INDEX IF NOT EXISTS idx_story_nodes_parent_choice ON story_nodes(parent_choice_id);

-- Update trigger for story_bibles
CREATE OR REPLACE FUNCTION update_story_bible_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS story_bibles_updated_at ON story_bibles;
CREATE TRIGGER story_bibles_updated_at
  BEFORE UPDATE ON story_bibles
  FOR EACH ROW
  EXECUTE FUNCTION update_story_bible_timestamp();
