/**
 * Application configuration.
 * Centralizes all environment variables and configuration settings.
 * Uses the env validation module for type-safe access.
 */

import { getConfig } from './lib/env';

// Get validated configuration (throws on missing required vars)
const envConfig = getConfig();

export const config = {
  supabase: {
    url: envConfig.supabase.url,
    anonKey: envConfig.supabase.anonKey,
  },
  stripe: {
    publishableKey: envConfig.stripe.publishableKey,
  },
  isDev: envConfig.isDev,
  isProd: envConfig.isProd,
} as const;
