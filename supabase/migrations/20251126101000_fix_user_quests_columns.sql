/*
  Fix user_quests schema drift:
  - Add period_start/period_end if missing.
  - Create indexes guarded by column existence.
*/

DO $$
BEGIN
  IF to_regclass('public.user_quests') IS NOT NULL THEN
    -- Add missing columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_quests' AND column_name = 'period_start'
    ) THEN
      ALTER TABLE user_quests ADD COLUMN period_start date;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_quests' AND column_name = 'period_end'
    ) THEN
      ALTER TABLE user_quests ADD COLUMN period_end date;
    END IF;

    -- Indexes (only if columns exist)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_quests' AND column_name = 'period_start'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_user_quests_user_period ON user_quests (user_id, period_start);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_user_quests_status ON user_quests (status);
  END IF;
END $$;
