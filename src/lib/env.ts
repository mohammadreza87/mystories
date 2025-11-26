/**
 * Environment variable validation.
 * Validates all required environment variables at startup and provides
 * type-safe access to configuration values.
 */

interface EnvConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  stripe: {
    publishableKey: string;
  };
  isDev: boolean;
  isProd: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a single environment variable.
 */
function validateEnvVar(
  key: string,
  required: boolean = true
): { value: string | undefined; error?: string } {
  const value = import.meta.env[key];

  if (required && !value) {
    return { value: undefined, error: `Missing required environment variable: ${key}` };
  }

  return { value: value || undefined };
}

/**
 * Validates URL format.
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates all environment variables and returns detailed results.
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required variables
  const supabaseUrl = validateEnvVar('VITE_SUPABASE_URL');
  const supabaseAnonKey = validateEnvVar('VITE_SUPABASE_ANON_KEY');

  if (supabaseUrl.error) errors.push(supabaseUrl.error);
  if (supabaseAnonKey.error) errors.push(supabaseAnonKey.error);

  // Validate URL format
  if (supabaseUrl.value && !isValidUrl(supabaseUrl.value)) {
    errors.push('VITE_SUPABASE_URL is not a valid URL');
  }

  // Optional variables with warnings
  const stripeKey = validateEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', false);
  if (!stripeKey.value) {
    warnings.push('VITE_STRIPE_PUBLISHABLE_KEY is not set - payment features will be disabled');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gets validated environment configuration.
 * Throws if required variables are missing.
 */
export function getEnvConfig(): EnvConfig {
  const validation = validateEnvironment();

  if (!validation.valid) {
    const errorMessage = [
      'Environment validation failed:',
      ...validation.errors.map((e) => `  - ${e}`),
    ].join('\n');
    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (import.meta.env.DEV && validation.warnings.length > 0) {
    console.warn(
      'Environment warnings:\n' +
        validation.warnings.map((w) => `  - ${w}`).join('\n')
    );
  }

  return {
    supabase: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    stripe: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
    },
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  };
}

/**
 * Singleton instance of validated environment config.
 * Call this once at app startup to validate and cache config.
 */
let envConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!envConfig) {
    envConfig = getEnvConfig();
  }
  return envConfig;
}

/**
 * Check if all required environment variables are set.
 * Use this for quick checks without throwing.
 */
export function isEnvironmentValid(): boolean {
  return validateEnvironment().valid;
}
