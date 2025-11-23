/*
  # Fix User Profile Creation Trigger

  1. Changes
    - Update trigger function to include username generation
    - Generate username from email (part before @) with random suffix if needed
    - Ensure all required NOT NULL fields are populated

  2. Security
    - Maintains SECURITY DEFINER to bypass RLS during user creation
*/

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
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
  
  -- Insert the user profile
  INSERT INTO public.user_profiles (
    id, 
    display_name, 
    username,
    subscription_tier,
    subscription_status,
    is_grandfathered,
    stories_generated_today,
    total_stories_generated
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'User'),
    final_username,
    'free',
    'active',
    false,
    0,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();