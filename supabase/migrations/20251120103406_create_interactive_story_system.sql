/*
  # Interactive Story System for Kids

  1. New Tables
    - `stories`
      - `id` (uuid, primary key)
      - `title` (text) - Story title
      - `description` (text) - Brief description
      - `cover_image_url` (text) - Optional cover image
      - `age_range` (text) - Target age group (e.g., "4-6", "7-9")
      - `estimated_duration` (integer) - Estimated duration in minutes
      - `created_at` (timestamptz)
    
    - `story_nodes`
      - `id` (uuid, primary key)
      - `story_id` (uuid, foreign key to stories)
      - `node_key` (text) - Unique identifier within story (e.g., "start", "forest_path", "cave_entrance")
      - `content` (text) - The story text for this node
      - `is_ending` (boolean) - Whether this is an ending node
      - `ending_type` (text) - Type of ending: "happy", "neutral", "learning_moment"
      - `order_index` (integer) - For ordering nodes
      - `created_at` (timestamptz)
    
    - `story_choices`
      - `id` (uuid, primary key)
      - `from_node_id` (uuid, foreign key to story_nodes)
      - `to_node_id` (uuid, foreign key to story_nodes)
      - `choice_text` (text) - The text of the decision option
      - `consequence_hint` (text) - Optional hint about what might happen
      - `choice_order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `user_story_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Anonymous or authenticated user
      - `story_id` (uuid, foreign key to stories)
      - `current_node_id` (uuid, foreign key to story_nodes)
      - `path_taken` (jsonb) - Array of node_keys visited
      - `completed` (boolean)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Stories and nodes are publicly readable
    - Progress tracking is per-user or per-session
*/

CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  cover_image_url text,
  age_range text DEFAULT '5-10',
  estimated_duration integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  node_key text NOT NULL,
  content text NOT NULL,
  is_ending boolean DEFAULT false,
  ending_type text,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(story_id, node_key)
);

CREATE TABLE IF NOT EXISTS story_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id uuid REFERENCES story_nodes(id) ON DELETE CASCADE NOT NULL,
  to_node_id uuid REFERENCES story_nodes(id) ON DELETE CASCADE NOT NULL,
  choice_text text NOT NULL,
  consequence_hint text,
  choice_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_story_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  current_node_id uuid REFERENCES story_nodes(id) ON DELETE CASCADE,
  path_taken jsonb DEFAULT '[]'::jsonb,
  completed boolean DEFAULT false,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories are publicly readable"
  ON stories FOR SELECT
  USING (true);

CREATE POLICY "Story nodes are publicly readable"
  ON story_nodes FOR SELECT
  USING (true);

CREATE POLICY "Story choices are publicly readable"
  ON story_choices FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own progress"
  ON user_story_progress FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own progress"
  ON user_story_progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own progress"
  ON user_story_progress FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_story_nodes_story_id ON story_nodes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_choices_from_node ON story_choices(from_node_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_story ON user_story_progress(user_id, story_id);