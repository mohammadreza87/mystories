/**
 * StoryProgress component - displays chapter progress and generation status.
 */

import { RotateCcw, Sparkles } from 'lucide-react';

interface StoryProgressProps {
  chaptersCount: number;
  generationStatus?: string;
  generationProgress: number;
  onRestart: () => void;
}

export function StoryProgress({
  chaptersCount,
  generationStatus,
  generationProgress,
  onRestart,
}: StoryProgressProps) {
  const showGenerationProgress =
    generationStatus &&
    generationStatus !== 'fully_generated' &&
    generationProgress < 100;

  return (
    <>
      {/* Chapter indicators and restart button */}
      <div className="mb-6 flex items-center justify-between sticky top-0 bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: chaptersCount }).map((_, idx) => (
              <div
                key={idx}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">Chapter {chaptersCount}</span>
        </div>

        <button
          onClick={onRestart}
          className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-lg"
          aria-label="Restart story"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Background generation progress */}
      {showGenerationProgress && (
        <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Story generating in background...
            </span>
            <span className="text-gray-500">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All story paths will be ready as you read. No waiting!
          </p>
        </div>
      )}
    </>
  );
}
