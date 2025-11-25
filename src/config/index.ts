/**
 * Centralized configuration for the MyStories application.
 * All environment variables and app settings should be accessed through this module.
 */

// Environment variable validation
function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string = ''): string {
  return import.meta.env[key] || defaultValue;
}

// App configuration
export const config = {
  // Supabase
  supabase: {
    url: requireEnv('VITE_SUPABASE_URL'),
    anonKey: requireEnv('VITE_SUPABASE_ANON_KEY'),
    functionsUrl: `${requireEnv('VITE_SUPABASE_URL')}/functions/v1`,
  },

  // Stripe
  stripe: {
    publishableKey: optionalEnv('VITE_STRIPE_PUBLISHABLE_KEY'),
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
