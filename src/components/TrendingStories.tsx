import { useState, useEffect } from 'react';
import { TrendingUp, Clock, Heart, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TrendingStory {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  likes_count: number;
  completion_count: number;
  trending_score: number;
  reading_time?: number;
  creator?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TrendingStoriesProps {
  onSelectStory: (storyId: string) => void;
}

export function TrendingStories({ onSelectStory }: TrendingStoriesProps) {
  const [stories, setStories] = useState<TrendingStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendingStories();
  }, []);

  const fetchTrendingStories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-trending-stories`,
        {
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : '',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Error fetching trending stories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-6 h-6 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-800">Trending YA Stories</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.slice(0, 6).map((story) => (
          <div
            key={story.id}
            onClick={() => onSelectStory(story.id)}
            className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer overflow-hidden"
          >
            {/* Story Cover */}
            <div className="h-48 bg-gradient-to-br from-purple-400 to-pink-400 relative">
              {story.cover_image_url ? (
                <img
                  src={story.cover_image_url}
                  alt={story.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <BookOpen className="w-16 h-16 text-white opacity-50" />
                </div>
              )}

              {/* Trending Badge */}
              <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                #{stories.indexOf(story) + 1}
              </div>
            </div>

            {/* Story Info */}
            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-1">
                {story.title}
              </h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {story.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{story.likes_count || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>{story.completion_count || 0} reads</span>
                </div>
                {story.reading_time && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{story.reading_time} min</span>
                  </div>
                )}
              </div>

              {/* Creator */}
              {story.creator && (
                <div className="mt-3 flex items-center gap-2">
                  {story.creator.avatar_url ? (
                    <img
                      src={story.creator.avatar_url}
                      alt={story.creator.display_name || 'Author'}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-300" />
                  )}
                  <span className="text-xs text-gray-600">
                    by {story.creator.display_name || 'Anonymous'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}