/*
  # Add audio_url to story_nodes table

  1. Changes
    - Add audio_url column to story_nodes table to store generated speech
    - This prevents regenerating the same audio on every visit
  
  2. Notes
    - Audio URLs from OpenAI TTS are temporary and expire
    - In production, consider storing audio files in Supabase Storage for permanence
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'audio_url'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN audio_url TEXT;
  END IF;
END $$;
