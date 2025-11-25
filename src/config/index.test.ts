/**
 * Tests for configuration module.
 */

import { describe, it, expect } from 'vitest';
import { config } from './index';

describe('config', () => {
  it('should have supabase configuration', () => {
    expect(config.supabase).toBeDefined();
    expect(config.supabase.url).toBeDefined();
    expect(config.supabase.anonKey).toBeDefined();
    expect(config.supabase.functionsUrl).toContain('/functions/v1');
  });

  it('should have API configuration', () => {
    expect(config.api).toBeDefined();
    expect(config.api.timeout).toBe(30000);
    expect(config.api.retryAttempts).toBe(3);
  });

  it('should have gamification points configuration', () => {
    expect(config.gamification.points).toBeDefined();
    expect(config.gamification.points.readChapter).toBe(10);
    expect(config.gamification.points.completeStory).toBe(50);
    expect(config.gamification.points.createStory).toBe(100);
    expect(config.gamification.points.receiveLike).toBe(5);
  });

  it('should have subscription limits', () => {
    expect(config.limits.free.storiesPerDay).toBe(1);
    expect(config.limits.pro.storiesPerDay).toBe(Infinity);
  });

  it('should have cache settings', () => {
    expect(config.cache.storyPrefix).toBe('mystories_cache_');
    expect(config.cache.duration).toBe(86400000); // 24 hours in ms
  });
});
