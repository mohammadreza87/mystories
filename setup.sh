#!/bin/bash

echo "🚀 Next Tale Setup Script"
echo "========================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    brew install supabase/tap/supabase
else
    echo "✅ Supabase CLI is installed"
fi

echo ""
echo "📝 Step 1: Login to Supabase"
echo "----------------------------"
echo "Run this command in your terminal:"
echo ""
echo "  supabase login"
echo ""
echo "This will open your browser to authenticate."
echo "Press Enter after you've logged in..."
read

echo ""
echo "🔗 Step 2: Link to your project"
echo "-------------------------------"
echo "Running: supabase link --project-ref yzifogzrytwpxnaylnga"
supabase link --project-ref yzifogzrytwpxnaylnga

echo ""
echo "📊 Step 3: Push database migrations"
echo "-----------------------------------"
echo "This will create all the necessary tables in your database."
echo "Continue? (y/n)"
read answer

if [ "$answer" = "y" ]; then
    echo "Pushing migrations..."
    supabase db push
    echo "✅ Database migrations complete!"
else
    echo "⏭️  Skipping database migrations"
fi

echo ""
echo "🪣 Step 4: Create storage bucket"
echo "--------------------------------"
echo "Please go to:"
echo "https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga/storage/buckets"
echo ""
echo "1. Click 'New bucket'"
echo "2. Name: story-images"
echo "3. Make it PUBLIC"
echo "4. Click 'Create'"
echo ""
echo "Press Enter when done..."
read

echo ""
echo "🔑 Step 5: Add OpenAI API Key"
echo "-----------------------------"
echo "Go to:"
echo "https://supabase.com/dashboard/project/yzifogzrytwpxnaylnga/settings/vault"
echo ""
echo "Add a new secret:"
echo "- Name: OPENAI_API_KEY"
echo "- Value: Your OpenAI API key"
echo ""
echo "Press Enter when done..."
read

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "You can now run:"
echo "  npm run dev"
echo ""
echo "Your app will be available at http://localhost:5173"
