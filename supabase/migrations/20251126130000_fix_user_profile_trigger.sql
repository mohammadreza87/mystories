/*
  # Fix User Profile Creation Trigger

  The trigger was inserting into columns that don't exist (stories_generated_this_month)
  and missing required columns. This fixes it to match the actual schema.
*/

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  base_username text;
  final_username text;
  counter int := 0;
BEGIN
  -- Extract username from email (part before @)
  base_username := split_part(NEW.email, '@', 1);

  -- Remove non-alphanumeric characters and convert to lowercase
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9]', '', 'g'));

  -- Ensure minimum length
  IF length(base_username) < 3 THEN
    base_username := 'user' || substr(md5(random()::text), 1, 6);
  END IF;

  -- Try to find a unique username
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    avatar_url,
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
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
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
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();
