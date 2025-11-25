/*
  Fix reading_time migration failure:
  - Ensure estimated_duration exists on stories before using it.
  - Safely backfill reading_time when both columns are present.
*/

DO $$
BEGIN
  -- Add estimated_duration if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE stories ADD COLUMN estimated_duration INTEGER DEFAULT 10;
  END IF;

  -- Backfill reading_time only if both columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'reading_time'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'stories' AND column_name = 'estimated_duration'
  ) THEN
    UPDATE stories
    SET reading_time = CASE
      WHEN estimated_duration < 5 THEN 5
      WHEN estimated_duration > 30 THEN 30
      ELSE estimated_duration
    END
    WHERE reading_time IS NULL;
  END IF;
END $$;
