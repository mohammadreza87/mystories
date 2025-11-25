/*
  # Add Story Ownership and Visibility System

  1. Changes to Stories Table
    - Add `created_by` column (uuid, references auth.users)
    - Add `is_public` column (boolean, default true)
    - Add `is_user_generated` column (boolean, default false)

  2. Changes to User Profiles Table
    - Add `is_profile_public` column (boolean, default true)

  3. Security Updates
    - Update RLS policies to allow users to create their own stories
    - Update RLS policies to show only public stories to all users
    - Allow users to see all their own stories regardless of visibility

  4. Notes
    - User-generated stories start as private by default
    - Users can make their profiles public/private
    - Public stories from public profiles are visible to everyone
*/

-- Add columns to stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE stories ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE stories ADD COLUMN is_public boolean DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'is_user_generated'
  ) THEN
    ALTER TABLE stories ADD COLUMN is_user_generated boolean DEFAULT false;
  END IF;
END $$;

-- Add profile privacy column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_profile_public'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_profile_public boolean DEFAULT true;
  END IF;
END $$;

-- Update existing stories to be public and not user-generated
UPDATE stories SET is_public = true WHERE is_public IS NULL;
UPDATE stories SET is_user_generated = false WHERE is_user_generated IS NULL;

-- Drop existing policies for stories
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
DROP POLICY IF EXISTS "Users can view public stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;

-- Create new RLS policies for stories
CREATE POLICY "Users can view public stories"
  ON stories FOR SELECT
  TO authenticated
  USING (is_public = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own stories"
  ON stories FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Update user_profiles policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view public profiles or their own" ON user_profiles;

CREATE POLICY "Users can view public profiles or their own"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (is_profile_public = true OR auth.uid() = id);
