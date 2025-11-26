import { useState, useEffect } from 'react';
import { Crown, Sparkles, Zap, Check, ArrowLeft, Settings, Loader, Shield } from 'lucide-react';
import { getUserSubscription, createCheckoutSession, createCustomerPortalSession } from '../lib/subscriptionService';
import type { UserProfile } from '../lib/types';
import { useAuth } from '../lib/authContext';
import { useToast } from './Toast';
import { plans, formatPrice, BillingCycle, getPriceId } from '../stripe-config';
import { SEO, generateSubscriptionSchema } from './SEO';

interface SubscriptionProps {
  userId: string;
  onBack: () => void;
}

export function Subscription({ userId, onBack }: SubscriptionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [subscription, setSubscription] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const loadSubscription = async () => {
    if (!user) return;

    try {
      const data = await getUserSubscription(user.id);
      if (data) {
        setSubscription(data as any);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    const priceId = getPriceId(planId as any, billingCycle);
    if (!priceId || priceId.includes('your_') || priceId.includes('_here')) {
      showToast('Stripe is not configured. Please check your API keys.', 'error');
      return;
    }

    setCheckoutLoading(true);
    try {
      const url = await createCheckoutSession(priceId);
      if (url) {
        window.location.href = url;
      } else {
        showToast('Failed to start checkout. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      showToast('Checkout failed. Please try again.', 'error');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    const url = await createCustomerPortalSession();
    if (url) {
      window.location.href = url;
    } else {
      showToast('Unable to open subscription management. Please try again.', 'error');
    }
  };

  const activeTier = subscription?.subscription_tier || 'free';
  const hasPaidAccess = activeTier !== 'free' || subscription?.is_grandfathered;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const subscriptionSchema = generateSubscriptionSchema();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <SEO
        title="Subscription Plans"
        description="Upgrade to Next Tale Pro or Creator for unlimited story creation, priority processing, audio narration, and premium features. Plans starting at €9.99/month."
        url="/subscription"
        type="product"
        keywords={['subscription', 'pricing', 'pro plan', 'premium features', 'unlimited stories']}
        schema={subscriptionSchema}
        noindex={true}
      />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <nav className="mb-6" aria-label="Back navigation">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Back</span>
          </button>
        </nav>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {hasPaidAccess ? 'Your Subscription' : 'Choose Your Plan'}
          </h1>
          <p className="text-gray-600 text-lg">
            {hasPaidAccess
              ? 'Manage your premium membership'
              : 'Unlock the right mix of speed, editing, and premium features'}
          </p>
        </div>

        {hasPaidAccess ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium Membership</h2>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  <span>Active {subscription?.is_grandfathered && '(Lifetime)'}</span>
                </div>
              </div>
              <Sparkles className="w-12 h-12 text-yellow-500" />
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">Status</span>
                <span className="font-semibold text-green-600 capitalize">
                  {subscription?.subscription_status}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">Total Stories Created</span>
                <span className="font-semibold text-gray-900">{subscription?.total_stories_generated || 0}</span>
              </div>
              {subscription?.subscription_period_end && !subscription?.is_grandfathered && (
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <span className="text-gray-600">Renewal Date</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(subscription.subscription_period_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {!subscription?.is_grandfathered && subscription?.stripe_customer_id && (
              <button
                onClick={handleManageSubscription}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Manage Subscription
              </button>
            )}

            {subscription?.is_grandfathered && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                <p className="text-sm text-gray-700 text-center">
                  🎉 You have lifetime Pro access as an early supporter. Thank you!
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Flexible Story Limits</h3>
                <p className="text-gray-600">
                  Start with 1/day on Free, scale to unlimited with Pro and Creator
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Priority Processing</h3>
                <p className="text-gray-600">
                  Faster generation as you move up tiers (2x on Starter, more on higher tiers)
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Features</h3>
                <p className="text-gray-600">
                  Unlock editing, audio, custom images, downloads, video, and more
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  billingCycle === 'annual'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annual
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {plans
                .filter((p) => p.id !== 'free')
                .map((plan) => {
                  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual;
                  const priceId = getPriceId(plan.id, billingCycle);
                  return (
                    <div key={`${plan.id}-${billingCycle}`} className="bg-white rounded-3xl shadow-xl p-8">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                          <p className="text-gray-600">{plan.description}</p>
                        </div>
                        {plan.id === 'creator' ? (
                          <Shield className="w-10 h-10 text-purple-600" />
                        ) : plan.id === 'pro' ? (
                          <Crown className="w-10 h-10 text-yellow-500" />
                        ) : (
                          <Zap className="w-10 h-10 text-blue-500" />
                        )}
                      </div>
                    <div className="text-4xl font-bold text-gray-900 mb-2">
                        {formatPrice(price, 'eur')}
                        <span className="text-lg font-normal text-gray-600">
                          /{billingCycle === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>
                      {billingCycle === 'annual' && (
                        <p className="text-sm text-green-600 font-medium mb-4">
                          {formatPrice(plan.price.annual / 12, 'eur')}/mo billed annually
                        </p>
                      )}
                      <ul className="space-y-2 mb-6">
                        {plan.features.slice(0, 5).map((feature) => (
                          <li key={feature} className="flex items-center text-sm text-gray-700">
                            <Check className="w-4 h-4 text-green-500 mr-2" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={checkoutLoading || !priceId}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                      >
                        {checkoutLoading ? 'Processing...' : `Upgrade to ${plan.name}`}
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="mt-8 bg-gray-50 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Current Plan: Free</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Stories per day:</span>
                  <span className="font-semibold text-gray-900">1 / 1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total stories created:</span>
                  <span className="font-semibold text-gray-900">
                    {subscription?.total_stories_generated || 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
