/**
 * Shared utilities for Supabase Edge Functions.
 *
 * @example
 * import { CORS_HEADERS, handleCors, authenticate, success, errors } from '../_shared/index.ts';
 */

export { CORS_HEADERS, handleCors, responseHeaders } from './cors.ts';
export {
  ErrorCodes,
  success,
  error,
  errors,
  type ErrorCode,
} from './response.ts';
export {
  authenticate,
  isAuthError,
  createAuthenticatedClient,
  createServiceClient,
  type AuthResult,
} from './auth.ts';
