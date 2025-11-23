# Supabase Setup Guide for MyStories

## 🔧 Quick Setup

Your Supabase Project ID: `yzifogzrytwpxnaylnga`
Your Project URL: `https://yzifogzrytwpxnaylnga.supabase.co`

## 📝 Step 1: Get Your API Keys

1. Go to: https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga
2. Click **Settings** (gear icon) in the left sidebar
3. Click **API** in the settings menu
4. Copy your **anon/public** key (starts with `eyJ...`)

## 📋 Step 2: Update Your .env File

1. Open `.env` file in the project root
2. Replace `paste_your_anon_key_here` with your actual anon key
3. Save the file

## 🗄️ Step 3: Set Up Database

Run these commands in order:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref yzifogzrytwpxnaylnga

# Push all database migrations
supabase db push
```

## ⚡ Step 4: Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy generate-story
supabase functions deploy generate-story-stream
supabase functions deploy generate-image
supabase functions deploy generate-cover-image
supabase functions deploy text-to-speech
supabase functions deploy process-story-queue
supabase functions deploy get-trending-stories
```

## 🔐 Step 5: Set Edge Function Secrets

Go to: https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga/settings/vault

Add these secrets:
- `OPENAI_API_KEY`: Your OpenAI API key for GPT-4 and DALL-E
- `STRIPE_SECRET_KEY`: Your Stripe secret key (if using payments)
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret (if using payments)

## 🪣 Step 6: Create Storage Bucket

1. Go to: https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga/storage/buckets
2. Click "Create bucket"
3. Name: `story-images`
4. Make it PUBLIC
5. Click "Create"

## 🔒 Step 7: Configure Authentication

1. Go to: https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga/auth/providers
2. Enable **Email** provider
3. Optional: Enable social providers (Google, Apple, etc.)

## 🚀 Step 8: Test Your Setup

```bash
# Start the development server
npm run dev

# Open http://localhost:5173
# Try creating an account and generating a story
```

## 📊 Database Schema Overview

Your database includes these main tables:
- `stories` - Story metadata
- `story_nodes` - Individual story scenes
- `story_choices` - Branching paths
- `user_profiles` - User information
- `user_story_progress` - Reading progress
- `user_bookmarks` - Saved stories
- `story_reactions` - Likes/dislikes

## 🛠️ Troubleshooting

### If migrations fail:
1. Check you're using the correct project ID
2. Ensure you have the correct permissions
3. Try running migrations one by one from `supabase/migrations/`

### If edge functions don't deploy:
1. Make sure you're logged in: `supabase login`
2. Check your project is linked: `supabase projects list`
3. Verify your OpenAI API key is set in Vault

### If authentication doesn't work:
1. Check your anon key in `.env`
2. Verify email provider is enabled in Supabase dashboard
3. Check your site URL settings in Authentication settings

## 📞 Need Help?

- Supabase Docs: https://supabase.com/docs
- Discord: https://discord.supabase.com
- Your project dashboard: https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga