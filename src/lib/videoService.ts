import { supabase } from './supabase';

interface GenerateVideoParams {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
}

export async function generateChapterVideo(params: GenerateVideoParams): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        duration: params.durationSeconds ?? 8,
        aspectRatio: params.aspectRatio ?? '16:9',
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate video');
  }

  const data = await response.json();
  return data.videoUrl || null;
}
