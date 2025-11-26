import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  fullScreen?: boolean;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again or refresh the page.',
  fullScreen = false,
  onRetry,
}: ErrorStateProps) {
  const containerClasses = fullScreen
    ? 'min-h-screen flex flex-col items-center justify-center text-center px-4'
    : 'w-full flex flex-col items-center justify-center text-center px-4 py-6';

  return (
    <div className={containerClasses} role="alert">
      <div className="text-red-600 font-semibold text-lg">{title}</div>
      <p className="text-gray-600 mt-2 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorState;
