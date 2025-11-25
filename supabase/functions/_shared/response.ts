/**
 * Shared response utilities for consistent API responses.
 */

import { CORS_HEADERS, responseHeaders } from './cors.ts';

/**
 * Error codes for consistent error handling across the application.
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',

  // Business logic errors
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
  GENERATION_FAILED: 'GENERATION_FAILED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

interface ApiSuccess<T> {
  data: T;
}

/**
 * Create a successful JSON response.
 */
export function success<T>(data: T, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(),
  });
}

/**
 * Create an error JSON response.
 */
export function error(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: unknown
): Response {
  const body: ApiError = { code, message };
  if (details !== undefined) {
    body.details = details;
  }

  return new Response(JSON.stringify({ error: body }), {
    status,
    headers: responseHeaders(),
  });
}

/**
 * Common error responses for reuse.
 */
export const errors = {
  unauthorized: (message: string = 'Authentication required') =>
    error(ErrorCodes.UNAUTHORIZED, message, 401),

  forbidden: (message: string = 'Access denied') =>
    error(ErrorCodes.UNAUTHORIZED, message, 403),

  notFound: (resource: string = 'Resource') =>
    error(ErrorCodes.NOT_FOUND, `${resource} not found`, 404),

  badRequest: (message: string, details?: unknown) =>
    error(ErrorCodes.VALIDATION_ERROR, message, 400, details),

  limitReached: (message: string = 'Daily story limit reached') =>
    error(ErrorCodes.DAILY_LIMIT_REACHED, message, 429),

  internal: (message: string = 'Internal server error', details?: unknown) =>
    error(ErrorCodes.INTERNAL_ERROR, message, 500, details),

  externalApi: (service: string, details?: unknown) =>
    error(
      ErrorCodes.EXTERNAL_API_ERROR,
      `${service} API error`,
      502,
      details
    ),
};
