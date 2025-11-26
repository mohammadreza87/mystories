-- Complete database setup for Next Tale

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.user_achievements CASCADE;
DROP TABLE IF EXISTS public.user_quests CASCADE;
DROP TABLE IF EXISTS public.story_stats CASCADE;
DROP TABLE IF EXISTS public.reading_progress CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.achievements CASCADE;
DROP TABLE IF EXISTS public.quests CASCADE;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  experience_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  total_points INTEGER DEFAULT 0,
  reading_points INTEGER DEFAULT 0,
  creating_points INTEGER DEFAULT 0,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',
  is_grandfathered BOOLEAN DEFAULT false,
  stories_generated_today INTEGER DEFAULT 0,
  total_stories_generated INTEGER DEFAULT 0,
  last_generation_date DATE,
  stripe_customer_id TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  is_profile_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create stories table
CREATE TABLE public.stories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  genre TEXT,
  age_range TEXT,
  is_public BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  reads INTEGER DEFAULT 0,
  cover_image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create reading_progress table
CREATE TABLE public.reading_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  current_node_id TEXT NOT NULL,
  choices_made JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, story_id)
);

-- Create story_stats table
CREATE TABLE public.story_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  story_id UUID REFERENCES public.stories ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  liked BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, user_id)
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  points INTEGER DEFAULT 10,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  achievement_id UUID REFERENCES public.achievements ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- Create quests table
CREATE TABLE public.quests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  target_value INTEGER DEFAULT 1,
  reward_points INTEGER DEFAULT 10,
  is_daily BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_quests table
CREATE TABLE public.user_quests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  quest_id UUID REFERENCES public.quests ON DELETE CASCADE NOT NULL,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, quest_id)
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'premium', 'pro')),
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Anyone can view profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Stories policies
CREATE POLICY "Anyone can view public stories" ON public.stories
  FOR SELECT USING (is_public = true OR auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Authenticated users can create stories" ON public.stories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own stories" ON public.stories
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can delete their own stories" ON public.stories
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = created_by);

-- Reading progress policies
CREATE POLICY "Users can view own progress" ON public.reading_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON public.reading_progress
  FOR ALL USING (auth.uid() = user_id);

-- Story stats policies
CREATE POLICY "Anyone can view stats" ON public.story_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own stats" ON public.story_stats
  FOR ALL USING (auth.uid() = user_id);

-- Achievements policies
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- User achievements policies
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own achievements" ON public.user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- Quests policies
CREATE POLICY "Anyone can view quests" ON public.quests
  FOR SELECT USING (true);

-- User quests policies
CREATE POLICY "Users can manage own quests" ON public.user_quests
  FOR ALL USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can manage own subscription" ON public.subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    display_name,
    subscription_tier,
    subscription_status
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'free',
    'active'
  );

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (new.id, 'free', 'active');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample achievements
INSERT INTO public.achievements (name, description, icon, points, requirement_type, requirement_value)
VALUES
  ('First Story', 'Create your first story', '📝', 10, 'stories_created', 1),
  ('Prolific Writer', 'Create 5 stories', '✍️', 50, 'stories_created', 5),
  ('Master Storyteller', 'Create 10 stories', '📚', 100, 'stories_created', 10),
  ('First Read', 'Read your first story', '👁️', 10, 'stories_read', 1),
  ('Bookworm', 'Read 10 stories', '📖', 50, 'stories_read', 10),
  ('Popular Story', 'Get 10 likes on a story', '❤️', 50, 'story_likes', 10)
ON CONFLICT DO NOTHING;

-- Insert sample quests
INSERT INTO public.quests (title, description, type, target_value, reward_points, is_daily)
VALUES
  ('Daily Reading', 'Read 3 stories today', 'read_stories', 3, 20, true),
  ('Daily Creation', 'Create 1 story today', 'create_story', 1, 30, true),
  ('Explorer', 'Try 3 different genres', 'explore_genres', 3, 25, false)
ON CONFLICT DO NOTHING;

-- Demo story will be created after first user signs up
-- No demo data needed for initial setup
