/**
 * Subscription store using Zustand.
 * Manages subscription state and usage limits.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { config } from '../config';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionUsage {
  storiesGeneratedToday: number;
  lastGenerationDate: string | null;
  totalStoriesGenerated: number;
}

interface SubscriptionState {
  // State
  tier: SubscriptionTier;
  status: string;
  isGrandfathered: boolean;
  usage: SubscriptionUsage;
  loading: boolean;

  // Computed
  canGenerateStory: () => boolean;
  remainingStories: () => number;

  // Actions
  setTier: (tier: SubscriptionTier) => void;
  fetchSubscription: (userId: string) => Promise<void>;
  incrementUsage: () => void;
  resetDailyUsage: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  status: 'active',
  isGrandfathered: false,
  usage: {
    storiesGeneratedToday: 0,
    lastGenerationDate: null,
    totalStoriesGenerated: 0,
  },
  loading: false,

  canGenerateStory: () => {
    const { tier, isGrandfathered, usage } = get();

    // Pro users and grandfathered users have unlimited
    if (tier === 'pro' || isGrandfathered) {
      return true;
    }

    // Check if we need to reset daily count (new day)
    const today = new Date().toISOString().split('T')[0];
    if (usage.lastGenerationDate !== today) {
      return true; // New day, can generate
    }

    // Free users: check daily limit
    return usage.storiesGeneratedToday < config.limits.free.storiesPerDay;
  },

  remainingStories: () => {
    const { tier, isGrandfathered, usage } = get();

    if (tier === 'pro' || isGrandfathered) {
      return Infinity;
    }

    const today = new Date().toISOString().split('T')[0];
    if (usage.lastGenerationDate !== today) {
      return config.limits.free.storiesPerDay;
    }

    return Math.max(0, config.limits.free.storiesPerDay - usage.storiesGeneratedToday);
  },

  setTier: (tier) => set({ tier }),

  fetchSubscription: async (userId: string) => {
    set({ loading: true });

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          subscription_tier,
          subscription_status,
          is_grandfathered,
          stories_generated_today,
          last_generation_date,
          total_stories_generated
        `)
        .eq('id', userId)
        .single();

      if (profile) {
        set({
          tier: profile.subscription_tier as SubscriptionTier,
          status: profile.subscription_status,
          isGrandfathered: profile.is_grandfathered,
          usage: {
            storiesGeneratedToday: profile.stories_generated_today,
            lastGenerationDate: profile.last_generation_date,
            totalStoriesGenerated: profile.total_stories_generated,
          },
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  incrementUsage: () => {
    const today = new Date().toISOString().split('T')[0];

    set((state) => ({
      usage: {
        ...state.usage,
        storiesGeneratedToday: state.usage.lastGenerationDate === today
          ? state.usage.storiesGeneratedToday + 1
          : 1,
        lastGenerationDate: today,
        totalStoriesGenerated: state.usage.totalStoriesGenerated + 1,
      },
    }));
  },

  resetDailyUsage: () => {
    set((state) => ({
      usage: {
        ...state.usage,
        storiesGeneratedToday: 0,
        lastGenerationDate: new Date().toISOString().split('T')[0],
      },
    }));
  },
}));
