/*
  # Add Username to User Profiles

  1. Changes
    - Add `username` column to `user_profiles` table
      - `username` (text) - Unique username for each user
      - Must be unique across all users
      - Can only contain lowercase letters, numbers, and underscores
      - Length between 3-20 characters
    
  2. Function
    - Create a function to generate random usernames
    - Format: user_[random_string]
    
  3. Migration
    - Add username column with unique constraint
    - Generate random usernames for existing users
    - Add check constraint for valid username format

  4. Security
    - Users can update their own username
*/

-- Add username column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username text;
  END IF;
END $$;

-- Create function to generate random username
CREATE OR REPLACE FUNCTION generate_random_username()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  random_str text;
  new_username text;
  username_exists boolean;
BEGIN
  LOOP
    -- Generate random string (8 characters)
    random_str := substr(md5(random()::text), 1, 8);
    new_username := 'user_' || random_str;
    
    -- Check if username already exists
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE username = new_username) INTO username_exists;
    
    -- If username doesn't exist, return it
    IF NOT username_exists THEN
      RETURN new_username;
    END IF;
  END LOOP;
END;
$$;

-- Generate usernames for existing users without one
UPDATE user_profiles
SET username = generate_random_username()
WHERE username IS NULL;

-- Make username required and unique
ALTER TABLE user_profiles
ALTER COLUMN username SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_username_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- Add check constraint for valid username format (lowercase letters, numbers, underscores, 3-20 chars)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'username_format_check'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT username_format_check
    CHECK (username ~ '^[a-z0-9_]{3,20}$');
  END IF;
END $$;

-- Update trigger function to generate username for new users
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, display_name)
  VALUES (
    NEW.id,
    generate_random_username(),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;