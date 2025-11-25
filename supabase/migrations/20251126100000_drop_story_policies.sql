/*
  Drop existing RLS policies on stories as requested.
*/

DROP POLICY IF EXISTS "Anyone can view stories" ON stories;
DROP POLICY IF EXISTS "Users can create stories" ON stories;
DROP POLICY IF EXISTS "Users can update their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;
DROP POLICY IF EXISTS "Users can view public stories" ON stories;
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
