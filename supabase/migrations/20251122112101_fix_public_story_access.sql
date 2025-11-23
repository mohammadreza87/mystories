/*
  # Fix Public Story Access for Unauthenticated Users

  1. Problem
    - Existing policy "Users can view public stories" only applies TO authenticated
    - Unauthenticated users get 400 errors when trying to view stories
    - This breaks shared story links for non-logged-in users

  2. Solution
    - Drop the authenticated-only policy
    - Create separate policies for authenticated and public (unauthenticated) users
    - Authenticated users can see public stories OR their own stories
    - Public (unauthenticated) users can ONLY see public stories

  3. Security
    - Unauthenticated users: READ ONLY access to public stories
    - Authenticated users: Can see public stories + their own private stories
    - All write operations still require authentication
*/

-- Drop existing SELECT policy for stories
DROP POLICY IF EXISTS "Users can view public stories" ON stories;
DROP POLICY IF EXISTS "Anyone can view public stories" ON stories;

-- Allow authenticated users to view public stories or their own stories
CREATE POLICY "Authenticated users can view accessible stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (is_public = true OR created_by = auth.uid());

-- Allow unauthenticated (public/anon) users to view only public stories
CREATE POLICY "Public can view public stories"
  ON stories
  FOR SELECT
  TO anon
  USING (is_public = true);

-- Same for user_profiles - ensure unauthenticated users can see creator info
DROP POLICY IF EXISTS "Users can view public profiles or their own" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view public profiles" ON user_profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Public can view profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (true);