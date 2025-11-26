import { useState, useEffect } from 'react';
import { Crown, Sparkles, Zap, Check, ArrowLeft, Settings, Loader } from 'lucide-react';
import { getUserSubscription, createCheckoutSession, createCustomerPortalSession, STRIPE_PRICES } from '../lib/subscriptionService';
import type { UserProfile } from '../lib/types';
import { useAuth } from '../lib/authContext';
import { useToast } from './Toast';

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
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

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

  const handleUpgrade = async (priceId: string) => {
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

  const hasPro = subscription?.subscription_tier === 'pro' || subscription?.is_grandfathered;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {hasPro ? 'Your Subscription' : 'Upgrade to Pro'}
          </h1>
          <p className="text-gray-600 text-lg">
            {hasPro
              ? 'Manage your premium membership'
              : 'Unlock unlimited story creation and premium features'}
          </p>
        </div>

        {hasPro ? (
          <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro Membership</h2>
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
                <span className="text-gray-600">Stories Generated Today</span>
                <span className="font-semibold text-gray-900">Unlimited</span>
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Unlimited Stories</h3>
                <p className="text-gray-600">
                  Generate unlimited interactive stories every day without any restrictions
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Priority Processing</h3>
                <p className="text-gray-600">
                  Faster story generation with priority access to our AI processing queue
                </p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Premium Features</h3>
                <p className="text-gray-600">
                  Get access to all current and future premium features as they launch
                </p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    selectedPlan === 'monthly'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setSelectedPlan('annual')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all relative ${
                    selectedPlan === 'annual'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Annual
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                    Save $40
                  </span>
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-3xl p-8 border-2 border-blue-200 mb-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    ${selectedPlan === 'monthly' ? '20' : '200'}
                  </div>
                  <div className="text-gray-600 mb-1">
                    per {selectedPlan === 'monthly' ? 'month' : 'year'}
                  </div>
                  {selectedPlan === 'annual' && (
                    <div className="text-sm text-green-600 font-medium">
                      Just $16.67/month billed annually
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() =>
                  handleUpgrade(
                    selectedPlan === 'monthly'
                      ? STRIPE_PRICES.PRO_MONTHLY
                      : STRIPE_PRICES.PRO_ANNUAL
                  )
                }
                disabled={checkoutLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-5 rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 text-lg"
              >
                {checkoutLoading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="w-6 h-6" />
                    Upgrade to Pro
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Cancel anytime. Secure payment via Stripe.
              </p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                Everything included:
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  'Unlimited story generations',
                  'Priority processing queue',
                  'All current features',
                  'Future premium features',
                  'Cancel anytime',
                  'Email support',
                  'No hidden fees',
                  'Secure payments via Stripe',
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 bg-gray-50 rounded-2xl p-6">
              <h4 className="font-semibold text-gray-900 mb-3">Current Plan: Free</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Stories per day:</span>
                  <span className="font-semibold text-gray-900">
                    {subscription?.stories_generated_today || 0} / 1
                  </span>
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
