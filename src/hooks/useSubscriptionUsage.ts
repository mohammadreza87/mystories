import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscriptionUsage, SubscriptionUsage } from '../lib/subscriptionService';
import { queryKeys } from '../lib/queryClient';

interface UseSubscriptionUsageResult {
  usage: SubscriptionUsage | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  canGenerate: boolean;
  canComplete: boolean;
  remainingStories: number | 'unlimited';
  features: SubscriptionUsage['features'] | null;
}

export function useSubscriptionUsage(userId: string | undefined): UseSubscriptionUsageResult {
  const queryClient = useQueryClient();

  const { data: usage, isLoading, error } = useQuery({
    queryKey: queryKeys.subscriptionUsage(userId || ''),
    queryFn: () => getSubscriptionUsage(userId!),
    enabled: !!userId,
    // Usage data should refresh more frequently
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const refresh = async () => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.subscriptionUsage(userId) });
    }
  };

  const canGenerate = usage?.canGenerate ?? false;
  const canComplete = usage?.canComplete ?? false;
  const remainingStories = usage?.hasUnlimited
    ? 'unlimited'
    : Math.max(
        0,
        (typeof usage?.dailyLimit === 'number' ? usage.dailyLimit : 0) -
          (usage?.storiesGeneratedToday ?? 0)
      );

  return {
    usage: usage ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
    canGenerate,
    canComplete,
    remainingStories,
    features: usage?.features ?? null,
  };
}
