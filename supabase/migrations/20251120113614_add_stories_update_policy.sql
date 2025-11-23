/*
  # Add UPDATE policy for stories table

  1. Changes
    - Add policy to allow public updates to stories table
    - This allows the cover_image_url to be saved when generated
  
  2. Security
    - Allows anyone to update stories (needed for cover image generation)
    - In production, you may want to restrict this to authenticated users only
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'stories' 
    AND policyname = 'Stories can be updated'
  ) THEN
    CREATE POLICY "Stories can be updated"
      ON stories
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
