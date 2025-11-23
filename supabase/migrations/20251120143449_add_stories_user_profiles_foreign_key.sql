/*
  # Add Foreign Key Relationship Between Stories and User Profiles

  1. Changes
    - Add foreign key constraint from `stories.created_by` to `user_profiles.id`
    - This enables proper joins between stories and their creators in queries

  2. Notes
    - Uses IF NOT EXISTS pattern to prevent errors if constraint already exists
    - Ensures data integrity by linking stories to their creators
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'stories_created_by_fkey' 
    AND table_name = 'stories'
  ) THEN
    ALTER TABLE stories 
    ADD CONSTRAINT stories_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES user_profiles(id) 
    ON DELETE SET NULL;
  END IF;
END $$;
