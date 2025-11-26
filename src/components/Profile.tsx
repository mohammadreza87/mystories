import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Trophy, Loader, LogOut, User, Edit2, Trash2, Globe, Lock, Crown, Settings, Share2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/authContext';
import { ProfileEdit } from './ProfileEdit';
import { getUserStories, deleteStory, updateStoryVisibility } from '../lib/storyService';
import { getFollowerCount, getFollowingCount } from '../lib/followService';
import type { Story, UserProfile as UserProfileType } from '../lib/types';
import { getUserSubscription, createCustomerPortalSession } from '../lib/subscriptionService';
import UpgradeModal from './UpgradeModal';
import { useToast } from './Toast';
import { useShare } from '../hooks';
import { LoadingState } from '../shared/components/LoadingState';
import { ErrorState } from '../shared/components/ErrorState';
import { formatDate } from '../shared/utils/formatters';

interface ProfileProps {
  userId: string;
  onSelectStory: (storyId: string) => void;
}

interface CompletedStory {
  story: Story;
  completed_at: string;
  path_taken: string[];
}

interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}

export function Profile({ userId, onSelectStory }: ProfileProps) {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { shareStory } = useShare();
  const [completedStories, setCompletedStories] = useState<CompletedStory[]>([]);
  const [createdStories, setCreatedStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'completed' | 'created'>('completed');
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [updatingVisibilityId, setUpdatingVisibilityId] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [subscription, setSubscription] = useState<UserProfileType | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    loadProfile();
    loadCompletedStories();
    loadCreatedStories();
    loadFollowCounts();
    loadSubscription();

    const channel = supabase
      .channel('profile-points-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        () => {
          loadSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('username, display_name, bio, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoadError('Failed to load profile');
    }
  };

  const loadSubscription = async () => {
    if (!user) return;

    try {
      const data = await getUserSubscription(user.id);
      if (data) {
        setSubscription(data as any);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
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

  const loadCompletedStories = async () => {
    try {
      const { data, error } = await supabase
        .from('user_story_progress')
        .select(`
          completed_at,
          path_taken,
          story:stories(*)
        `)
        .eq('user_id', userId)
        .eq('completed', true)
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const formatted = data?.map(item => ({
        story: item.story as unknown as Story,
        completed_at: item.completed_at || '',
        path_taken: item.path_taken || []
      })) || [];

      setCompletedStories(formatted);
    } catch (error) {
      console.error('Error loading completed stories:', error);
      setLoadError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const loadCreatedStories = async () => {
    try {
      const stories = await getUserStories(userId);
      setCreatedStories(stories);
    } catch (error) {
      console.error('Error loading created stories:', error);
      setLoadError('Failed to load stories');
    }
  };

  const loadFollowCounts = async () => {
    try {
      const [followers, following] = await Promise.all([
        getFollowerCount(userId),
        getFollowingCount(userId)
      ]);
      setFollowersCount(followers);
      setFollowingCount(following);
    } catch (error) {
      console.error('Error loading follow counts:', error);
      setLoadError('Failed to load followers');
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
      return;
    }

    setDeletingStoryId(storyId);
    try {
      await deleteStory(storyId);
      setCreatedStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
      console.error('Error deleting story:', error);
      showToast('Failed to delete story. Please try again.', 'error');
    } finally {
      setDeletingStoryId(null);
    }
  };

  const handleShare = async (storyId: string, storyTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await shareStory(storyId, storyTitle);
    if (!success) {
      showToast('Unable to share right now', 'error');
    }
  };

  if (loading) {
    return <LoadingState fullScreen message="Loading your profile..." size="lg" />;
  }

  if (loadError) {
    return (
      <ErrorState
        fullScreen
        title="Unable to load profile"
        message={loadError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const handleToggleVisibility = async (storyId: string, currentVisibility: boolean) => {
    setUpdatingVisibilityId(storyId);
    try {
      await updateStoryVisibility(storyId, !currentVisibility);
      setCreatedStories(prev =>
        prev.map(s => s.id === storyId ? { ...s, is_public: !currentVisibility } : s)
      );
    } catch (error) {
      console.error('Error updating story visibility:', error);
      showToast('Failed to update story visibility. Please try again.', 'error');
    } finally {
      setUpdatingVisibilityId(null);
    }
  };

  // formatDate moved to shared/utils/formatters.ts

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-white font-bold">
                  {(profile?.display_name || user?.email?.split('@')[0] || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-800">
                  {profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </h1>
                {(subscription?.subscription_tier === 'pro' || subscription?.is_grandfathered) && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold shadow-md">
                    <Crown className="w-3 h-3" />
                    <span>PRO</span>
                  </div>
                )}
              </div>
              <p className="text-blue-600 text-sm font-medium mb-1">
                @{profile?.username || 'user'}
              </p>
              <p className="text-gray-600 text-xs mb-1">
                {user?.email}
              </p>
              {profile?.bio && (
                <p className="text-gray-700 text-sm mt-2">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{followersCount}</p>
              <p className="text-sm text-gray-600">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{followingCount}</p>
              <p className="text-sm text-gray-600">Following</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{subscription?.total_points || 0}</p>
              <p className="text-sm text-gray-600">Points</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex space-x-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{completedStories.length}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-800">{createdStories.length}</p>
                <p className="text-sm text-gray-600">Created</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {subscription && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Subscription</h3>
              {subscription.subscription_tier === 'pro' || subscription.is_grandfathered ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full text-sm font-medium">
                  <Crown className="w-4 h-4" />
                  <span>Pro {subscription.is_grandfathered && '(Lifetime)'}</span>
                </div>
              ) : (
                <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  Free Plan
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              {subscription.subscription_tier === 'pro' || subscription.is_grandfathered ? (
                <>
                  <div className="flex justify-between">
                    <span>Stories Generated:</span>
                    <span className="font-semibold text-gray-900">Unlimited</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Stories Created:</span>
                    <span className="font-semibold text-gray-900">{subscription.total_stories_generated}</span>
                  </div>
                  {!subscription.is_grandfathered && subscription.stripe_customer_id && (
                    <button
                      onClick={handleManageSubscription}
                      className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Manage Subscription
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Stories Today:</span>
                    <span className="font-semibold text-gray-900">{subscription.stories_generated_today} / 1</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Stories Created:</span>
                    <span className="font-semibold text-gray-900">{subscription.total_stories_generated}</span>
                  </div>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Crown className="w-5 h-5" />
                    Upgrade to Pro
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {subscription && (
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-gray-800">Points Breakdown</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reading Points:</span>
                <span className="text-lg font-bold text-green-600">{subscription.reading_points || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Creating Points:</span>
                <span className="text-lg font-bold text-purple-600">{subscription.creating_points || 0}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Total Points:</span>
                  <span className="text-2xl font-bold text-blue-600">{subscription.total_points || 0}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>Earn points:</strong> 1 point per chapter read, 5 points for completing a story, and 5 points when you create a story!
              </p>
            </div>
          </div>
        )}

        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

        <div className="bg-white rounded-3xl shadow-xl mb-6 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Completed Stories
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`flex-1 py-4 px-6 font-semibold transition-colors ${
                activeTab === 'created'
                  ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              My Stories
            </button>
          </div>
        </div>

        {activeTab === 'completed' ? (
          completedStories.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Completed Stories Yet</h3>
              <p className="text-gray-600">
                Start reading stories and complete them to see your achievements here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedStories.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all duration-300 active:scale-95"
                onClick={() => onSelectStory(item.story.id)}
              >
                <div className="flex">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 flex items-center justify-center flex-shrink-0 relative">
                    {item.story.cover_image_url ? (
                      <img
                        src={item.story.cover_image_url}
                        alt={item.story.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <CheckCircle className="w-10 h-10 text-white" />
                    )}
                    <div className="absolute top-1 right-1 bg-green-500 rounded-full p-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 p-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">
                      {item.story.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {item.story.description}
                    </p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Completed {formatDate(item.completed_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )
        ) : (
          createdStories.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Created Stories Yet</h3>
              <p className="text-gray-600">
                Create your first interactive story to see it here!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {createdStories.map((story) => (
                <div
                  key={story.id}
                  className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
                  <div className="flex">
                    <div
                      className="w-24 h-24 bg-gradient-to-br from-purple-200 via-pink-200 to-orange-200 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      onClick={() => onSelectStory(story.id)}
                    >
                      {story.cover_image_url ? (
                        <img
                          src={story.cover_image_url}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 text-white" />
                      )}
                    </div>

                    <div className="flex-1 p-4 cursor-pointer" onClick={() => onSelectStory(story.id)}>
                      <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-1">
                        {story.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {story.description}
                      </p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{story.estimated_duration} min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pr-4">
                      <button
                        onClick={(e) => handleShare(story.id, story.title, e)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Share story"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleVisibility(story.id, story.is_public);
                        }}
                        disabled={updatingVisibilityId === story.id}
                        className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
                          story.is_public
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={story.is_public ? 'Make private' : 'Make public'}
                      >
                        {updatingVisibilityId === story.id ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : story.is_public ? (
                          <Globe className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStory(story.id);
                        }}
                        disabled={deletingStoryId === story.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                        title="Delete story"
                      >
                        {deletingStoryId === story.id ? (
                          <Loader className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showEditModal && (
        <ProfileEdit
          onClose={() => setShowEditModal(false)}
          onSave={() => {
            loadProfile();
          }}
        />
      )}
    </div>
  );
}
