/*
  # Fix reading_progress table schema

  Ensure node_id column exists
*/

-- Drop and recreate with correct schema
DROP TABLE IF EXISTS reading_progress CASCADE;

CREATE TABLE reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES story_nodes(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(user_id, story_id, node_id)
);

-- Indexes
CREATE INDEX idx_reading_progress_user ON reading_progress(user_id);
CREATE INDEX idx_reading_progress_story ON reading_progress(story_id);
CREATE INDEX idx_reading_progress_user_story ON reading_progress(user_id, story_id);

-- Enable RLS
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own reading progress"
  ON reading_progress FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON reading_progress FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage reading progress"
  ON reading_progress FOR ALL TO service_role
  USING (true) WITH CHECK (true);
