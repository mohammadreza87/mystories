import { X, Sparkles, Zap, Crown, Shield } from 'lucide-react';
import { useState } from 'react';
import { createCheckoutSession } from '../lib/subscriptionService';
import { useToast } from './Toast';
import { plans, formatPrice, BillingCycle, getPriceId } from '../stripe-config';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  if (!isOpen) return null;

  const handleUpgrade = async (planId: string) => {
    const priceId = getPriceId(planId as any, billingCycle);
    if (!priceId) {
      showToast('Stripe price not configured for this plan.', 'error');
      return;
    }

    setLoading(true);
    try {
      const url = await createCheckoutSession(priceId);
      if (url) {
        window.location.href = url;
      } else {
        showToast('Failed to start checkout. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Unlock Premium Story Creation
            </h3>
            <p className="text-gray-600">
              Choose the plan that fits your speed, editing, and premium needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <Sparkles className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Unlimited Stories</h4>
              <p className="text-sm text-gray-600">
                Generate unlimited interactive stories every day
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <Zap className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Priority Generation</h4>
              <p className="text-sm text-gray-600">
                Faster story generation with priority processing
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <Crown className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Premium Features</h4>
              <p className="text-sm text-gray-600">
                Access to all future premium features
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                  billingCycle === 'annual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Annual
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save $40
                </span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {plans
                .filter((p) => p.id !== 'free')
                .map((plan) => {
                  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.annual;
                  const icon =
                    plan.id === 'creator'
                      ? <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      : plan.id === 'pro'
                        ? <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        : <Zap className="w-8 h-8 text-blue-600 mx-auto mb-2" />;
                  return (
                    <div key={`${plan.id}-${billingCycle}`} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-200">
                      <div className="text-center space-y-2">
                        {icon}
                        <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                        <div className="text-3xl font-bold text-gray-900">
                          {formatPrice(price, 'usd')}
                          <span className="text-sm font-normal text-gray-600 ml-1">
                            /{billingCycle === 'annual' ? 'year' : 'month'}
                          </span>
                        </div>
                        {billingCycle === 'annual' && (
                          <div className="text-xs text-green-600 font-medium">
                            {formatPrice(plan.price.annual / 12, 'usd')}/mo billed annually
                          </div>
                        )}
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={loading || !getPriceId(plan.id, billingCycle)}
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow"
                        >
                          {loading ? 'Processing...' : `Upgrade to ${plan.name}`}
                        </button>
                        <ul className="text-xs text-gray-600 mt-3 space-y-1 text-left">
                          {plan.features.slice(0, 4).map((feature) => (
                            <li key={feature} className="flex items-start">
                              <span className="text-green-500 mr-1">✓</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h4 className="font-semibold text-gray-900 mb-3 text-center">
              What's included:
            </h4>
            <ul className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Unlimited story generations
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Priority processing queue
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                All current features
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Future premium features
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Cancel anytime
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                Email support
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
