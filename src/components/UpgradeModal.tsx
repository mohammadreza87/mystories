import { X, Sparkles, Zap, Crown } from 'lucide-react';
import { useState } from 'react';
import { createCheckoutSession, STRIPE_PRICES } from '../lib/subscriptionService';
import { useToast } from './Toast';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');

  if (!isOpen) return null;

  const handleUpgrade = async (priceId: string) => {
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
              Unlock Unlimited Story Creation
            </h3>
            <p className="text-gray-600">
              Create as many magical stories as your imagination allows
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
                onClick={() => setSelectedPlan('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedPlan === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setSelectedPlan('annual')}
                className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                  selectedPlan === 'annual'
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

            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border-2 border-blue-200">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-4xl font-bold text-gray-900">
                    ${selectedPlan === 'monthly' ? '20' : '200'}
                  </div>
                  <div className="text-gray-600">
                    per {selectedPlan === 'monthly' ? 'month' : 'year'}
                  </div>
                  {selectedPlan === 'annual' && (
                    <div className="text-sm text-green-600 font-medium mt-1">
                      Just $16.67/month billed annually
                    </div>
                  )}
                </div>

                <button
                  onClick={() =>
                    handleUpgrade(
                      selectedPlan === 'monthly'
                        ? STRIPE_PRICES.PRO_MONTHLY
                        : STRIPE_PRICES.PRO_ANNUAL
                    )
                  }
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? 'Processing...' : 'Upgrade to Pro'}
                </button>

                <p className="text-xs text-gray-500">
                  Cancel anytime. Secure payment via Stripe.
                </p>
              </div>
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
