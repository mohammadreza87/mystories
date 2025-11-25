/*
  # Grant unlimited access to specific users

  Sets is_grandfathered = true for specified email addresses.
*/

UPDATE user_profiles
SET is_grandfathered = true,
    subscription_tier = 'pro',
    updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('reza@joyixir.com', 'h.mohammadreza.87@gmail.com')
);
