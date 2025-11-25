import { supabase } from './supabase';

interface StreamCallbacks {
  onProgress?: (content: string) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

export async function generateStoryStream(
  params: {
    storyContext?: string;
    userChoice?: string;
    previousContent?: string;
    storyTitle?: string;
    userPrompt?: string;
    generateFullStory?: boolean;
    chapterCount?: number;
  },
  callbacks: StreamCallbacks
) {
  const { data: session } = await supabase.auth.getSession();

  if (!session?.session) {
    callbacks.onError?.('Not authenticated');
    return;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    callbacks.onError?.('Supabase URL not configured');
    return;
  }

  const url = `${supabaseUrl}/functions/v1/generate-story-stream`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      callbacks.onError?.(error.error || 'Failed to generate story');
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    if (!reader) {
      callbacks.onError?.('No response stream available');
      return;
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data) {
            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'progress' && parsed.content) {
                callbacks.onProgress?.(parsed.content);
              } else if (parsed.type === 'complete' && parsed.data) {
                callbacks.onComplete?.(parsed.data);
              } else if (parsed.type === 'error') {
                callbacks.onError?.(parsed.error);
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
  }
}

// Cache management
const CACHE_KEY_PREFIX = 'mina_story_cache_';
const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours

interface CachedResponse {
  data: any;
  timestamp: number;
}

export function getCachedResponse(key: string): any | null {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (!cached) return null;

    const { data, timestamp }: CachedResponse = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp > CACHE_DURATION) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function setCachedResponse(key: string, data: any): void {
  try {
    const cacheData: CachedResponse = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, JSON.stringify(cacheData));
  } catch (e) {
    // Handle storage quota exceeded
    console.warn('Failed to cache response:', e);
    // Clear old cache entries
    clearOldCache();
  }
}

function clearOldCache(): void {
  const keys = Object.keys(localStorage);
  const now = Date.now();

  for (const key of keys) {
    if (key.startsWith(CACHE_KEY_PREFIX)) {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const { timestamp }: CachedResponse = JSON.parse(cached);
          if (now - timestamp > CACHE_DURATION) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }
}

// Pre-generate common story patterns
export async function preGenerateCommonPatterns(): Promise<void> {
  const commonPatterns = [
    'adventure', 'magic', 'friendship', 'courage', 'discovery',
    'animals', 'space', 'underwater', 'forest', 'castle'
  ];

  // Only pre-generate if user has Pro subscription
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, is_grandfathered')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || (profile.subscription_tier !== 'pro' && !profile.is_grandfathered)) {
    return;
  }

  // Check which patterns are not cached
  const uncachedPatterns = commonPatterns.filter(
    pattern => !getCachedResponse(`pattern_${pattern}`)
  );

  // Pre-generate in background (don't await)
  for (const pattern of uncachedPatterns) {
    // Add small delay to avoid overwhelming the API
    setTimeout(async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) return;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              userPrompt: `A ${pattern} story`,
              generateFullStory: true,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCachedResponse(`pattern_${pattern}`, data);
        }
      } catch {
        // Ignore errors in pre-generation
      }
    }, Math.random() * 5000); // Random delay up to 5 seconds
  }
}