import { describe, it, expect } from 'vitest';
import { queryClient, queryKeys } from './queryClient';

describe('queryClient', () => {
  describe('default options', () => {
    it('should have staleTime configured', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should have gcTime configured', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.gcTime).toBe(10 * 60 * 1000); // 10 minutes
    });

    it('should have retry configured', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.retry).toBe(2);
    });

    it('should have refetchOnWindowFocus disabled', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    });

    it('should have mutation retry configured', () => {
      const defaults = queryClient.getDefaultOptions();
      expect(defaults.mutations?.retry).toBe(1);
    });
  });
});

describe('queryKeys', () => {
  describe('profile keys', () => {
    it('should generate profile key', () => {
      const key = queryKeys.profile('user-123');
      expect(key).toEqual(['profile', 'user-123']);
    });

    it('should generate publicProfile key', () => {
      const key = queryKeys.publicProfile('user-123');
      expect(key).toEqual(['publicProfile', 'user-123']);
    });

    it('should generate subscriptionUsage key', () => {
      const key = queryKeys.subscriptionUsage('user-123');
      expect(key).toEqual(['subscriptionUsage', 'user-123']);
    });
  });

  describe('story keys', () => {
    it('should generate stories key', () => {
      const key = queryKeys.stories();
      expect(key).toEqual(['stories']);
    });

    it('should generate story key with id', () => {
      const key = queryKeys.story('story-123');
      expect(key).toEqual(['story', 'story-123']);
    });

    it('should generate userStories key', () => {
      const key = queryKeys.userStories('user-123');
      expect(key).toEqual(['userStories', 'user-123']);
    });

    it('should generate storyReactions key', () => {
      const key = queryKeys.storyReactions('story-123');
      expect(key).toEqual(['storyReactions', 'story-123']);
    });

    it('should generate userReaction key', () => {
      const key = queryKeys.userReaction('user-123', 'story-456');
      expect(key).toEqual(['userReaction', 'user-123', 'story-456']);
    });
  });

  describe('follow keys', () => {
    it('should generate followers key', () => {
      const key = queryKeys.followers('user-123');
      expect(key).toEqual(['followers', 'user-123']);
    });

    it('should generate following key', () => {
      const key = queryKeys.following('user-123');
      expect(key).toEqual(['following', 'user-123']);
    });

    it('should generate isFollowing key', () => {
      const key = queryKeys.isFollowing('user-123', 'user-456');
      expect(key).toEqual(['isFollowing', 'user-123', 'user-456']);
    });
  });

  describe('feed keys', () => {
    it('should generate feed key', () => {
      const key = queryKeys.feed();
      expect(key).toEqual(['feed']);
    });

    it('should generate publicStories key', () => {
      const key = queryKeys.publicStories();
      expect(key).toEqual(['publicStories']);
    });
  });

  describe('key uniqueness', () => {
    it('should generate unique keys for different users', () => {
      const key1 = queryKeys.profile('user-1');
      const key2 = queryKeys.profile('user-2');

      expect(key1).not.toEqual(key2);
    });

    it('should generate unique keys for different entities', () => {
      const profileKey = queryKeys.profile('user-123');
      const storyKey = queryKeys.story('user-123');

      expect(profileKey).not.toEqual(storyKey);
    });
  });
});
