/*
  # Add Story Likes and Dislikes System

  1. New Tables
    - `story_reactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `story_id` (uuid, references stories)
      - `reaction_type` (text, 'like' or 'dislike')
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, story_id) - one reaction per user per story

  2. Changes
    - Add `likes_count` column to stories table (integer, default 0)
    - Add `dislikes_count` column to stories table (integer, default 0)

  3. Security
    - Enable RLS on `story_reactions` table
    - Add policy for authenticated users to create their own reactions
    - Add policy for authenticated users to read all reactions
    - Add policy for authenticated users to update their own reactions
    - Add policy for authenticated users to delete their own reactions

  4. Functions
    - Create function to update story counts when reactions change
    - Create trigger to automatically update counts
*/

-- Add like and dislike counts to stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE stories ADD COLUMN likes_count integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'dislikes_count'
  ) THEN
    ALTER TABLE stories ADD COLUMN dislikes_count integer DEFAULT 0;
  END IF;
END $$;

-- Create story_reactions table
CREATE TABLE IF NOT EXISTS story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id)
);

-- Enable RLS
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can create their own reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can update their own reactions" ON story_reactions;
DROP POLICY IF EXISTS "Users can delete their own reactions" ON story_reactions;

-- RLS Policies for story_reactions
CREATE POLICY "Users can read all reactions"
  ON story_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own reactions"
  ON story_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions"
  ON story_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON story_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update story counts
CREATE OR REPLACE FUNCTION update_story_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT
  IF (TG_OP = 'INSERT') THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id;
    ELSIF NEW.reaction_type = 'dislike' THEN
      UPDATE stories SET dislikes_count = dislikes_count + 1 WHERE id = NEW.story_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle UPDATE
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE stories SET likes_count = likes_count - 1 WHERE id = OLD.story_id;
    ELSIF OLD.reaction_type = 'dislike' THEN
      UPDATE stories SET dislikes_count = dislikes_count - 1 WHERE id = OLD.story_id;
    END IF;

    IF NEW.reaction_type = 'like' THEN
      UPDATE stories SET likes_count = likes_count + 1 WHERE id = NEW.story_id;
    ELSIF NEW.reaction_type = 'dislike' THEN
      UPDATE stories SET dislikes_count = dislikes_count + 1 WHERE id = NEW.story_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Handle DELETE
  IF (TG_OP = 'DELETE') THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE stories SET likes_count = likes_count - 1 WHERE id = OLD.story_id;
    ELSIF OLD.reaction_type = 'dislike' THEN
      UPDATE stories SET dislikes_count = dislikes_count - 1 WHERE id = OLD.story_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS story_reactions_count_trigger ON story_reactions;
CREATE TRIGGER story_reactions_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON story_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_story_reaction_counts();

-- Initialize counts for existing stories
UPDATE stories
SET likes_count = COALESCE((
  SELECT COUNT(*) FROM story_reactions
  WHERE story_reactions.story_id = stories.id
  AND story_reactions.reaction_type = 'like'
), 0),
dislikes_count = COALESCE((
  SELECT COUNT(*) FROM story_reactions
  WHERE story_reactions.story_id = stories.id
  AND story_reactions.reaction_type = 'dislike'
), 0);
