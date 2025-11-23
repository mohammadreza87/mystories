/*
  # Fix Story Choices RLS for Story Readers

  1. Problem
    - Users cannot insert choices when playing stories they don't own
    - Current policy only allows story creators to add choices
    - This breaks the story reading experience

  2. Changes
    - Drop old restrictive INSERT policy for story_choices
    - Create new policy allowing authenticated users to insert choices for:
      - Public stories (accessible to everyone)
      - Their own stories (stories they created)
    - Keep other policies for security (update/delete still restricted to owners)

  3. Security
    - Users can only insert choices for stories they have access to (public or owned)
    - Service role can still manage all choices
    - Story owners maintain control over their own story choices
*/

-- Drop the overly restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can insert choices" ON story_choices;
DROP POLICY IF EXISTS "Service role can insert choices" ON story_choices;

-- Create a new policy that allows users to insert choices for accessible stories
CREATE POLICY "Users can insert choices for accessible stories"
  ON story_choices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Service role can always insert
    (SELECT (auth.jwt() ->> 'role')) = 'service_role'
    OR
    -- Users can insert choices for public stories or their own stories
    EXISTS (
      SELECT 1
      FROM story_nodes sn
      JOIN stories s ON s.id = sn.story_id
      WHERE sn.id = story_choices.from_node_id
      AND (
        s.is_public = true  -- Public stories
        OR s.created_by = auth.uid()  -- User's own stories
      )
    )
  );
