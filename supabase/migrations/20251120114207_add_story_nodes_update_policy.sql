/*
  # Add UPDATE policy for story_nodes table

  1. Changes
    - Add policy to allow public updates to story_nodes table
    - This allows node images to be saved when generated
  
  2. Security
    - Allows anyone to update story_nodes (needed for image generation)
    - In production, you may want to restrict this to authenticated users only
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'story_nodes' 
    AND policyname = 'Story nodes can be updated'
  ) THEN
    CREATE POLICY "Story nodes can be updated"
      ON story_nodes
      FOR UPDATE
      TO public
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
