# MyStories

An AI-powered interactive storytelling platform that generates personalized, branching narratives with AI-generated illustrations and text-to-speech narration. Users can create, read, and share stories tailored for children (5-10), young adults (13-18), or adults (18+).

## Features

### Story Generation
- **Dynamic AI Narratives**: DeepSeek AI generates unique, branching storylines in real-time
- **Multiple Audience Levels**: Age-appropriate content for children, YA, and adult readers
- **Interactive Choices**: 2-3 meaningful choices per chapter that shape the narrative direction
- **Story Bible System**: Maintains character appearance and visual consistency across chapters
- **Multi-language Support**: Stories generated in the user's detected language

### Visual & Audio
- **AI Image Generation**: Leonardo AI creates comic book style illustrations with multiple artistic styles:
  - Noir (Sin City inspired)
  - Manga (anime/seinen style)
  - Western Comic (superhero style)
  - Cyberpunk (neon-soaked dystopia)
  - Horror (Junji Ito inspired)
  - Dark Fantasy (Frazetta/Moebius inspired)
- **Text-to-Speech**: OpenAI TTS HD with the "sage" voice for professional narration
- **Content Sanitization**: Smart filtering for image prompts to avoid moderation issues

### User Features
- **User Profiles**: Customizable avatars, bios, and usernames
- **Story Library**: Browse public stories, trending content, and manage your collection
- **Social Features**: Follow creators, like/dislike stories, view follower counts
- **Reading Progress**: Track completion across all stories with path history
- **Bookmarks**: Save stories to read later

### Gamification
- **Points System**: Earn points for reading (1/chapter), completing stories (5), and creating (5)
- **Quests**: Daily and weekly challenges with rewards
- **Activity Tracking**: Streak tracking for engagement

### Subscription Model
- **Free Tier**: 1 story generation per day
- **Pro Tier ($9.99/month or $79.99/year)**: Unlimited story generation
- **Grandfathered Users**: Legacy unlimited access for early adopters

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Styling |
| Zustand | State management |
| React Router 7 | Navigation |
| Lucide React | Icons |

### Backend (Supabase)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Primary database with RLS |
| Supabase Auth | Email/OAuth authentication |
| Supabase Storage | Images and audio files |
| Edge Functions | Serverless API endpoints |

### AI Services
| Provider | Purpose |
|----------|---------|
| DeepSeek | Story text generation (`deepseek-chat` model) |
| Leonardo AI | Image generation (multiple models: Lucid Origin, Phoenix, Anime XL, Kino XL) |
| OpenAI | Text-to-speech (`tts-1-hd` model) |

### Payments
| Service | Purpose |
|---------|---------|
| Stripe | Subscriptions, webhooks, customer portal |

## Project Structure

