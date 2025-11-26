/*
  # Add Rate Limiting System

  Creates infrastructure for rate limiting API requests to Edge Functions.

  ## Tables
  - `rate_limits`: Tracks request counts per user per endpoint

  ## Functions
  - `check_rate_limit`: Checks if a user has exceeded their rate limit
  - `cleanup_old_rate_limits`: Removes expired rate limit records

  ## Rate Limit Configuration
  - Free users: Lower limits
  - Pro users: Higher limits
  - Configurable per endpoint
*/

-- ============================================================================
-- RATE LIMITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint
  ON rate_limits(user_id, endpoint, window_start);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON rate_limits(window_start);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON rate_limits FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Service role can manage all rate limits
CREATE POLICY "Service role full access to rate_limits"
  ON rate_limits FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- RATE LIMIT CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count integer;
  v_is_allowed boolean;
  v_remaining integer;
BEGIN
  -- Calculate window start (floor to the nearest window)
  v_window_start := date_trunc('hour', now()) +
    (floor(extract(minute from now()) / p_window_minutes) * p_window_minutes) * interval '1 minute';

  -- Try to increment existing record or insert new one
  INSERT INTO rate_limits (user_id, endpoint, request_count, window_start)
  VALUES (p_user_id, p_endpoint, 1, v_window_start)
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Check if within limit
  v_is_allowed := v_current_count <= p_max_requests;
  v_remaining := GREATEST(0, p_max_requests - v_current_count);

  -- If not allowed, decrement the count (we already incremented it)
  IF NOT v_is_allowed THEN
    UPDATE rate_limits
    SET request_count = request_count - 1
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND window_start = v_window_start;
  END IF;

  RETURN jsonb_build_object(
    'allowed', v_is_allowed,
    'current', v_current_count,
    'limit', p_max_requests,
    'remaining', v_remaining,
    'reset_at', v_window_start + (p_window_minutes * interval '1 minute')
  );
END;
$$;

-- ============================================================================
-- CLEANUP FUNCTION (run periodically via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM rate_limits
  WHERE window_start < now() - interval '2 hours'
  RETURNING 1 INTO v_deleted_count;

  RETURN COALESCE(v_deleted_count, 0);
END;
$$;

-- ============================================================================
-- RATE LIMIT CONFIGURATION TABLE (optional, for dynamic config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text UNIQUE NOT NULL,
  free_limit integer NOT NULL DEFAULT 10,
  pro_limit integer NOT NULL DEFAULT 100,
  window_minutes integer NOT NULL DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default configurations
INSERT INTO rate_limit_config (endpoint, free_limit, pro_limit, window_minutes)
VALUES
  ('generate-story', 5, 50, 60),
  ('generate-image', 20, 200, 60),
  ('text-to-speech', 30, 300, 60),
  ('generate-comic-chapter', 5, 50, 60)
ON CONFLICT (endpoint) DO NOTHING;

-- Enable RLS
ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read config
CREATE POLICY "Anyone can read rate limit config"
  ON rate_limit_config FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can modify
CREATE POLICY "Service role can modify rate limit config"
  ON rate_limit_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
