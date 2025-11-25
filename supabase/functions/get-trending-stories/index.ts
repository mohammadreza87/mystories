import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get trending stories based on recent likes and completions
    const { data: trendingStories, error } = await supabase
      .from('stories')
      .select(`
        *,
        creator:user_profiles!stories_created_by_fkey(
          display_name,
          avatar_url
        )
      `)
      .eq('is_public', true)
      .order('likes_count', { ascending: false })
      .order('completion_count', { ascending: false })
      .limit(10)

    if (error) throw error

    // Calculate a trending score (you can adjust the algorithm)
    const storiesWithScore = trendingStories.map(story => ({
      ...story,
      trending_score: (story.likes_count || 0) * 2 + (story.completion_count || 0)
    }))

    // Sort by trending score
    storiesWithScore.sort((a, b) => b.trending_score - a.trending_score)

    return new Response(
      JSON.stringify({ stories: storiesWithScore }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})