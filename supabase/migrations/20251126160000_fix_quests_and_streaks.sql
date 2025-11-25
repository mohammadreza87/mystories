/*
  # Fix Quests and Streaks Schema

  Ensures all required tables and functions exist for the quests system.
*/

-- Drop and recreate user_quests with correct schema
DROP TABLE IF EXISTS user_quests CASCADE;
CREATE TABLE user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  quest_type text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  reward_points integer NOT NULL DEFAULT 0,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, task, period_start)
);

-- Enable RLS
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own quests"
  ON user_quests FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own quests"
  ON user_quests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own quests"
  ON user_quests FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Drop and recreate user_streaks with correct schema
DROP TABLE IF EXISTS user_streaks CASCADE;
CREATE TABLE user_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_action_date date,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Indexes
CREATE INDEX idx_user_quests_user_period ON user_quests (user_id, period_start);
CREATE INDEX idx_user_quests_status ON user_quests (status);
CREATE INDEX idx_user_streaks_updated ON user_streaks (updated_at DESC);

-- Fix increment_points function to use total_points
CREATE OR REPLACE FUNCTION public.increment_points(p_user_id uuid, p_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles
  SET total_points = COALESCE(total_points, 0) + p_amount,
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;
