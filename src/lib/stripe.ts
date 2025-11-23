import { supabase } from './supabase';

interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  mode: 'subscription' | 'payment';
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  mode
}: CreateCheckoutSessionParams): Promise<CheckoutSessionResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      mode
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
}

export async function getSubscription() {
  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}