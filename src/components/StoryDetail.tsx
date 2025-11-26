/**
 * Story detail view component.
 * Refactored to use useStoryReactions hook instead of inline reaction handling.
 */

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Heart, ThumbsDown, Play, Loader, Users, CheckCircle2 } from 'lucide-react';
import { getStory } from '../lib/storyService';
import type { Story } from '../lib/types';
import { useToast } from './Toast';
import { useStoryReactions } from '../hooks/useStoryReactions';
import { LoadingState } from '../shared/components/LoadingState';
import { SEO, generateStorySchema, generateBreadcrumbSchema } from './SEO';

interface StoryDetailProps {
  storyId: string;
  userId: string;
  onBack: () => void;
  onStartStory: () => void;
}

export function StoryDetail({ storyId, userId, onBack, onStartStory }: StoryDetailProps) {
  const { showToast } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  // Use the shared reactions hook instead of inline handling
  const {
    userReaction,
    likesCount,
    dislikesCount,
    handleLike,
    handleDislike,
  } = useStoryReactions(
    userId,
    storyId,
    story?.likes_count || 0,
    story?.dislikes_count || 0
  );

  const hasLiked = userReaction?.reaction_type === 'like';
  const hasDisliked = userReaction?.reaction_type === 'dislike';

  useEffect(() => {
    loadStoryDetails();
  }, [storyId]);

  const loadStoryDetails = async () => {
    try {
      const storyData = await getStory(storyId);
      if (!storyData) return;

      // If story is private and the viewer isn't the owner, block with a friendly message
      if (storyData.is_public === false && storyData.created_by !== userId) {
        setStory(null);
      } else {
        setStory(storyData);
      }
    } catch (error) {
      console.error('Error loading story details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (isLike: boolean) => {
    if (!userId) {
      showToast('Please sign in to react to stories', 'warning');
      return;
    }

    try {
      if (isLike) {
        await handleLike();
      } else {
        await handleDislike();
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  // Only block if story is in 'pending' state (initial creation not complete)
  // Allow 'first_chapter_ready', 'generating_background', 'generating_full_story', and 'fully_generated'
  const isStillPending = story?.generation_status === 'pending';
  const hasFailed = story?.generation_status === 'generation_failed';

  if (loading) {
    return <LoadingState fullScreen message="Loading story..." />;
  }

  if (!loading && story && isStillPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold mb-2">Story is being created</p>
          <p className="text-gray-500 text-sm mb-6">Please check back in a moment. We're setting up your story.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!loading && story && hasFailed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-gray-700 font-semibold mb-2">Story generation failed</p>
          <p className="text-gray-500 text-sm mb-6">Something went wrong while creating this story. Please try creating a new one.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Story not found or not available.</p>
          <p className="text-gray-500 text-sm mb-6">If you followed a link, the story may be private or still generating.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Generate structured data for this story
  const storySchema = generateStorySchema({
    id: storyId,
    title: story.title,
    description: story.description,
    cover_image_url: story.cover_image_url,
    age_range: story.age_range,
    estimated_duration: story.estimated_duration,
    created_at: story.created_at,
    creator: story.creator,
    likes_count: likesCount,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Stories', url: '/' },
    { name: story.title, url: `/story/${storyId}` },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <SEO
        title={story.title}
        description={story.description}
        image={story.cover_image_url || undefined}
        url={`/story/${storyId}`}
        type="article"
        publishedTime={story.created_at}
        author={story.creator?.display_name || 'Anonymous'}
        keywords={['interactive story', story.age_range, 'choose your own adventure']}
        schema={[storySchema, breadcrumbSchema]}
      />
      <article className="max-w-4xl mx-auto px-4 py-6">
        <nav aria-label="Back navigation">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Back</span>
          </button>
        </nav>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {story.cover_image_url && (
            <div className="h-64 md:h-96 overflow-hidden">
              <img
                src={story.cover_image_url}
                alt={story.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8 md:p-12">
            <div className="mb-6">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                {story.title}
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                {story.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5" />
                <span className="font-medium">{story.estimated_duration} min read</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-5 h-5" />
                <span className="font-medium">Ages {story.age_range}</span>
              </div>
              <div className={`flex items-center gap-2 ${
                story.completion_count && story.completion_count > 0
                  ? 'text-green-600'
                  : 'text-gray-400'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">
                  {story.completion_count || 0} {(story.completion_count || 0) === 1 ? 'person' : 'people'} completed
                </span>
              </div>
              {story.is_user_generated && (
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                  User Created
                </span>
              )}
            </div>

            {story.creator && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Created by</p>
                <div className="flex items-center gap-3">
                  {story.creator.avatar_url ? (
                    <img
                      src={story.creator.avatar_url}
                      alt={story.creator.display_name || 'Creator'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <span className="text-lg font-semibold text-gray-800">
                    {story.creator.display_name || 'Anonymous'}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => handleReaction(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
                  hasLiked
                    ? 'bg-red-100 text-red-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                }`}
              >
                <Heart className={`w-5 h-5 ${hasLiked ? 'fill-red-600' : ''}`} />
                <span>{likesCount}</span>
              </button>
              <button
                onClick={() => handleReaction(false)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-colors ${
                  hasDisliked
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <ThumbsDown className={`w-5 h-5 ${hasDisliked ? 'fill-gray-700' : ''}`} />
                <span>{dislikesCount}</span>
              </button>
            </div>

            <button
              onClick={onStartStory}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
            >
              <Play className="w-6 h-6 fill-white" aria-hidden="true" />
              Start Adventure
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
