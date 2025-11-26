import { useCallback } from 'react';
import { useToast } from '../components/Toast';

interface UseShareResult {
  share: (url: string, title: string, text?: string) => Promise<boolean>;
  shareStory: (storyId: string, storyTitle: string) => Promise<boolean>;
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

  const shareStory = useCallback(async (storyId: string, storyTitle: string): Promise<boolean> => {
    const shareUrl = `${window.location.origin}?story=${storyId}`;
    return share(shareUrl, storyTitle, `Check out this interactive story: ${storyTitle}`);
  }, [share]);

  return { share, shareStory };
}
