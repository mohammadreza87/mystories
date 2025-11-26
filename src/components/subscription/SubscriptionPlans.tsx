import { useState } from 'react';
import { Check, Crown, Zap, Shield, Sparkles } from 'lucide-react';
import { plans, formatPrice, BillingCycle, getPriceId } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';

interface SubscriptionPlansProps {
  currentPlan?: string;
  onSubscriptionChange?: () => void;
}

export function SubscriptionPlans({ currentPlan, onSubscriptionChange }: SubscriptionPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const handleSubscribe = async (planId: string) => {
    const priceId = getPriceId(planId as any, billingCycle);
    if (!priceId) {
      console.warn('Missing Stripe price ID for plan', planId, billingCycle);
      return;
    }

    setLoading(priceId);
    try {
      const { url } = await createCheckoutSession({
        priceId,
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription`,
        mode: 'subscription'
      });
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
    } finally {
      setLoading(null);
      onSubscriptionChange?.();
    }
  };

  const isCurrentPlan = (priceId: string) => currentPlan === priceId;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">Pick the plan that matches your storytelling needs</p>
        <div className="inline-flex mt-4 bg-gray-100 rounded-full p-1">
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-full ${
              billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-2 text-sm font-semibold rounded-full ${
              billingCycle === 'annual' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
            onClick={() => setBillingCycle('annual')}
          >
            Annual <span className="text-green-600 ml-1">(Save)</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {plans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual;
          const priceId = getPriceId(plan.id, billingCycle);
          const isFree = plan.id === 'free';
          const isCurrentUserPlan = isCurrentPlan(priceId);
          
          return (
            <div
              key={`${plan.id}-${billingCycle}`}
              className={`relative bg-white rounded-2xl shadow-xl p-8 ${
                isCurrentUserPlan ? 'ring-2 ring-green-500' : plan.badge ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {isCurrentUserPlan ? (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Current Plan
                  </span>
                </div>
              ) : plan.badge ? (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {plan.id === 'max' ? (
                    <Shield className="w-12 h-12 text-purple-600" />
                  ) : plan.id === 'pro' ? (
                    <Crown className="w-12 h-12 text-yellow-500" />
                  ) : plan.id === 'basic' ? (
                    <Zap className="w-12 h-12 text-blue-500" />
                  ) : (
                    <Sparkles className="w-12 h-12 text-gray-500" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {isFree ? '€0' : formatPrice(price, 'eur')}
                  {!isFree && (
                    <span className="text-lg font-normal text-gray-600">
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  )}
                </div>
                {billingCycle === 'annual' && !isFree && (
                  <p className="text-green-600 font-medium">
                    {formatPrice(plan.price.annual / 12, 'eur')}/mo billed annually
                  </p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <Check className="w-5 h-5 text-green-500 mr-3" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((limitation) => (
                  <li key={limitation} className="flex items-center text-gray-500 line-through">
                    <Check className="w-5 h-5 text-gray-300 mr-3" />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>

              {!isFree && (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === priceId || isCurrentUserPlan}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                    isCurrentUserPlan
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === priceId
                    ? 'Processing...'
                    : isCurrentUserPlan
                    ? 'Current Plan'
                    : `Subscribe to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <p className="text-gray-600">
          All plans include a 30-day money-back guarantee. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
