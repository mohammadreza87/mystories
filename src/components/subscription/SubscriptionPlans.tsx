import React, { useState } from 'react';
import { Check, Crown, Zap } from 'lucide-react';
import { stripeProducts, formatPrice } from '../../stripe-config';
import { createCheckoutSession } from '../../lib/stripe';

interface SubscriptionPlansProps {
  currentPlan?: string;
  onSubscriptionChange?: () => void;
}

export function SubscriptionPlans({ currentPlan, onSubscriptionChange }: SubscriptionPlansProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string) => {
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
    }
  };

  const isCurrentPlan = (priceId: string) => currentPlan === priceId;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-xl text-gray-600">Unlock unlimited story generation with our Pro plans</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {stripeProducts.map((product) => {
          const isYearly = product.name.includes('Yearly');
          const isCurrentUserPlan = isCurrentPlan(product.priceId);
          
          return (
            <div
              key={product.priceId}
              className={`relative bg-white rounded-2xl shadow-xl p-8 ${
                isCurrentUserPlan ? 'ring-2 ring-green-500' : isYearly ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {isCurrentUserPlan ? (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    Current Plan
                  </span>
                </div>
              ) : isYearly ? (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              ) : null}

              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {isYearly ? (
                    <Crown className="w-12 h-12 text-yellow-500" />
                  ) : (
                    <Zap className="w-12 h-12 text-blue-500" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h3>
                <p className="text-gray-600 mb-4">{product.description}</p>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {formatPrice(product.price, product.currency)}
                  <span className="text-lg font-normal text-gray-600">
                    /{isYearly ? 'year' : 'month'}
                  </span>
                </div>
                {isYearly && (
                  <p className="text-green-600 font-medium">Save €40 per year!</p>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Unlimited story generation</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>AI-generated illustrations</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Text-to-speech narration</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Multiple language support</span>
                </li>
                <li className="flex items-center">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  <span>Priority support</span>
                </li>
              </ul>

              <button
                onClick={() => handleSubscribe(product.priceId)}
                disabled={loading === product.priceId || isCurrentUserPlan}
                className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
                  isCurrentUserPlan
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : isYearly
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === product.priceId
                  ? 'Processing...'
                  : isCurrentUserPlan
                  ? 'Current Plan'
                  : `Subscribe to ${product.name}`}
              </button>
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