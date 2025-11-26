import { useCallback, useEffect, useRef, useState } from 'react';
import { Bird, Clock, Users, Loader, ThumbsUp, ThumbsDown, User, UserPlus, UserCheck, Book, Share2, CheckCircle2 } from 'lucide-react';
import { getStories, addReaction, updateReaction, removeReaction } from '../lib/storyService';
import { supabase } from '../lib/supabase';
import type { Story, StoryReaction } from '../lib/types';
import { followUser, unfollowUser, getFollowingIds } from '../lib/followService';
import { useToast } from './Toast';
import { useShare } from '../hooks/useShare';
import { LoadingState } from '../shared/components/LoadingState';
import { getLanguageFlag } from '../shared/utils/formatters';

interface StoryLibraryProps {
  onSelectStory: (storyId: string) => void;
  onViewProfile?: (profileUserId: string) => void;
  userId: string;
}

interface StoryWithLoading extends Story {
  generatingCover?: boolean;
}

export function StoryLibrary({ onSelectStory, onViewProfile, userId }: StoryLibraryProps) {
  const { showToast } = useToast();
  const { shareStory } = useShare();
  const [stories, setStories] = useState<StoryWithLoading[]>([]);
  const [loading, setLoading] = useState(true);
  const [userReactions, setUserReactions] = useState<Record<string, StoryReaction>>({});
  const [followingUsers, setFollowingUsers] = useState<Record<string, boolean>>({});
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const storiesRef = useRef<StoryWithLoading[]>([]);

  const syncFollowingStatus = useCallback(async (storiesData: StoryWithLoading[] = storiesRef.current) => {
    if (!userId) {
      setFollowingUsers({});
      return;
    }

    try {
      const followingIds = await getFollowingIds(userId);
      const followingMap: Record<string, boolean> = {};

      storiesData.forEach((story) => {
        if (story.created_by) {
          followingMap[story.created_by] = followingIds.includes(story.created_by);
        }
      });

      setFollowingUsers(followingMap);
    } catch (error) {
      console.error('Error loading following status:', error);
    }
  }, [userId]);

  const loadUserReactions = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('story_reactions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const reactionsMap: Record<string, StoryReaction> = {};
      data?.forEach((reaction) => {
        reactionsMap[reaction.story_id] = reaction;
      });
      setUserReactions(reactionsMap);
    } catch (error) {
      console.error('Error loading user reactions:', error);
    }
  }, [userId]);

  const loadStories = useCallback(async () => {
    try {
      const data = await getStories();
      storiesRef.current = data;
      setStories(data);
      await syncFollowingStatus(data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading stories:', error);
      setLoading(false);
    }
  }, [syncFollowingStatus]);

  useEffect(() => {
    loadStories();
    loadUserReactions();

    const channel = supabase
      .channel('story_reactions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, () => {
        loadStories();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'story_reactions',
        filter: `user_id=eq.${userId}`
      }, () => {
        loadUserReactions();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_follows',
        filter: `follower_id=eq.${userId}`
      }, () => {
        syncFollowingStatus(storiesRef.current);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadStories, loadUserReactions, syncFollowingStatus, userId]);

  const handleShare = async (storyId: string, storyTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await shareStory(storyId, storyTitle);
    if (!success) {
      showToast('Unable to share right now', 'error');
    }
  };

  const handleReaction = async (storyId: string, reactionType: 'like' | 'dislike', e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) {
      showToast('Please sign in to react to stories', 'warning');
      return;
    }

    try {
      const currentReaction = userReactions[storyId];

      if (currentReaction) {
        if (currentReaction.reaction_type === reactionType) {
          await removeReaction(userId, storyId);
        } else {
          await updateReaction(userId, storyId, reactionType);
        }
      } else {
        await addReaction(userId, storyId, reactionType);
      }

      await loadUserReactions();
      await loadStories();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleFollowToggle = async (creatorId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!userId) {
      showToast('Please sign in to follow creators', 'warning');
      return;
    }

    if (creatorId === userId) return;

    setFollowLoading(creatorId);
    try {
      if (followingUsers[creatorId]) {
        await unfollowUser(creatorId);
        setFollowingUsers(prev => ({ ...prev, [creatorId]: false }));
      } else {
        await followUser(creatorId);
        setFollowingUsers(prev => ({ ...prev, [creatorId]: true }));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  if (loading) {
    return <LoadingState fullScreen message="Loading stories..." size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl shadow-lg mb-3">
            <Bird className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Next Tale
          </h1>
          <p className="text-sm text-gray-600">
            Discover your next YA adventure
          </p>
        </div>

        <div className="space-y-4">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-white rounded-3xl shadow-xl overflow-hidden transform transition-all duration-300 active:scale-95"
              onClick={() => onSelectStory(story.id)}
            >
              <div className="h-40 bg-gradient-to-br from-yellow-200 via-orange-200 to-pink-200 flex items-center justify-center relative overflow-hidden">
                {story.generatingCover ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90">
                    <Loader className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                    <span className="text-xs text-blue-700 font-medium">Creating cover...</span>
                  </div>
                ) : story.cover_image_url ? (
                  <img
                    src={story.cover_image_url}
                    alt={`${story.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Book className="w-16 h-16 text-white opacity-80" />
                )}
                {story.generation_status && story.generation_status !== 'fully_generated' && story.generation_progress !== undefined && story.generation_progress < 100 && !story.is_user_generated && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <Loader className="w-3 h-3 animate-spin" />
                    {story.generation_progress}%
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {story.title}
                </h3>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {story.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{story.estimated_duration} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>Ages {story.age_range}</span>
                  </div>
                  <div className={`flex items-center gap-1 font-medium ${
                    story.completion_count && story.completion_count > 0
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{story.completion_count || 0} completed</span>
                  </div>
                </div>

                {story.creator && (
                  <div className="flex items-center justify-between mb-3">
                    <button
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (story.created_by && onViewProfile) {
                          onViewProfile(story.created_by);
                        }
                      }}
                    >
                      {story.creator.avatar_url ? (
                        <img
                          src={story.creator.avatar_url}
                          alt={story.creator.display_name || 'Creator'}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium">By {story.creator.display_name || 'Anonymous'}</span>
                    </button>
                    {story.created_by && story.created_by !== userId && (
                      <button
                        onClick={(e) => handleFollowToggle(story.created_by!, e)}
                        disabled={followLoading === story.created_by}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold ${
                          followingUsers[story.created_by]
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {followLoading === story.created_by ? (
                          <Loader className="w-3 h-3 animate-spin" />
                        ) : followingUsers[story.created_by] ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Following</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3" />
                            <span>Follow</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                        userReactions[story.id]?.reaction_type === 'like'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                      }`}
                      onClick={(e) => handleReaction(story.id, 'like', e)}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span className="text-sm font-medium">{story.likes_count || 0}</span>
                    </button>

                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                        userReactions[story.id]?.reaction_type === 'dislike'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                      }`}
                      onClick={(e) => handleReaction(story.id, 'dislike', e)}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span className="text-sm font-medium">{story.dislikes_count || 0}</span>
                    </button>

                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all bg-blue-100 text-blue-700 hover:bg-blue-200"
                      onClick={(e) => handleShare(story.id, story.title, e)}
                      title="Share story"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-2xl" title={`Language: ${story.language || 'en'}`}>
                    {getLanguageFlag(story.language)}
                  </div>
                </div>

                <button
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-2xl shadow-md active:scale-95 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStory(story.id);
                  }}
                >
                  Start Adventure
                </button>
              </div>
            </div>
          ))}
        </div>

        {stories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No stories available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
