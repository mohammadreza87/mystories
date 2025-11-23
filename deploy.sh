#!/bin/bash

echo "🚀 Starting deployment process for MyStories..."

# 1. Run database migrations
echo "📊 Running database migrations..."
npx supabase db push

# 2. Deploy Edge Functions
echo "⚡ Deploying Edge Functions..."
npx supabase functions deploy get-trending-stories

# 3. Build the frontend
echo "🔨 Building frontend..."
npm run build

# 4. Deploy to Vercel (or your hosting provider)
echo "☁️ Deploying to Vercel..."
vercel --prod

# Alternative: Deploy to Netlify
# netlify deploy --prod

echo "✅ Deployment complete!"
echo "🎉 Your app is now live!"