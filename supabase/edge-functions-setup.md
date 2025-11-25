# Edge Functions Setup

The app uses Supabase Edge Functions for AI story generation. You need to:

## 1. Enable Edge Functions in Supabase
- Go to your Supabase project dashboard
- Navigate to Edge Functions
- Enable Edge Functions if not already enabled

## 2. Deploy the generate-story function

Create a new Edge Function called `generate-story` with this code:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, genre, ageRange } = await req.json()

    // For now, return a simple story structure
    // You can integrate with OpenAI or other AI services here
    const story = {
      title: `A ${genre} Adventure`,
      description: `An exciting ${genre} story for ${ageRange}`,
      content: {
        nodes: {
          start: {
            id: 'start',
            text: `This is the beginning of your ${genre} story. What would you like to do?`,
            choices: [
              { text: 'Explore the area', nextNode: 'explore' },
              { text: 'Talk to someone', nextNode: 'talk' }
            ]
          },
          explore: {
            id: 'explore',
            text: 'You explore the surroundings and find something interesting.',
            choices: [
              { text: 'Investigate further', nextNode: 'end' },
              { text: 'Go back', nextNode: 'start' }
            ]
          },
          talk: {
            id: 'talk',
            text: 'You meet a friendly character who gives you advice.',
            choices: [
              { text: 'Thank them', nextNode: 'end' },
              { text: 'Ask more questions', nextNode: 'start' }
            ]
          },
          end: {
            id: 'end',
            text: 'The End. Thanks for reading!',
            choices: []
          }
        },
        startNode: 'start'
      }
    }

    return new Response(
      JSON.stringify(story),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
```

## 3. Create the _shared/cors.ts file

```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

## 4. Deploy using Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref yzifogzrytwpxnaylnga

# Deploy the function
supabase functions deploy generate-story
```

## Alternative: Disable AI Generation

If you don't want to set up Edge Functions, you can modify the StoryCreator component to use a simpler story creation method without AI.