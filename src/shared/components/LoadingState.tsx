import React from 'react';

type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingStateProps {
  message?: string;
  size?: LoadingSize;
  fullScreen?: boolean;
}

const sizeClass: Record<LoadingSize, string> = {
  sm: 'h-6 w-6 border-2',
  md: 'h-10 w-10 border-[3px]',
  lg: 'h-16 w-16 border-4',
};

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
}: LoadingStateProps) {
  const containerClasses = fullScreen
    ? 'min-h-screen flex flex-col items-center justify-center'
    : 'w-full flex flex-col items-center justify-center py-6';

  return (
    <div className={containerClasses}>
      <div
        className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizeClass[size]}`}
        role="status"
        aria-label="Loading"
      />
      {message && <p className="mt-3 text-sm text-gray-600 text-center">{message}</p>}
    </div>
  );
}

export default LoadingState;
