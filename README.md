# MyStories

AI-powered interactive YA stories with streaming generation, illustrations, narration, and gamification. Readers branch through stories with choices, track progress, react, and follow creators. Creators can generate YA narratives or adult comic-style stories with consistent art via a story bible.

## What’s Inside
- **Story creation**: Generate the first chapter instantly, then continue paths on demand (DeepSeek). Optional background queue to pre-generate more nodes.
- **Media**: Cover/chapter images via DALL-E 3 or Leonardo; OpenAI TTS narration with word highlighting.
- **Comic mode**: Story bible + chapter generation for adult comics with consistent art prompts and optional panel images.
- **Engagement**: Likes/dislikes, follows, trending feed, reading progress/completions, quests, streaks, and points.
- **Monetization**: Stripe checkout/portal with free (1 story/day) vs Pro (unlimited) enforcement in edge functions.

## Tech
- React 18 + TypeScript, Vite, Tailwind, React Router 7, Zustand.
- Supabase: Auth, Postgres (RLS), Storage, and many Edge Functions.
- AI providers: DeepSeek (text), OpenAI (images/tts), Leonardo (alt images).
- Payments: Stripe Checkout + webhooks.

## Key Paths
- `src/components`: StoryReader, StoryCreator, ComicCreator, StoryLibrary/Detail, Profile/PublicProfile, Quests, Subscription UI.
- `src/lib`: Supabase client, services (story/quests/points/subscription/follow/stripe), story bible tooling, streaming helper.
- `supabase/functions`: 
  - Generation: `generate-story`, `generate-story-stream`, `generate-image`, `generate-cover-image`, `generate-all-images`, `generate-story-bible`, `generate-comic-chapter`, `text-to-speech`.
  - Pipelines/queues: `process-story-queue`, `process-comic-queue`, `get-trending-stories`.
  - Gamification: `get-quests`, `progress-quest`, `track-activity`.
  - Billing: `create-checkout`, `customer-portal`, `stripe-checkout`, `stripe-webhook`.
- `supabase/migrations`: Tables for stories/nodes/choices/bibles, generation queue, reactions, reading_progress & story_completions, quests/streaks, bookmarks, follow graph, Stripe tables, subscription/usage counters.
- Docs: `GAMIFICATION_STRATEGY.md`, `GAMIFICATION_EXAMPLES.md`, `PERFORMANCE_OPTIMIZATIONS.md`, `MOBILE_APP_GUIDE.md`, `SUPABASE_SETUP.md`, `STRIPE_SETUP.md`.

## Environment
Frontend `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_PRICE_MONTHLY=
VITE_STRIPE_PRICE_ANNUAL=
```

Edge Function secrets (Supabase):
```
SUPABASE_URL=              # provided by Supabase
SUPABASE_ANON_KEY=         # "
SUPABASE_SERVICE_ROLE_KEY= # needed for queue/process functions
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
LEONARDO_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Setup
1) Install deps: `npm install`  
2) Configure `.env` with Supabase + Stripe keys above.  
3) Supabase (CLI):
```
supabase link --project-ref <project-id>
supabase db push
supabase functions deploy generate-story generate-story-stream generate-image generate-cover-image generate-all-images generate-story-bible generate-comic-chapter process-story-queue process-comic-queue text-to-speech get-trending-stories get-quests progress-quest create-checkout customer-portal stripe-checkout stripe-webhook track-activity
```
Create public storage buckets `story-images` and `avatars`.  
4) Run dev server: `npm run dev` (Vite).  
5) Tests: `npm run test` (vitest, minimal coverage for config/error helpers).

## How It Works (high level)
- **Story flow**: Frontend hits `generate-story` (DeepSeek) to seed chapters + choices, writes nodes/choices in Supabase, then optionally queues `process-story-queue` to expand branches; `generate-image`/`generate-cover-image` fill media; `text-to-speech` adds narration.
- **Comic flow**: `generate-story-bible` crafts characters/style; `generate-comic-chapter` + `generate-image`/`text-to-speech` build panel-ready chapters; `process-comic-queue` expands pending nodes.
- **Engagement**: `progress-quest`/`get-quests` manage streaks/quests; `track-activity` stamps last seen; reactions/follows stored in Postgres.
- **Billing**: `create-checkout`/`stripe-checkout` start Stripe sessions; `stripe-webhook` syncs status and profile tier; frontend enforces free 1/day vs Pro unlimited.

## Notes
- Performance tweaks documented in `PERFORMANCE_OPTIMIZATIONS.md` (non-blocking images, trimmed prompts, indexes).
- Mobile wrapper guidance lives in `MOBILE_APP_GUIDE.md` (Capacitor).
- Project ID in `SUPABASE_SETUP.md` is prefilled; update if you fork to a new Supabase project.

## Scripts
- `npm run dev` – start Vite
- `npm run build` – production bundle
- `npm run lint` – eslint
- `npm run test` / `npm run test:run` / `npm run test:coverage` – vitest
