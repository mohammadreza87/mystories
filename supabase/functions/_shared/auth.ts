/**
 * Shared authentication utilities for edge functions.
 */

import { createClient, SupabaseClient, User } from 'npm:@supabase/supabase-js@2';
import { errors } from './response.ts';

/**
 * Create a Supabase client with user authentication.
 */
export function createAuthenticatedClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

/**
 * Create a Supabase client with service role (admin) access.
 * Use only when necessary for operations that bypass RLS.
 */
export function createServiceClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, serviceRoleKey);
}

/**
 * Authentication result type.
 */
export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

/**
 * Authenticate a request and return the user and client.
 * Returns a Response if authentication fails.
 */
export async function authenticate(
  req: Request
): Promise<AuthResult | Response> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return errors.unauthorized('No authorization header provided');
  }

  const supabase = createAuthenticatedClient(authHeader);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return errors.unauthorized('Invalid or expired token');
  }

  return { user, supabase };
}

/**
 * Check if authentication result is an error response.
 */
export function isAuthError(result: AuthResult | Response): result is Response {
  return result instanceof Response;
}