```
mystories/
├── src/
│   ├── components/
│   │   ├── Auth.tsx              # Email/password authentication
│   │   ├── StoryCreator.tsx      # Children/YA story creation wizard
│   │   ├── ComicCreator.tsx      # Adult comic story creation
│   │   ├── StoryReader.tsx       # Interactive story reading interface
│   │   ├── StoryLibrary.tsx      # Story browsing and discovery
│   │   ├── StoryDetail.tsx       # Individual story view
│   │   ├── Profile.tsx           # User profile management
│   │   ├── PublicProfile.tsx     # Public profile viewing
│   │   ├── ProfileEdit.tsx       # Profile editing modal
│   │   ├── Quests.tsx            # Quest/achievement display
│   │   ├── UpgradeModal.tsx      # Subscription upgrade prompt
│   │   ├── UsageBadge.tsx        # Story generation limits display
│   │   ├── NavigationBar.tsx     # Bottom navigation
│   │   └── ...
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client configuration
│   │   ├── authContext.tsx       # Authentication context provider
│   │   ├── storyService.ts       # Story CRUD operations
│   │   ├── storyStreamService.ts # Real-time story streaming
│   │   ├── storyBibleService.ts  # Character/style consistency
│   │   ├── subscriptionService.ts# Subscription management
│   │   ├── pointsService.ts      # Points system
│   │   ├── questsService.ts      # Quest management
│   │   ├── followService.ts      # Social follow system
│   │   ├── stripe.ts             # Stripe checkout helpers
│   │   ├── errors.ts             # Error handling utilities
│   │   ├── types.ts              # TypeScript interfaces
│   │   ├── database.types.ts     # Supabase generated types
│   │   ├── storyBible.types.ts   # Story bible type definitions
│   │   └── comicPrompts.ts       # Comic style configurations
│   ├── stores/
│   │   ├── authStore.ts          # Zustand auth state
│   │   └── subscriptionStore.ts  # Zustand subscription state
│   ├── routes/
│   │   └── index.tsx             # Route definitions
│   ├── config/
│   │   └── index.ts              # App configuration
│   ├── config.ts                 # Subscription limits config
│   ├── App.tsx                   # Root component with routing
│   └── main.tsx                  # Application entry point
├── supabase/
│   ├── functions/
│   │   ├── generate-story/       # Story generation (DeepSeek)
│   │   ├── generate-story-stream/# Streaming story generation
│   │   ├── generate-image/       # Chapter images (Leonardo)
│   │   ├── generate-cover-image/ # Cover images
│   │   ├── generate-all-images/  # Batch image generation
│   │   ├── generate-story-bible/ # Story consistency system
│   │   ├── generate-comic-chapter/# Comic chapter generation
│   │   ├── text-to-speech/       # Narration (OpenAI TTS)
│   │   ├── process-story-queue/  # Background story expansion
│   │   ├── process-comic-queue/  # Background comic expansion
│   │   ├── get-trending-stories/ # Trending algorithm
│   │   ├── get-quests/           # Quest retrieval
│   │   ├── progress-quest/       # Quest completion
│   │   ├── track-activity/       # Activity tracking
│   │   ├── create-checkout-session/# Stripe checkout
│   │   ├── create-customer-portal-session/# Stripe billing portal
│   │   ├── stripe-webhook/       # Payment event handling
│   │   └── stripe-checkout/      # Alternative checkout flow
│   └── migrations/               # 20+ SQL migration files
├── public/                       # Static assets
├── tests/                        # Vitest test files
└── docs/
    ├── GAMIFICATION_STRATEGY.md  # Full gamification roadmap
    ├── GAMIFICATION_EXAMPLES.md  # Implementation examples
    ├── PERFORMANCE_OPTIMIZATIONS.md
    ├── MOBILE_APP_GUIDE.md       # Capacitor wrapper guide
    ├── SUPABASE_SETUP.md
    └── STRIPE_SETUP.md
```

## Database Schema

### Core Story Tables
| Table | Description |
|-------|-------------|
| `stories` | Story metadata, visibility, audience, cover images |
| `story_nodes` | Individual chapters with content, images, audio |
| `story_choices` | Branching paths between nodes |
| `story_bibles` | Character descriptions, art style, visual consistency |
| `generation_queue` | Background generation job queue |

### User Tables
| Table | Description |
|-------|-------------|
| `user_profiles` | Profile data, subscription tier, usage tracking |
| `user_story_progress` | Reading progress with path history |
| `user_bookmarks` | Saved stories |
| `story_reactions` | Likes/dislikes with denormalized counts |
| `user_follows` | Social graph for creator following |
| `user_quests` | Quest/achievement progress |
| `user_activity` | Activity tracking for streaks |

### Subscription Tables
| Table | Description |
|-------|-------------|
| `stripe_customers` | Stripe customer ID mapping |
| `stripe_subscriptions` | Active subscription details |
| `stripe_orders` | One-time payment records |

## Environment Variables

### Frontend (`.env`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_STRIPE_PRICE_MONTHLY=price_monthly_id
VITE_STRIPE_PRICE_ANNUAL=price_annual_id
```

### Edge Functions (Supabase Vault)
```env
# Automatically provided by Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Required secrets
DEEPSEEK_API_KEY=sk-...        # DeepSeek API for story generation
LEONARDO_API_KEY=...            # Leonardo AI for images
OPENAI_API_KEY=sk-...           # OpenAI for text-to-speech
STRIPE_SECRET_KEY=sk_live_...   # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Stripe webhook signing
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase CLI (`npm install -g supabase`)
- API keys for all services

