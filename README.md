# MyStories - AI-Powered Interactive Story Platform

**Create, share, and experience Young Adult interactive stories with AI-generated illustrations and narration.**

MyStories is a modern web application focused on Young Adult (YA) storytelling - featuring post-apocalyptic survival, sci-fi time travel, supernatural mysteries, and emotional adventures. Create your own branching YA narratives inspired by stories like Hunger Games, Stranger Things, and more, where each choice shapes your unique journey.

## Featured YA Genres

### Core Themes
- **Post-Apocalyptic Survival**: Stories inspired by Hunger Games and Maze Runner
- **Sci-Fi & Time Travel**: Mind-bending adventures through time and space
- **Mystery & Supernatural**: Stranger Things-style mysteries with supernatural elements
- **Emotional Drama & Adventure**: Heartfelt stories combining romance, friendship, and adventure

## Features

### Story Creation
- **AI-Powered Generation**: Automatically generate complete interactive stories with multiple branching paths
- **Dynamic Content**: Stories adapt based on reader choices, creating unique experiences
- **Visual Storytelling**: AI-generated illustrations for every scene using DALL-E
- **Audio Narration**: Text-to-speech narration brings stories to life
- **Customizable Settings**: Choose age ranges, themes, and story length

### Story Library
- **Discover Stories**: Browse a curated collection of public stories
- **Reading Experience**: Immersive reader interface with choices that matter
- **Progress Tracking**: Automatic save and resume functionality
- **Social Features**: Like/dislike stories and follow favorite creators
- **Multiple Endings**: Stories feature different outcomes based on your choices

### User Features
- **Profiles**: Customizable user profiles with avatars and bios
- **Story Management**: Organize your created stories and reading history
- **Subscription Tiers**:
  - **Free**: 1 story generation per day
  - **Pro**: Unlimited story generation with priority processing

### Technical Highlights
- **Real-time Generation**: Watch stories come to life as they're generated
- **Responsive Design**: Beautiful experience across all devices
- **Secure Authentication**: Email/password authentication with Supabase
- **Payment Integration**: Stripe-powered subscription management
- **Progressive Image Loading**: Optimized media delivery

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for modern, responsive styling
- **Lucide React** for beautiful icons
- **React Router** for seamless navigation

### Backend
- **Supabase** for database, authentication, and storage
- **PostgreSQL** with Row Level Security for data protection
- **Edge Functions** (Deno) for serverless API endpoints

### AI & Media
- **OpenAI GPT-4** for story generation
- **DALL-E 3** for image generation
- **OpenAI TTS** for audio narration

### Payment Processing
- **Stripe Checkout** for subscriptions
- **Stripe Webhooks** for real-time subscription updates

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account
- OpenAI API key
- Stripe account (for subscriptions)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mystories
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

4. Set up Supabase:
- Create a new Supabase project
- Run the migrations in `supabase/migrations/` in order
- Configure environment variables in Supabase Edge Functions:
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

5. Start the development server:
```bash
npm run dev
```

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   └── subscription/   # Subscription components
│   ├── lib/                # Utilities and services
│   │   ├── supabase.ts    # Supabase client
│   │   ├── authContext.tsx # Authentication context
│   │   └── types.ts       # TypeScript types
│   ├── pages/             # Page components
│   └── App.tsx            # Main app component
├── supabase/
│   ├── functions/         # Edge functions
│   │   ├── generate-story/       # Story generation
│   │   ├── generate-image/       # Image generation
│   │   ├── text-to-speech/       # Audio generation
│   │   ├── create-checkout/      # Stripe checkout
│   │   └── stripe-webhook/       # Stripe webhooks
│   └── migrations/        # Database migrations
└── dist/                  # Production build
```

## Database Schema

### Core Tables
- **stories**: Story metadata and generation status
- **story_nodes**: Individual story scenes/chapters
- **story_choices**: Branching decision points
- **user_story_progress**: Reading progress tracking
- **user_profiles**: User information and preferences
- **story_reactions**: Likes/dislikes for stories

### Subscription Tables
- **stripe_customers**: User to Stripe customer mapping
- **stripe_subscriptions**: Subscription status and details

## Key Features Implementation

### Story Generation Pipeline
1. User provides story parameters (theme, age range, language)
2. Backend generates story structure with GPT-4
3. Story queued for processing
4. Each node generated with content and image prompts
5. Images generated with DALL-E 3
6. Audio narration created with OpenAI TTS
7. Real-time progress updates to frontend

### Subscription System
1. User selects plan (Free or Pro)
2. Stripe Checkout session created
3. User completes payment
4. Webhook updates subscription status
5. User profile upgraded to Pro tier
6. Usage limits automatically enforced

### Security
- Row Level Security (RLS) on all tables
- JWT-based authentication
- Service role for backend operations
- Secure API key management
- HTTPS-only communication

## Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

## Deployment

The application is designed to be deployed on modern hosting platforms:
- Frontend: Netlify, Vercel, or any static host
- Backend: Supabase (managed)
- Edge Functions: Supabase Edge Functions (Deno runtime)

## Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=          # Your Supabase project URL
VITE_SUPABASE_ANON_KEY=     # Supabase anonymous key
VITE_STRIPE_PUBLISHABLE_KEY= # Stripe publishable key
```

### Backend (Supabase Edge Functions)
```env
OPENAI_API_KEY=             # OpenAI API key
STRIPE_SECRET_KEY=          # Stripe secret key
STRIPE_WEBHOOK_SECRET=      # Stripe webhook signing secret
SUPABASE_URL=               # Auto-configured
SUPABASE_SERVICE_ROLE_KEY=  # Auto-configured
```

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests if applicable
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For issues, questions, or feature requests, please contact the development team.

## Acknowledgments

- OpenAI for GPT-4, DALL-E 3, and TTS APIs
- Supabase for the backend infrastructure
- Stripe for payment processing
- The open-source community for amazing tools and libraries
