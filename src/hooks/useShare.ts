import { useCallback } from 'react';
import { useToast } from '../components/Toast';

interface UseShareResult {
  share: (url: string, title: string, text?: string) => Promise<boolean>;
  shareStory: (storyId: string, storyTitle: string, description?: string, coverUrl?: string) => Promise<boolean>;
}

export function useShare(): UseShareResult {
  const { showToast } = useToast();

  const share = useCallback(async (url: string, title: string, text?: string): Promise<boolean> => {
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: text || title,
          url,
        });
        return true;
      } catch (error) {
        // User cancelled or error
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
        return false;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard!', 'success');
      return true;
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showToast('Failed to copy link', 'error');
      return false;
    }
  }, [showToast]);

  const shareStory = useCallback(
    async (
      storyId: string,
      storyTitle: string,
      description?: string,
      coverUrl?: string
    ): Promise<boolean> => {
      const redirect = `${window.location.origin}/story/${storyId}`;
      const ogUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-story?storyId=${storyId}&redirect=${encodeURIComponent(redirect)}`;

      // For native share we keep the canonical URL; crawlers will hit the OG endpoint
      const shareUrl = ogUrl;
      const text = description
        ? `${description.slice(0, 160)}`
        : `Check out this interactive story: ${storyTitle}`;

      return share(shareUrl, storyTitle, text);
    },
    [share]
  );

  return { share, shareStory };
}
