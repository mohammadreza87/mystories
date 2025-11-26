/**
 * Rate limiting utilities for edge functions.
 * Uses database-backed rate limiting with sliding window approach.
 */

import { createServiceClient } from './auth.ts';
import { errors } from './response.ts';

/**
 * Rate limit configuration for each endpoint.
 */
interface RateLimitConfig {
  endpoint: string;
  freeLimit: number;
  proLimit: number;
  windowMinutes: number;
}

/**
 * Rate limit check result.
 */
interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

/**
 * Default rate limit configurations.
 */
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  'generate-story': { endpoint: 'generate-story', freeLimit: 5, proLimit: 50, windowMinutes: 60 },
  'generate-image': { endpoint: 'generate-image', freeLimit: 20, proLimit: 200, windowMinutes: 60 },
  'text-to-speech': { endpoint: 'text-to-speech', freeLimit: 30, proLimit: 300, windowMinutes: 60 },
  'generate-comic-chapter': { endpoint: 'generate-comic-chapter', freeLimit: 5, proLimit: 50, windowMinutes: 60 },
};

/**
 * Check if a user has exceeded their rate limit.
 *
 * @param userId - The user's ID
 * @param endpoint - The endpoint being rate limited
 * @param isPro - Whether the user has a pro subscription
 * @returns Rate limit result or null if check fails
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  isPro: boolean = false
): Promise<RateLimitResult | null> {
  try {
    const supabase = createServiceClient();

    // Get config for this endpoint
    const config = DEFAULT_CONFIGS[endpoint];
    if (!config) {
      console.warn(`No rate limit config for endpoint: ${endpoint}`);
      return null;
    }

    const maxRequests = isPro ? config.proLimit : config.freeLimit;

    // Call the database function to check rate limit
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: config.windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request (fail open)
      return null;
    }

    return {
      allowed: data.allowed,
      current: data.current,
      limit: data.limit,
      remaining: data.remaining,
      resetAt: data.reset_at,
    };
  } catch (err) {
    console.error('Rate limit error:', err);
    // On error, allow the request (fail open)
    return null;
  }
}

/**
 * Check if a user is a pro subscriber.
 */
export async function isProUser(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('user_profiles')
      .select('subscription_tier, is_grandfathered')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.subscription_tier === 'pro' || data.is_grandfathered === true;
  } catch (err) {
    console.error('Error checking pro status:', err);
    return false;
  }
}

/**
 * Enforce rate limit and return an error response if exceeded.
 *
 * @param userId - The user's ID
 * @param endpoint - The endpoint being rate limited
 * @returns null if allowed, Response if rate limited
 */
export async function enforceRateLimit(
  userId: string,
  endpoint: string
): Promise<Response | null> {
  const isPro = await isProUser(userId);
  const result = await checkRateLimit(userId, endpoint, isPro);

  // If check failed, allow the request
  if (!result) {
    return null;
  }

  if (!result.allowed) {
    return errors.rateLimited(
      `Rate limit exceeded. You have made ${result.current} requests in the current window. ` +
      `Limit: ${result.limit} requests per hour. ` +
      `Try again after ${new Date(result.resetAt).toLocaleTimeString()}.`,
      {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt,
      }
    );
  }

  return null;
}

/**
 * Get rate limit headers for a successful response.
 */
export async function getRateLimitHeaders(
  userId: string,
  endpoint: string
): Promise<Record<string, string>> {
  const isPro = await isProUser(userId);
  const result = await checkRateLimit(userId, endpoint, isPro);

  if (!result) {
    return {};
  }

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt,
  };
}
