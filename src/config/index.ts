import { getConfig as getEnvConfig } from '../lib/env';

/**
 * Centralized configuration for the MyStories application.
 * Uses a single, validated environment source to avoid duplicated config definitions.
 */

const env = getEnvConfig();

// App configuration
export const config = {
  // Supabase
  supabase: {
    url: env.supabase.url,
    anonKey: env.supabase.anonKey,
    functionsUrl: `${env.supabase.url}/functions/v1`,
  },

  // Stripe
  stripe: {
    publishableKey: env.stripe.publishableKey,
  },

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

  env: {
    isDev: env.isDev,
    isProd: env.isProd,
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

// Type exports for external use
export type Config = typeof config;
export type SubscriptionTier = 'free' | 'pro';
