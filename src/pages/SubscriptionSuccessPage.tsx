import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SubscriptionSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }
      await fetchSubscription();
    };

    checkAuth();
  }, [navigate]);

  const fetchSubscription = async () => {
    try {
      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data, error } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
      } else {
        setSubscription(data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Pro!
          </h1>
          <p className="text-gray-600">
            Your subscription has been activated successfully.
          </p>
        </div>

        {loading ? (
          <div className="mb-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        ) : subscription && subscription.subscription_status === 'active' ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              🎉 You now have unlimited story generation!
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              Your subscription is being processed. This may take a few minutes.
            </p>
          </div>
        )}

        <div className="space-y-3 mb-8">
          <div className="flex items-center justify-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            Unlimited story generation
          </div>
          <div className="flex items-center justify-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            AI-generated illustrations
          </div>
          <div className="flex items-center justify-center text-sm text-gray-600">
            <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
            Text-to-speech narration
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            Start Creating Stories
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
          
          <button
            onClick={() => navigate('/subscription')}
            className="w-full text-gray-600 hover:text-gray-900 py-2 px-4 rounded-lg font-medium transition-colors"
          >
            View Subscription Details
          </button>
        </div>
      </div>
    </div>
  );
}