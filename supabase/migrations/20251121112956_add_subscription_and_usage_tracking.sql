/*
  # Add Subscription and Usage Tracking System

  1. Schema Changes
    - Add subscription fields to `user_profiles`:
      - `subscription_tier` (text) - 'free' or 'pro'
      - `subscription_status` (text) - 'active', 'canceled', 'past_due', etc.
      - `subscription_period_end` (timestamptz) - When subscription expires
      - `stripe_customer_id` (text) - Stripe customer ID
      - `stripe_subscription_id` (text) - Stripe subscription ID
      - `is_grandfathered` (boolean) - Lifetime pro access for existing users
    
    - Add usage tracking fields:
      - `stories_generated_today` (integer) - Daily story generation count
      - `last_generation_date` (date) - Last story generation date for reset logic
      - `total_stories_generated` (integer) - Total lifetime story count

  2. Data Migration
    - Set all existing users as grandfathered Pro users (lifetime access)

  3. Security
    - Update RLS policies to allow subscription field updates
    - Add indexes for performance

  4. Important Notes
    - Free users: 1 story/day (soft limit)
    - Pro users: Unlimited stories
    - Grandfathered users: Lifetime Pro access
*/

-- Add subscription and usage tracking columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_status text DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_period_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_period_end timestamptz DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_customer_id text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stripe_subscription_id text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_grandfathered'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_grandfathered boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'stories_generated_today'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN stories_generated_today integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_generation_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_generation_date date DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'total_stories_generated'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_stories_generated integer DEFAULT 0;
  END IF;
END $$;

-- Grandfather all existing users as lifetime Pro members
UPDATE user_profiles
SET 
  subscription_tier = 'pro',
  is_grandfathered = true,
  subscription_status = 'active'
WHERE id IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

-- Add policy to allow service role to update subscription fields (for webhook)
CREATE POLICY "Service role can update subscriptions"
  ON user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);