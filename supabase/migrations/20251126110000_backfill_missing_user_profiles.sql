/*
  # Backfill Missing User Profiles

  Creates user_profiles entries for any auth.users that don't have a profile yet.
  This fixes the "Failed to fetch user profile" error in the generate-story edge function.
*/

-- Insert missing user profiles for existing auth.users
INSERT INTO public.user_profiles (
  id,
  display_name,
  username,
  subscription_tier,
  subscription_status,
  is_grandfathered,
  stories_generated_today,
  total_stories_generated,
  last_generation_date,
  total_points,
  reading_points,
  creating_points,
  created_at,
  updated_at
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'display_name', u.email, 'User'),
  COALESCE(
    lower(regexp_replace(split_part(u.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
    'user' || substr(md5(random()::text), 1, 6)
  ) || '_' || substr(md5(u.id::text), 1, 4),
  'free',
  'active',
  false,
  0,
  0,
  NULL,
  0,
  0,
  0,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL;
