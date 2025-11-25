-- Add missing tables for story reactions and other features

-- Create story_reactions table
CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  reaction_type TEXT CHECK (reaction_type IN ('like', 'love', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id)
);

-- Create story_nodes table (for individual story nodes/pages)
CREATE TABLE IF NOT EXISTS public.story_nodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  node_id TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  choices JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, node_id)
);

-- Create story_completions table
CREATE TABLE IF NOT EXISTS public.story_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  path_taken JSONB DEFAULT '[]'::jsonb,
  UNIQUE(story_id, user_id)
);

-- Create follows table for user following system
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable RLS on new tables
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Story reactions policies
CREATE POLICY "Anyone can view reactions" ON public.story_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own reactions" ON public.story_reactions
  FOR ALL USING (auth.uid() = user_id);

-- Story nodes policies
CREATE POLICY "Anyone can view story nodes" ON public.story_nodes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_nodes.story_id
      AND (stories.is_public = true OR stories.user_id = auth.uid() OR stories.created_by = auth.uid())
    )
  );

CREATE POLICY "Story owners can manage nodes" ON public.story_nodes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE stories.id = story_nodes.story_id
      AND (stories.user_id = auth.uid() OR stories.created_by = auth.uid())
    )
  );

-- Story completions policies
CREATE POLICY "Users can view own completions" ON public.story_completions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own completions" ON public.story_completions
  FOR ALL USING (auth.uid() = user_id);

-- Follows policies
CREATE POLICY "Anyone can view follows" ON public.follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Update profiles to track follower/following counts with triggers
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;

    UPDATE public.profiles
    SET followers_count = followers_count + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;

    UPDATE public.profiles
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_counts_trigger
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW
EXECUTE FUNCTION update_follow_counts();