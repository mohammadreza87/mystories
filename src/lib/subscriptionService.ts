import { supabase } from './supabase';

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
  tier: 'free' | 'pro';
  isGrandfathered: boolean;
  storiesGeneratedToday: number;
  dailyLimit: number | null;
  hasUnlimited: boolean;
  canGenerate: boolean;
}

export const STRIPE_PRICES = {
  PRO_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_MONTHLY || '',
  PRO_ANNUAL: import.meta.env.VITE_STRIPE_PRICE_ANNUAL || '',
};

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('profiles')
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

  if (!subscription) {
    return {
      tier: 'free',
      isGrandfathered: false,
      storiesGeneratedToday: 0,
      dailyLimit: 1,
      hasUnlimited: false,
      canGenerate: true,
    };
  }

  const hasPro = subscription.subscription_tier === 'pro' || subscription.is_grandfathered;
  const today = new Date().toISOString().split('T')[0];
  const isToday = subscription.last_generation_date === today;
  const todayCount = isToday ? subscription.stories_generated_today : 0;

  return {
    tier: subscription.subscription_tier,
    isGrandfathered: subscription.is_grandfathered,
    storiesGeneratedToday: todayCount,
    dailyLimit: hasPro ? null : 1,
    hasUnlimited: hasPro,
    canGenerate: hasPro || todayCount < 1,
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
