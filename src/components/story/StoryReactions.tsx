/**
 * StoryReactions component - displays like/dislike and share buttons.
 */

import { ThumbsUp, ThumbsDown, Share2, User } from 'lucide-react';

interface Creator {
  display_name: string | null;
  avatar_url: string | null;
}

interface StoryReactionsProps {
  likesCount: number;
  dislikesCount: number;
  userReaction: 'like' | 'dislike' | null;
  onLike: () => void;
  onDislike: () => void;
  onShare: () => void;
  creator?: Creator | null;
  storyTitle?: string;
  storyId: string;
  onRestart: () => void;
  onChooseAnother: () => void;
}

export function StoryReactions({
  likesCount,
  dislikesCount,
  userReaction,
  onLike,
  onDislike,
  onShare,
  creator,
  onRestart,
  onChooseAnother,
}: StoryReactionsProps) {
  return (
    <>
      {/* Creator info */}
      {creator && (
        <div className="bg-white rounded-3xl shadow-xl p-8 mt-8 mx-auto max-w-md">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Story created by</p>
            <div className="flex items-center justify-center gap-3">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name || 'Creator'}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <span className="text-xl font-bold text-gray-800">
                {creator.display_name || 'Anonymous'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Reaction buttons */}
      <div className="bg-white rounded-3xl shadow-xl p-8 mt-8 mx-auto max-w-md">
        <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">
          Did you enjoy this story?
        </h3>
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              userReaction === 'like'
                ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                : 'bg-gray-100 text-gray-600 hover:bg-green-50'
            }`}
            onClick={onLike}
          >
            <ThumbsUp className="w-5 h-5" />
            <span>{likesCount}</span>
          </button>

          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
              userReaction === 'dislike'
                ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                : 'bg-gray-100 text-gray-600 hover:bg-red-50'
            }`}
            onClick={onDislike}
          >
            <ThumbsDown className="w-5 h-5" />
            <span>{dislikesCount}</span>
          </button>

          <button
            className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
            onClick={onShare}
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-4 mt-8 pb-12">
        <button
          onClick={onRestart}
          className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Read Again
        </button>
        <button
          onClick={onChooseAnother}
          className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Choose Another Story
        </button>
      </div>
    </>
  );
}
