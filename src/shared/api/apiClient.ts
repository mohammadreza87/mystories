/**
 * Shared API client for authenticated Supabase Edge Function calls.
 * Eliminates duplicated auth boilerplate across services.
 */

import { supabase } from '../../lib/supabase';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
}

/**
 * Make an authenticated request to a Supabase Edge Function.
 * Handles auth token retrieval and error formatting.
 */
export async function apiRequest<T>(
  functionName: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'POST', body, requireAuth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new ApiError('Not authenticated', 401, 'UNAUTHENTICATED');
    }
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(
      errorData.error || `Request failed: ${response.statusText}`,
      response.status,
      errorData.code
    );
  }

  return response.json();
}

/**
 * Check if an error is a billing/rate limit issue (non-critical).
 * Used to gracefully handle optional features like TTS and image generation.
 */
export function isBillingError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 400 || error.status === 429;
  }
  return false;
}
