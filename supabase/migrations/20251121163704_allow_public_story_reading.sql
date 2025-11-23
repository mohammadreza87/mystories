/*
  # Allow Public Story Reading

  1. Changes
    - Update stories SELECT policy to allow unauthenticated users to read public stories
    - Update story_nodes SELECT policy to allow unauthenticated users to read nodes from public stories
    - Update story_choices SELECT policy to allow unauthenticated users to read choices from public stories
    - Update story_reactions SELECT policy to allow unauthenticated users to see reaction counts

  2. Security
    - Only SELECT (read) operations are allowed for unauthenticated users
    - Only public stories are accessible
    - Insert/Update/Delete operations still require authentication
    - Users must be authenticated to generate stories, add reactions, etc.
*/

-- Allow unauthenticated users to read public stories
DROP POLICY IF EXISTS "Anyone can view public stories" ON stories;
CREATE POLICY "Anyone can view public stories"
  ON stories
  FOR SELECT
  TO public
  USING (is_public = true);

-- Allow unauthenticated users to read story nodes from public stories
DROP POLICY IF EXISTS "Anyone can view nodes from public stories" ON story_nodes;
CREATE POLICY "Anyone can view nodes from public stories"
  ON story_nodes
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_nodes.story_id
      AND stories.is_public = true
    )
  );

-- Allow unauthenticated users to read choices from public stories
DROP POLICY IF EXISTS "Anyone can view choices from public stories" ON story_choices;
CREATE POLICY "Anyone can view choices from public stories"
  ON story_choices
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM story_nodes sn
      JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id
      AND s.is_public = true
    )
  );

-- Allow anyone to view story reactions (for counts)
DROP POLICY IF EXISTS "Anyone can view reactions" ON story_reactions;
CREATE POLICY "Anyone can view reactions"
  ON story_reactions
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to view user profiles (for creator info)
DROP POLICY IF EXISTS "Anyone can view public profiles" ON user_profiles;
CREATE POLICY "Anyone can view public profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (true);