### Installation

1. **Clone and install:**
```bash
git clone <repository-url>
cd mystories
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Setup Supabase:**
```bash
supabase login
supabase link --project-ref <your-project-id>
supabase db push
```

4. **Create storage buckets** in Supabase Dashboard:
- `story-images` (public) - for story and chapter images
- `avatars` (public) - for user profile pictures

5. **Deploy Edge Functions:**
```bash
supabase functions deploy generate-story
supabase functions deploy generate-story-stream
supabase functions deploy generate-image
supabase functions deploy generate-cover-image
supabase functions deploy generate-all-images
supabase functions deploy generate-story-bible
supabase functions deploy generate-comic-chapter
supabase functions deploy text-to-speech
supabase functions deploy process-story-queue
supabase functions deploy process-comic-queue
supabase functions deploy get-trending-stories
supabase functions deploy get-quests
supabase functions deploy progress-quest
supabase functions deploy track-activity
supabase functions deploy create-checkout-session
supabase functions deploy create-customer-portal-session
supabase functions deploy stripe-webhook
```

6. **Add secrets to Supabase Vault** (Dashboard → Settings → Vault)

7. **Configure Stripe webhook** to point to your `stripe-webhook` function URL

8. **Start development:**
```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage |

## How It Works

### Story Creation Flow
1. User provides a story prompt and selects audience/style
2. Frontend calls `generate-story` Edge Function
3. DeepSeek generates story metadata + opening chapter in JSON format
4. Story and initial node saved to database
5. `generate-image` creates chapter illustration asynchronously
6. User presented with choices to continue

### Story Reading Flow
1. User selects a story from library
2. StoryReader loads current node with content, image, audio
3. User makes a choice
4. If next node exists, load it; otherwise generate on-demand
5. Progress tracked in `user_story_progress`
6. Points awarded for reading/completing

### Comic Creation Flow
1. User provides concept and selects comic style
2. `generate-story-bible` creates character descriptions and art style guide
3. `generate-comic-chapter` creates first chapter
4. `generate-image` creates consistent illustrations using style guide
5. Background queue expands future paths

### Subscription Flow
1. Free users limited to 1 story/day (enforced in `generate-story`)
2. Upgrade triggers `create-checkout-session` → Stripe Checkout
3. `stripe-webhook` receives payment events
4. `user_profiles.subscription_tier` updated to 'pro'
5. Pro users get unlimited generation

## Performance Optimizations

- **Non-blocking images**: Stories display immediately while images load asynchronously
- **Database indexes**: Optimized queries with indexes on foreign keys and common filters
- **RLS optimization**: Using `(select auth.uid())` pattern to prevent re-evaluation
- **Prompt optimization**: Reduced AI prompt verbosity and token limits
- **Image caching**: Images stored in Supabase Storage with CDN delivery

See [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) for details.

## Security Features

- **Row Level Security**: All tables protected with RLS policies
- **Auth enforcement**: Edge functions verify JWT tokens
- **Content sanitization**: Adult content prompts sanitized for image generation
- **Stripe webhook verification**: Signature validation on all webhook events
- **Function search paths**: Explicit search_path set on all database functions

## Future Roadmap

See [GAMIFICATION_STRATEGY.md](./GAMIFICATION_STRATEGY.md) for planned features:
- Reading streaks with freeze tokens
- Achievement badges with tiers
- Story collections and trading cards
- Reading clubs
- Character companions
- Seasonal events
- Mentorship system

## Documentation

| Document | Description |
|----------|-------------|
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Detailed Supabase configuration |
| [STRIPE_SETUP.md](./STRIPE_SETUP.md) | Stripe integration guide |
| [PERFORMANCE_OPTIMIZATIONS.md](./PERFORMANCE_OPTIMIZATIONS.md) | Performance tuning details |
| [GAMIFICATION_STRATEGY.md](./GAMIFICATION_STRATEGY.md) | Full gamification roadmap |
| [MOBILE_APP_GUIDE.md](./MOBILE_APP_GUIDE.md) | Capacitor mobile wrapper |

## Contributing

This is a private repository. For access or contribution guidelines, contact the development team.

## License

Private - All rights reserved
