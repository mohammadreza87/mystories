/*
  # Fix stories content column issue

  If a content column exists on stories with NOT NULL constraint, make it nullable.
  This column shouldn't exist on stories (content belongs to story_nodes).
*/

-- Make content nullable if it exists
ALTER TABLE stories ALTER COLUMN content DROP NOT NULL;

