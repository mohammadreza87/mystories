import React from 'react';
import { Crown, Calendar, CreditCard } from 'lucide-react';
import { getProductByPriceId, formatPrice } from '../../stripe-config';

interface SubscriptionData {
  subscription_status: string;
  price_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  payment_method_brand: string | null;
  payment_method_last4: string | null;
}

interface SubscriptionStatusProps {
  subscription: SubscriptionData | null;
  loading?: boolean;
}

export function SubscriptionStatus({ subscription, loading }: SubscriptionStatusProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.subscription_status === 'not_started') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
            <Crown className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Free Plan</h3>
            <p className="text-sm text-gray-600">1 story per day</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Upgrade to Pro for unlimited story generation and premium features.
        </p>
      </div>
    );
  }

  const product = subscription.price_id ? getProductByPriceId(subscription.price_id) : null;
  const isActive = subscription.subscription_status === 'active';
  const periodEnd = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
    : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'past_due':
        return 'text-yellow-600 bg-yellow-100';
      case 'canceled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
            isActive ? 'bg-blue-100' : 'bg-gray-100'
          }`}>
            <Crown className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {product?.name || 'Pro Plan'}
            </h3>
            {product && (
              <p className="text-sm text-gray-600">
                {formatPrice(product.price, product.currency)}/{product.name.includes('Yearly') ? 'year' : 'month'}
              </p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.subscription_status)}`}>
          {subscription.subscription_status.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div className="space-y-3">
        {periodEnd && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on {periodEnd}
            </span>
          </div>
        )}

        {subscription.payment_method_brand && subscription.payment_method_last4 && (
          <div className="flex items-center text-sm text-gray-600">
            <CreditCard className="w-4 h-4 mr-2" />
            <span>
              {subscription.payment_method_brand.toUpperCase()} ending in {subscription.payment_method_last4}
            </span>
          </div>
        )}

        {subscription.cancel_at_period_end && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your subscription will not renew and will end on {periodEnd}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}