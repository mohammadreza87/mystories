/*
  # Add Language Support to Stories

  1. Changes
    - Add `language` column to `stories` table
      - `language` (text) - ISO 639-1 language code (e.g., 'en', 'es', 'fr', 'de', 'tr', etc.)
      - Default value is 'en' for English
    
  2. Notes
    - Language will be auto-detected during story generation
    - Used to display appropriate country flags in UI
*/

-- Add language column to stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'language'
  ) THEN
    ALTER TABLE stories ADD COLUMN language text DEFAULT 'en';
  END IF;
END $$;