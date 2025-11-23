/*
  # Fix RLS Performance and Security Issues

  1. RLS Policy Optimizations
    - Replace `auth.uid()` with `(select auth.uid())` in problematic policies
    - Affects tables: stories, story_choices, story_nodes, stripe_customers, stripe_subscriptions, stripe_orders
    - This prevents re-evaluation of auth functions for each row, improving query performance

  2. Function Security
    - Fix `create_user_profile_on_signup` function search path mutability

  3. Index Management
    - Unused indexes are noted but retained as they may become useful with scale
    - These indexes don't harm performance and provide optimization for future queries

  4. Password Protection
    - Note: Leaked password protection should be enabled in Supabase Dashboard
    - This cannot be configured via SQL migration
*/

-- ============================================================================
-- Fix Stripe Table RLS Policies
-- ============================================================================

-- Drop and recreate stripe_customers policy
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()) AND deleted_at IS NULL);

-- Drop and recreate stripe_subscriptions policy
DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- Drop and recreate stripe_orders policy
DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = (SELECT auth.uid()) AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- ============================================================================
-- Fix Story Tables RLS Policies
-- ============================================================================

-- Fix stories update policy
DROP POLICY IF EXISTS "Service role can update stories" ON stories;
CREATE POLICY "Service role can update stories"
  ON stories
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NULL);

-- Fix story_nodes insert policy
DROP POLICY IF EXISTS "Service role can insert nodes" ON story_nodes;
CREATE POLICY "Service role can insert nodes"
  ON story_nodes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NULL);

-- Fix story_nodes update policy
DROP POLICY IF EXISTS "Service role can update nodes" ON story_nodes;
CREATE POLICY "Service role can update nodes"
  ON story_nodes
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NULL);

-- Fix story_choices insert policy
DROP POLICY IF EXISTS "Service role can insert choices" ON story_choices;
CREATE POLICY "Service role can insert choices"
  ON story_choices
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NULL);

-- Fix story_choices update policy
DROP POLICY IF EXISTS "Service role can update choices" ON story_choices;
CREATE POLICY "Service role can update choices"
  ON story_choices
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) IS NULL)
  WITH CHECK ((SELECT auth.uid()) IS NULL);

-- ============================================================================
-- Fix Function Security (Search Path Mutability)
-- ============================================================================

-- Drop and recreate the user profile creation function with stable search path
DROP FUNCTION IF EXISTS create_user_profile_on_signup() CASCADE;

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    username,
    full_name,
    avatar_url,
    subscription_tier,
    stories_generated_this_month,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'free',
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

-- ============================================================================
-- Update Views to Use Optimized Auth Functions
-- ============================================================================

-- Recreate stripe_user_subscriptions view with optimized auth function calls
CREATE OR REPLACE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = (SELECT auth.uid())
AND c.deleted_at IS NULL
AND (s.deleted_at IS NULL OR s.deleted_at IS NOT NULL);

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- Recreate stripe_user_orders view with optimized auth function calls
CREATE OR REPLACE VIEW stripe_user_orders WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = (SELECT auth.uid())
AND c.deleted_at IS NULL
AND (o.deleted_at IS NULL OR o.deleted_at IS NOT NULL);

GRANT SELECT ON stripe_user_orders TO authenticated;
