/*
  # Story Generation Progress System

  1. Schema Changes
    - Add generation tracking columns to `stories` table:
      - `generation_status` (text) - Current generation status
      - `generation_progress` (integer) - Percentage complete (0-100)
      - `total_nodes_planned` (integer) - Total nodes to generate
      - `nodes_generated` (integer) - Nodes completed so far
      - `generation_started_at` (timestamptz) - When generation began
      - `generation_completed_at` (timestamptz) - When fully complete
    
    - Add generation queue table:
      - `generation_queue` - Manages story generation jobs
      - Ensures stories are generated one at a time
      - Tracks retry attempts and failures
    
    - Add node generation tracking:
      - `is_placeholder` flag in `story_nodes`
      - `generation_failed` flag for failed generations
      - `generation_attempts` counter for retries

  2. Generation Status Values
    - `pending` - Story created, waiting in queue
    - `generating_first_chapter` - Creating initial chapter
    - `first_chapter_ready` - User can start reading
    - `generating_full_story` - Background generation in progress
    - `fully_generated` - All paths complete
    - `generation_failed` - Generation encountered errors

  3. Security
    - Enable RLS on generation_queue table
    - Users can view their own generation jobs
    - Only authenticated users can access
*/

-- Add generation tracking columns to stories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'generation_status'
  ) THEN
    ALTER TABLE stories ADD COLUMN generation_status text DEFAULT 'pending';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'generation_progress'
  ) THEN
    ALTER TABLE stories ADD COLUMN generation_progress integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'total_nodes_planned'
  ) THEN
    ALTER TABLE stories ADD COLUMN total_nodes_planned integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'nodes_generated'
  ) THEN
    ALTER TABLE stories ADD COLUMN nodes_generated integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'generation_started_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN generation_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'generation_completed_at'
  ) THEN
    ALTER TABLE stories ADD COLUMN generation_completed_at timestamptz;
  END IF;
END $$;

-- Add node generation tracking columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'is_placeholder'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN is_placeholder boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'generation_failed'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN generation_failed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'story_nodes' AND column_name = 'generation_attempts'
  ) THEN
    ALTER TABLE story_nodes ADD COLUMN generation_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Create generation queue table
CREATE TABLE IF NOT EXISTS generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  priority integer DEFAULT 0,
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  error_message text,
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE(story_id)
);

-- Create index for queue processing
CREATE INDEX IF NOT EXISTS idx_generation_queue_status_priority 
  ON generation_queue(status, priority DESC, created_at ASC);

-- Enable RLS on generation_queue
ALTER TABLE generation_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own generation queue" ON generation_queue;
DROP POLICY IF EXISTS "Users can insert own generation queue" ON generation_queue;
DROP POLICY IF EXISTS "Users can update own generation queue" ON generation_queue;

-- Users can view their own queue items
CREATE POLICY "Users can view own generation queue"
  ON generation_queue FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own queue items
CREATE POLICY "Users can insert own generation queue"
  ON generation_queue FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue items
CREATE POLICY "Users can update own generation queue"
  ON generation_queue FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add index for faster story lookups by generation status
CREATE INDEX IF NOT EXISTS idx_stories_generation_status 
  ON stories(generation_status, created_at DESC);