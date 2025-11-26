/**
 * Centralized application configuration.
 *
 * All environment variables and app settings should be accessed through this module.
 * Uses the env validation module for type-safe, validated access.
 */

import { getConfig as getEnvConfig } from './lib/env';

// Get validated configuration (throws on missing required vars)
const envConfig = getEnvConfig();

export const config = {
  // Supabase configuration
  supabase: {
    url: envConfig.supabase.url,
    anonKey: envConfig.supabase.anonKey,
    functionsUrl: `${envConfig.supabase.url}/functions/v1`,
  },

  // Stripe configuration
  stripe: {
    publishableKey: envConfig.stripe.publishableKey,
  },

  // Environment flags
  isDev: envConfig.isDev,
  isProd: envConfig.isProd,

  // API Configuration
  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Feature flags
  features: {
    enableAudioNarration: true,
    enableImageGeneration: true,
    enableStreaming: true,
  },

  // Gamification settings
  gamification: {
    points: {
      readChapter: 10,
      completeStory: 50,
      createStory: 100,
      receiveLike: 5,
    },
    quests: {
      daily: {
        readChapters: { target: 2, reward: 10 },
        createStory: { target: 1, reward: 15 },
      },
      weekly: {
        completeStory: { target: 1, reward: 30 },
      },
    },
  },

  // Cache settings
  cache: {
    storyPrefix: 'mystories_cache_',
    duration: 1000 * 60 * 60 * 24, // 24 hours
  },

  // Story generation limits
  limits: {
    free: {
      storiesPerDay: 1,
    },
    pro: {
      storiesPerDay: Infinity,
    },
  },
} as const;

// Type exports
export type Config = typeof config;
export type SubscriptionTier = 'free' | 'pro';
