-- Fix authentication and allow anonymous access to public stories

-- First, make sure RLS is enabled
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public stories are viewable by everyone" ON public.stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;

-- Recreate stories policies with better anonymous access
CREATE POLICY "Anyone can view public stories" ON public.stories
  FOR SELECT
  USING (
    is_public = true
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

CREATE POLICY "Authenticated users can create stories" ON public.stories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.stories
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.stories
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = id);

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = id);

-- Fix story_stats policies
DROP POLICY IF EXISTS "Stats are viewable by everyone" ON public.story_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON public.story_stats;
DROP POLICY IF EXISTS "Users can update own stats" ON public.story_stats;

CREATE POLICY "Anyone can view story stats" ON public.story_stats
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stats" ON public.story_stats
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" ON public.story_stats
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Create a test public story to verify everything works
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'demo@example.com',
  '{"username": "DemoUser", "full_name": "Demo User"}'::jsonb,
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Insert a test story
INSERT INTO public.stories (
  user_id,
  title,
  content,
  genre,
  age_range,
  is_public
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Welcome to Next Tale',
  '{
    "nodes": {
      "start": {
        "id": "start",
        "text": "Welcome to Next Tale! This is a demo story to show the platform is working.",
        "choices": [
          {"text": "Learn more", "nextNode": "learn"},
          {"text": "Start creating", "nextNode": "create"}
        ]
      },
      "learn": {
        "id": "learn",
        "text": "Next Tale lets you create interactive stories with branching paths.",
        "choices": [
          {"text": "The End", "nextNode": "end"}
        ]
      },
      "create": {
        "id": "create",
        "text": "Sign up to start creating your own stories!",
        "choices": [
          {"text": "The End", "nextNode": "end"}
        ]
      },
      "end": {
        "id": "end",
        "text": "Thanks for reading!",
        "choices": []
      }
    },
    "startNode": "start"
  }'::jsonb,
  'Educational',
  'All Ages',
  true
) ON CONFLICT DO NOTHING;
