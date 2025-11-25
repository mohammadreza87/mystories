-- Add reading_time column to stories table
ALTER TABLE stories
ADD COLUMN reading_time INTEGER DEFAULT 10;

-- Add comment for documentation
COMMENT ON COLUMN stories.reading_time IS 'Estimated reading time in minutes';

-- Update existing stories with calculated reading time (optional)
UPDATE stories
SET reading_time = CASE
  WHEN estimated_duration < 5 THEN 5
  WHEN estimated_duration > 30 THEN 30
  ELSE estimated_duration
END
WHERE reading_time IS NULL;