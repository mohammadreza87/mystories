/**
 * Centralized error handling for the Next Tale application.
 * Provides consistent error types, handling, and user-facing messages.
 */

/**
 * Error codes matching backend API errors.
 */
export const ErrorCodes = {
  // Authentication
  UNAUTHORIZED: 'UNAUTHORIZED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Business logic
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  GENERATION_FAILED: 'GENERATION_FAILED',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Application-specific error class with additional context.
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }

  /**
   * Check if error requires user to upgrade subscription.
   */
  isUpgradeRequired(): boolean {
    return (
      this.code === ErrorCodes.DAILY_LIMIT_REACHED ||
      this.code === ErrorCodes.SUBSCRIPTION_REQUIRED
    );
  }

  /**
   * Check if error is an authentication issue.
   */
  isAuthError(): boolean {
    return (
      this.code === ErrorCodes.UNAUTHORIZED ||
      this.code === ErrorCodes.SESSION_EXPIRED
    );
  }
}

/**
 * User-friendly error messages for display.
 */
const userFacingMessages: Record<ErrorCode, string> = {
  [ErrorCodes.UNAUTHORIZED]: 'Please sign in to continue.',
  [ErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ErrorCodes.NOT_FOUND]: 'The requested item could not be found.',
  [ErrorCodes.ALREADY_EXISTS]: 'This item already exists.',
  [ErrorCodes.DAILY_LIMIT_REACHED]:
    "You've reached your daily story limit. Upgrade to Pro for unlimited stories!",
  [ErrorCodes.SUBSCRIPTION_REQUIRED]:
    'This feature requires a Pro subscription.',
  [ErrorCodes.GENERATION_FAILED]:
    'Story generation failed. Please try again.',
  [ErrorCodes.NETWORK_ERROR]:
    'Network error. Please check your connection and try again.',
  [ErrorCodes.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorCodes.INTERNAL_ERROR]: 'Something went wrong. Please try again later.',
  [ErrorCodes.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

/**
 * Get a user-friendly message for an error.
 */
export function getUserFacingMessage(error: unknown): string {
  if (error instanceof AppError) {
    return userFacingMessages[error.code] || error.message;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return userFacingMessages[ErrorCodes.NETWORK_ERROR];
    }
    if (error.message.includes('timeout')) {
      return userFacingMessages[ErrorCodes.TIMEOUT];
    }
    return error.message;
  }

  return userFacingMessages[ErrorCodes.UNKNOWN];
}

/**
 * Parse API error response into AppError.
 */
export async function parseApiError(response: Response): Promise<AppError> {
  try {
    const data = await response.json();
    const error = data.error;

    if (error && typeof error === 'object') {
      return new AppError(
        error.code || ErrorCodes.UNKNOWN,
        error.message || 'Request failed',
        response.status,
        error.details
      );
    }

    return new AppError(
      ErrorCodes.UNKNOWN,
      data.message || data.error || 'Request failed',
      response.status
    );
  } catch {
    return new AppError(
      ErrorCodes.UNKNOWN,
      `Request failed with status ${response.status}`,
      response.status
    );
  }
}

/**
 * Wrap an async function with consistent error handling.
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            ErrorCodes.UNKNOWN,
            error instanceof Error ? error.message : 'Unknown error'
          );

    if (onError) {
      onError(appError);
    } else {
      console.error('Unhandled error:', appError);
    }

    return null;
  }
}

/**
 * Log error with context for debugging.
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  const errorInfo = {
    context,
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error instanceof AppError && {
              code: error.code,
              statusCode: error.statusCode,
              details: error.details,
            }),
          }
        : error,
    ...additionalInfo,
  };

  console.error('[Next Tale Error]', errorInfo);
}
