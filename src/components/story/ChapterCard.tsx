/**
 * ChapterCard component - displays a single story chapter.
 * Handles chapter content, image, and audio controls.
 */

import { Play, Pause, Loader, Sparkles } from 'lucide-react';

interface ChapterCardProps {
  chapterNumber: number;
  content: string;
  imageUrl?: string | null;
  isGeneratingImage?: boolean;
  isEnding?: boolean;
  endingType?: string | null;
  isPlaying: boolean;
  isLoadingAudio: boolean;
  currentWordIndex: number;
  onToggleAudio: () => void;
  isLatestChapter?: boolean;
  innerRef?: React.RefObject<HTMLDivElement>;
}

export function ChapterCard({
  chapterNumber,
  content,
  imageUrl,
  isGeneratingImage,
  isEnding,
  endingType,
  isPlaying,
  isLoadingAudio,
  currentWordIndex,
  onToggleAudio,
  innerRef,
}: ChapterCardProps) {
  const words = content.split(/\s+/);

  const getEndingEmoji = (type: string | null) => {
    switch (type) {
      case 'happy':
        return '🌟';
      case 'learning_moment':
        return '💡';
      default:
        return '📖';
    }
  };

  return (
    <div ref={innerRef}>
      <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-6 relative overflow-hidden">
        {/* Decorative gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30 -ml-32 -mb-32" />

        <div className="relative">
          {/* Header with chapter number and audio button */}
          <div className="flex items-start justify-between mb-4">
            <div className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Chapter {chapterNumber}
            </div>
            <button
              onClick={onToggleAudio}
              disabled={isLoadingAudio}
              className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoadingAudio ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Chapter image */}
          {imageUrl ? (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
              <img
                src={imageUrl}
                alt={`Chapter ${chapterNumber} illustration`}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : isGeneratingImage ? (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 flex items-center justify-center gap-3">
              <Loader className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-blue-700 font-medium">Creating illustration...</span>
            </div>
          ) : null}

          {/* Chapter content with word highlighting */}
          <div className="prose prose-lg max-w-none">
            <p className="text-xl md:text-2xl leading-relaxed text-gray-800">
              {words.map((word, index) => (
                <span key={index}>
                  <span
                    className={`transition-all duration-200 ${
                      index === currentWordIndex
                        ? 'bg-yellow-300 text-gray-900 px-1 rounded font-semibold'
                        : ''
                    }`}
                  >
                    {word}
                  </span>{' '}
                </span>
              ))}
            </p>
          </div>

          {/* Ending badge */}
          {isEnding && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-orange-100 px-8 py-4 rounded-2xl">
                <span className="text-4xl">{getEndingEmoji(endingType)}</span>
                <span className="text-xl font-semibold text-gray-700">The End</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for chapter generation.
 */
export function ChapterLoadingCard() {
  return (
    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30 -ml-32 -mb-32" />

      <div className="relative flex flex-col items-center justify-center min-h-[300px] gap-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
          <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold text-gray-800">Crafting your story...</h3>
          <p className="text-gray-600">The AI is writing what happens next</p>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
