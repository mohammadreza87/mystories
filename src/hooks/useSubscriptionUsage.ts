import { useState, useEffect, useCallback } from 'react';
import { getSubscriptionUsage, SubscriptionUsage } from '../lib/subscriptionService';

interface UseSubscriptionUsageResult {
  usage: SubscriptionUsage | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  canGenerate: boolean;
  remainingStories: number | 'unlimited';
}

export function useSubscriptionUsage(userId: string | undefined): UseSubscriptionUsageResult {
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadUsage = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptionUsage(userId);
      setUsage(data);
    } catch (err) {
      console.error('Error loading subscription usage:', err);
      setError(err instanceof Error ? err : new Error('Failed to load usage'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const canGenerate = usage?.canGenerate ?? false;
  const remainingStories = usage?.isPro || usage?.isGrandfathered
    ? 'unlimited'
    : Math.max(0, (usage?.dailyLimit ?? 1) - (usage?.storiesGeneratedToday ?? 0));

  return {
    usage,
    loading,
    error,
    refresh: loadUsage,
    canGenerate,
    remainingStories,
  };
}
