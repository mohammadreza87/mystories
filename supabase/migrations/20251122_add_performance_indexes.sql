/*
  # Performance Indexes Refresher

  Adds lean, commonly-used indexes to keep story generation and reading snappy.
  All indexes are conditional to avoid clashes with any existing ones.
*/

-- Fast lookup of nodes by story/key
CREATE INDEX IF NOT EXISTS idx_story_nodes_story_key_perf
  ON story_nodes (story_id, node_key);

-- Choices fan-out/fan-in
CREATE INDEX IF NOT EXISTS idx_story_choices_from_node_perf
  ON story_choices (from_node_id);

CREATE INDEX IF NOT EXISTS idx_story_choices_to_node_perf
  ON story_choices (to_node_id);

-- Parent chain for continuation stitching
CREATE INDEX IF NOT EXISTS idx_story_nodes_parent_choice_perf
  ON story_nodes (parent_choice_id);

-- Story listings and ownership filters
CREATE INDEX IF NOT EXISTS idx_stories_created_by_public_perf
  ON stories (created_by, is_public);

-- Progress lookups per user/story
CREATE INDEX IF NOT EXISTS idx_user_story_progress_user_story_perf
  ON user_story_progress (user_id, story_id);

-- Realtime queue prioritization
CREATE INDEX IF NOT EXISTS idx_generation_queue_status_priority_perf
  ON generation_queue (status, priority DESC, created_at ASC);

-- Reaction aggregations
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_perf
  ON story_reactions (story_id);
