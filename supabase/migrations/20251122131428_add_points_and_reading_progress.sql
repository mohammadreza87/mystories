/*
  # Add Points System and Reading Progress Tracking

  1. New Tables
    - `reading_progress`
      - Tracks which chapters each user has read
      - Records timestamp of each chapter read
      - Enables progress display and resuming stories

    - `story_completions`
      - Tracks when users complete stories (reach any ending)
      - Used to count unique completions per story
      - Prevents duplicate completion bonuses

  2. Schema Changes to `user_profiles`
    - Add points tracking columns:
      - `total_points` (integer) - Combined points from reading and creating
      - `reading_points` (integer) - Points earned from reading stories
      - `creating_points` (integer) - Points earned from creating stories that others read

  3. Schema Changes to `stories`
    - Add `completion_count` (integer) - Cache of unique users who completed this story
    - Denormalized for performance (updated via trigger)

  4. Security
    - Enable RLS on new tables
    - Add policies for reading and writing progress
    - Add policies for viewing completions
    - Service role policies for point updates

  5. Triggers
    - Auto-update story completion_count when completions are added

  6. Important Notes
    - Points for reading: 1 point per chapter (including re-reads)
    - Points for completion: 5 points (only first time per story)
    - Creator gets same points when others read their stories
    - Creator gets 5 points when creating a story
*/

-- Add points columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_points integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'reading_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN reading_points integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'creating_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN creating_points integer DEFAULT 0;
  END IF;
END $$;

-- Add completion_count to stories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'completion_count'
  ) THEN
    ALTER TABLE stories ADD COLUMN completion_count integer DEFAULT 0;
  END IF;
END $$;

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id, node_id)
);

-- Create story_completions table
CREATE TABLE IF NOT EXISTS story_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_story ON reading_progress(story_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_story ON reading_progress(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_story_completions_user ON story_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_completions_story ON story_completions(story_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON user_profiles(total_points DESC);

-- Enable RLS
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reading_progress

CREATE POLICY "Users can view own reading progress"
  ON reading_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON reading_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage reading progress"
  ON reading_progress
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for story_completions

CREATE POLICY "Users can view all story completions"
  ON story_completions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own completions"
  ON story_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage completions"
  ON story_completions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update story completion count
CREATE OR REPLACE FUNCTION update_story_completion_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories
  SET completion_count = (
    SELECT COUNT(DISTINCT user_id)
    FROM story_completions
    WHERE story_id = NEW.story_id
  )
  WHERE id = NEW.story_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update completion count when new completion is added
DROP TRIGGER IF EXISTS trigger_update_completion_count ON story_completions;
CREATE TRIGGER trigger_update_completion_count
  AFTER INSERT ON story_completions
  FOR EACH ROW
  EXECUTE FUNCTION update_story_completion_count();

-- Initialize completion counts for existing stories
UPDATE stories
SET completion_count = (
  SELECT COUNT(DISTINCT user_id)
  FROM story_completions
  WHERE story_id = stories.id
)
WHERE id IS NOT NULL;
