/*
  # Ensure target_audience column exists on stories
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'stories'
    AND column_name = 'target_audience'
  ) THEN
    ALTER TABLE stories ADD COLUMN target_audience text DEFAULT 'adult';
  END IF;
END $$;
