/*
  # Auto-create User Profile on Signup

  1. Changes
    - Add trigger function to automatically create user_profiles entry when a new user signs up
    - Creates default profile with user's email as display name
  
  2. Security
    - Trigger runs with security definer to bypass RLS
    - Only creates profile for new auth.users, not existing ones
*/

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email, 'User')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();
