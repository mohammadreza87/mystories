/**
 * Shared CORS configuration for all edge functions.
 * Import this instead of defining CORS headers in each function.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey',
} as const;

/**
 * Handle CORS preflight requests.
 * Use at the start of every edge function.
 *
 * @example
 * if (req.method === 'OPTIONS') {
 *   return handleCors();
 * }
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

/**
 * Create response headers with CORS and optional content type.
 */
export function responseHeaders(
  contentType: string = 'application/json'
): Record<string, string> {
  return {
    ...CORS_HEADERS,
    'Content-Type': contentType,
  };
}
