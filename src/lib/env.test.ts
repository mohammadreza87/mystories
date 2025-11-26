import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateEnvironment, getEnvConfig, isEnvironmentValid } from './env';

describe('Environment Validation', () => {
  // Store original env values
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset env to test values defined in vitest.config.ts
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_xxx');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('validateEnvironment', () => {
    it('should return valid when all required vars are present', () => {
      const result = validateEnvironment();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors when SUPABASE_URL is missing', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: VITE_SUPABASE_URL');
    });

    it('should return errors when SUPABASE_ANON_KEY is missing', () => {
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: VITE_SUPABASE_ANON_KEY');
    });

    it('should return error for invalid URL format', () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'not-a-valid-url');

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('VITE_SUPABASE_URL is not a valid URL');
    });

    it('should add warning when STRIPE_PUBLISHABLE_KEY is missing', () => {
      vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');

      const result = validateEnvironment();

      expect(result.warnings).toContain(
        'VITE_STRIPE_PUBLISHABLE_KEY is not set - payment features will be disabled'
      );
    });

    it('should return multiple errors when multiple vars are missing', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const result = validateEnvironment();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getEnvConfig', () => {
    it('should return config object when valid', () => {
      const config = getEnvConfig();

      expect(config).toEqual({
        supabase: {
          url: 'https://test.supabase.co',
          anonKey: 'test-anon-key',
        },
        stripe: {
          publishableKey: 'pk_test_xxx',
        },
        isDev: expect.any(Boolean),
        isProd: expect.any(Boolean),
      });
    });

    it('should throw when required vars are missing', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      expect(() => getEnvConfig()).toThrow('Environment validation failed');
    });
  });

  describe('isEnvironmentValid', () => {
    it('should return true when environment is valid', () => {
      expect(isEnvironmentValid()).toBe(true);
    });

    it('should return false when environment is invalid', () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');

      expect(isEnvironmentValid()).toBe(false);
    });
  });
});
