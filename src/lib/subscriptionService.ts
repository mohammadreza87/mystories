import { supabase } from './supabase';
import { config } from '../config';

export interface UserSubscription {
  subscription_tier: 'free' | 'pro';
  subscription_status: string;
  is_grandfathered: boolean;
  stories_generated_today: number;
  total_stories_generated: number;
  last_generation_date: string | null;
  stripe_customer_id: string | null;
  total_points: number;
  reading_points: number;
  creating_points: number;
}

export interface SubscriptionUsage {
  tier: 'free' | 'basic' | 'pro' | 'max';
  isPro: boolean;
  isGrandfathered: boolean;
  storiesGeneratedToday: number;
  completionsToday: number;
  dailyLimit: number | null;
  completionLimit: number | null;
  hasUnlimited: boolean;
  canGenerate: boolean;
  canComplete: boolean;
  features: {
    audio: boolean;
    video: boolean;
  };
}

export const STRIPE_PRICES = {
  BASIC_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_BASIC_MONTHLY || '',
  BASIC_ANNUAL: import.meta.env.VITE_STRIPE_PRICE_BASIC_ANNUAL || '',
  PRO_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || '',
  PRO_ANNUAL: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL || '',
  MAX_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_MAX_MONTHLY || '',
  MAX_ANNUAL: import.meta.env.VITE_STRIPE_PRICE_MAX_ANNUAL || '',
};

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('subscription_tier, subscription_status, is_grandfathered, stories_generated_today, total_stories_generated, last_generation_date, stripe_customer_id, total_points, reading_points, creating_points')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching subscription:', error);
    return null;
  }

  return data as UserSubscription;
}

export async function getSubscriptionUsage(userId: string): Promise<SubscriptionUsage> {
  const subscription = await getUserSubscription(userId);

  const tierLimits = {
    free: { storiesPerDay: 1, completionsPerDay: 1, audio: false, video: false },
    basic: { storiesPerDay: 10, completionsPerDay: 10, audio: false, video: false },
    pro: { storiesPerDay: 20, completionsPerDay: 20, audio: true, video: false },
    max: { storiesPerDay: 40, completionsPerDay: 40, audio: true, video: true },
  } as const;

  const tier = (subscription?.subscription_tier as SubscriptionUsage['tier']) || 'free';
  const limits = tierLimits[tier] || tierLimits.free;
  const isPro = tier === 'pro' || tier === 'max';
  const hasUnlimited = tier === 'pro' || tier === 'max' || subscription?.is_grandfathered;
  const today = new Date().toISOString().split('T')[0];
  const isToday = subscription?.last_generation_date === today;
  const todayCount = isToday ? subscription?.stories_generated_today ?? 0 : 0;
  const dailyLimit = hasUnlimited ? null : limits.storiesPerDay;
  const completionLimit = hasUnlimited ? null : limits.completionsPerDay;
  const completionsToday = todayCount > limits.completionsPerDay ? limits.completionsPerDay : todayCount; // fallback; real completion tracking should come from backend

  return {
    tier,
    isPro,
    isGrandfathered: subscription?.is_grandfathered ?? false,
    storiesGeneratedToday: todayCount,
    completionsToday,
    dailyLimit,
    completionLimit,
    hasUnlimited,
    canGenerate: hasUnlimited || todayCount < (dailyLimit ?? 0),
    canComplete: hasUnlimited || completionsToday < (completionLimit ?? 0),
    features: {
      audio: limits.audio || hasUnlimited,
      video: limits.video && (tier === 'max'),
    },
  };
}

export async function createCheckoutSession(priceId: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}?checkout=success`,
          cancelUrl: `${window.location.origin}?checkout=canceled`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return null;
  }
}

export async function createCustomerPortalSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/customer-portal`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.origin,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create portal session');
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error creating portal session:', error);
    return null;
  }
}
