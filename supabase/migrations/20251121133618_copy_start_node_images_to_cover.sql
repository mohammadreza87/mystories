/*
  # Copy Start Node Images to Story Cover Images

  1. Updates
    - Copy `image_url` from start node to story's `cover_image_url` for stories that don't have a cover image
  
  2. Details
    - Only updates stories where `cover_image_url` is NULL
    - Only updates if the start node has an `image_url`
    - Uses the start node (node_key = 'start') as the source
*/

-- Update stories to use their start node's image as cover image
UPDATE stories
SET cover_image_url = story_nodes.image_url
FROM story_nodes
WHERE stories.id = story_nodes.story_id
  AND story_nodes.node_key = 'start'
  AND stories.cover_image_url IS NULL
  AND story_nodes.image_url IS NOT NULL;
