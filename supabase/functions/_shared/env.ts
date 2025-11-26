/**
 * Environment variable validation for Edge Functions.
 * Validates required environment variables and provides type-safe access.
 */

interface EdgeFunctionEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  missing: string[];
}

/**
 * Required environment variables for Edge Functions.
 */
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/**
 * Optional environment variables with their purpose.
 */
const OPTIONAL_VARS: Record<string, string> = {
  'DEEPSEEK_API_KEY': 'Required for story generation',
  'OPENAI_API_KEY': 'Required for text-to-speech',
  'LEONARDO_API_KEY': 'Required for image generation',
  'STRIPE_SECRET_KEY': 'Required for payment processing',
  'STRIPE_WEBHOOK_SECRET': 'Required for Stripe webhooks',
};

/**
 * Validates all required environment variables.
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const missing: string[] = [];

  for (const varName of REQUIRED_VARS) {
    const value = Deno.env.get(varName);
    if (!value) {
      missing.push(varName);
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    missing,
  };
}

/**
 * Validates environment and throws if invalid.
 */
export function requireEnv(): EdgeFunctionEnv {
  const validation = validateEnv();

  if (!validation.valid) {
    throw new Error(
      `Environment validation failed:\n${validation.errors.join('\n')}`
    );
  }

  return {
    supabaseUrl: Deno.env.get('SUPABASE_URL')!,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
    supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  };
}

/**
 * Gets an optional environment variable with a warning if missing.
 */
export function getOptionalEnv(key: string): string | undefined {
  const value = Deno.env.get(key);
  if (!value && OPTIONAL_VARS[key]) {
    console.warn(`Warning: ${key} is not set - ${OPTIONAL_VARS[key]}`);
  }
  return value;
}

/**
 * Gets a required environment variable or throws.
 */
export function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Validates that a specific set of environment variables are present.
 * Use this at the start of a function to ensure dependencies are available.
 */
export function requireVars(vars: string[]): void {
  const missing: string[] = [];

  for (const varName of vars) {
    if (!Deno.env.get(varName)) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}
