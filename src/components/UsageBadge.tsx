import { Crown, Sparkles } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useSubscriptionUsage } from '../hooks';

interface UsageBadgeProps {
  onUpgradeClick?: () => void;
}

export default function UsageBadge({ onUpgradeClick }: UsageBadgeProps) {
  const { user } = useAuth();
  const { usage, loading, remainingStories } = useSubscriptionUsage(user?.id);

  if (loading || !usage) {
    return null;
  }

  if (usage.hasUnlimited) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg">
        <Crown className="w-4 h-4" />
        <span>{usage.tier === 'max' ? 'Max' : 'Pro'} {usage.isGrandfathered && '(Lifetime)'}</span>
        <Sparkles className="w-4 h-4" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm">
        <span className="text-gray-600">Stories today:</span>
        <span className="font-semibold text-gray-900">
          {usage.storiesGeneratedToday} / {usage.dailyLimit}
        </span>
      </div>
      {remainingStories === 0 && onUpgradeClick && (
        <button
          onClick={onUpgradeClick}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
        >
          Upgrade to Pro
        </button>
      )}
    </div>
  );
}
