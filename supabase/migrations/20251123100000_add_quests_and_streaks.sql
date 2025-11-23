/*
  # Quests and Streaks

  - Adds quest tracking for daily/weekly tasks
  - Adds streak tracking
  - Adds points balance to user_profiles
*/

-- Points on profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN points integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_active_at timestamptz;
  END IF;
END $$;

-- Quests table
CREATE TABLE IF NOT EXISTS user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL, -- read_chapter, create_story, complete_story
  quest_type text NOT NULL, -- daily | weekly
  period_start date NOT NULL,
  period_end date NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', -- pending | completed
  reward_points integer NOT NULL DEFAULT 0,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, task, period_start)
);

ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quests"
  ON user_quests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own quests"
  ON user_quests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own quests"
  ON user_quests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_action_date date,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_quests_user_period ON user_quests (user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests (status);
CREATE INDEX IF NOT EXISTS idx_user_streaks_updated ON user_streaks (updated_at DESC);

-- Points helper
CREATE OR REPLACE FUNCTION public.increment_points(p_user_id uuid, p_amount int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET points = COALESCE(points, 0) + p_amount
  WHERE id = p_user_id;
END;
$$;
