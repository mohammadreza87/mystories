/**
 * Public profile view component.
 * Refactored to use useFollow and useShare hooks instead of inline handling.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Share2, UserPlus, UserMinus, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Story, UserProfile } from '../lib/types';
import { getPublicUserStories } from '../lib/storyService';
import { useAuth } from '../lib/authContext';
import { useFollow } from '../hooks/useFollow';
import { useShare } from '../hooks/useShare';
import { useToast } from './Toast';
import { LoadingState } from '../shared/components/LoadingState';
import { SEO, generatePersonSchema } from './SEO';

interface PublicProfileProps {
  profileUserId: string;
  onBack: () => void;
  onSelectStory: (storyId: string) => void;
}

export function PublicProfile({ profileUserId, onBack, onSelectStory }: PublicProfileProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { shareStory } = useShare();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the shared follow hook instead of inline handling
  const {
    isFollowing: following,
    followersCount,
    loading: followLoading,
    toggleFollow,
  } = useFollow(user?.id, profileUserId);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('display_name, bio, avatar_url, username, following_count')
          .eq('id', profileUserId)
          .maybeSingle();

        if (!mounted) return;
        setProfile(prof as UserProfile | null);

        const publicStories = await getPublicUserStories(profileUserId);
        if (!mounted) return;
        setStories(publicStories);
      } catch (error) {
        console.error('Error loading public profile', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [profileUserId]);

  const handleShare = async (storyId: string, storyTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await shareStory(storyId, storyTitle);
    if (!success) {
      showToast('Unable to share right now', 'error');
    }
  };

  if (loading) {
    return <LoadingState fullScreen message="Loading profile..." />;
  }

  const displayName = profile?.display_name || profile?.username || 'Reader';
  const personSchema = profile ? generatePersonSchema({
    id: profileUserId,
    display_name: displayName,
    bio: profile.bio,
    avatar_url: profile.avatar_url,
  }) : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <SEO
        title={`${displayName}'s Profile`}
        description={profile?.bio || `Check out ${displayName}'s interactive stories on Next Tale. Follow them to see their latest creations.`}
        url={`/user/${profileUserId}`}
        image={profile?.avatar_url || undefined}
        schema={personSchema}
      />
      <main className="max-w-md mx-auto px-4 py-6">
        <nav aria-label="Back navigation">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Back</span>
          </button>
        </nav>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl text-white font-bold">
                  {(profile?.display_name || profile?.username || 'U').charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">
                {profile?.display_name || profile?.username || 'Reader'}
              </h1>
              {profile?.username && (
                <p className="text-blue-600 text-sm font-medium">@{profile.username}</p>
              )}
              {profile?.bio && (
                <p className="text-gray-600 text-sm mt-1">{profile.bio}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
              <div className="text-xs text-gray-600">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{profile?.following_count || 0}</div>
              <div className="text-xs text-gray-600">Following</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stories.length}</div>
              <div className="text-xs text-gray-600">Stories</div>
            </div>
          </div>

          {user?.id && user.id !== profileUserId && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all flex items-center justify-center gap-2 ${
                following
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {followLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : following ? (
                <>
                  <UserMinus className="w-5 h-5" />
                  <span>Unfollow</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Follow</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Public Stories</h2>
          {stories.length === 0 ? (
            <p className="text-gray-600 text-sm">No public stories yet.</p>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className="p-4 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-blue-50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectStory(story.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-md font-semibold text-gray-900">{story.title}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">{story.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{story.estimated_duration} min</span>
                        </div>
                        <span>Ages {story.age_range}</span>
                      </div>
                    </div>
                    <button
                      className="p-2 text-blue-600 hover:text-blue-800 rounded-xl hover:bg-blue-50 transition-colors"
                      onClick={(e) => handleShare(story.id, story.title, e)}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
