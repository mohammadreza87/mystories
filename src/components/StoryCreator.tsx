import { useState, useEffect } from 'react';
import { Sparkles, Loader, BookPlus, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startStoryGeneration } from '../lib/storyService';
import { getSubscriptionUsage, SubscriptionUsage } from '../lib/subscriptionService';
import UsageBadge from './UsageBadge';
import UpgradeModal from './UpgradeModal';
import { progressQuest } from '../lib/questsService';
import { SEO } from './SEO';

interface StoryCreatorProps {
  userId: string;
  onStoryCreated: (storyId: string) => void;
}

type TargetAudience = 'children' | 'young_adult' | 'adult';

const audienceSuggestions: Record<TargetAudience, string[]> = {
  children: [
    'A brave astronaut discovers a planet made of candy',
    'A young wizard learns to control the weather',
    'A magical library where books come alive at night',
    'A detective cat solves mysteries in the city',
    'A time-traveling adventure to meet dinosaurs',
    'A friendly robot learns what it means to be human',
    'A princess who wants to become a scientist',
    'A talking animal school where students learn magic',
    'A young chef who can taste emotions in food',
    'A garden where the flowers can sing and dance'
  ],
  young_adult: [
    'A teenager discovers they can see glimpses of the future',
    'A group of friends uncover a conspiracy at their school',
    'A young athlete must choose between fame and friendship',
    'A hacker accidentally exposes a government secret',
    'Two rival students are forced to work together on a dangerous mission',
    'A social media influencer discovers their followers are disappearing',
    'A band of misfits must save their town from a supernatural threat',
    'A scholarship student at an elite academy uncovers dark secrets',
    'First contact with aliens - but only teenagers can communicate',
    'A gaming tournament with real-world consequences'
  ],
  adult: [
    'What if Hitler had won World War 2?',
    'The biography of Napoleon - make his key decisions',
    'A Cold War spy must choose between loyalty and love',
    'The rise and fall of a tech empire through moral dilemmas',
    'Ancient Rome: Play as Julius Caesar at critical moments',
    'The Cuban Missile Crisis from Kennedy\'s perspective',
    'What if the Soviet Union won the Space Race?',
    'A detective in 1920s Chicago during Prohibition',
    'The fall of Constantinople - defend or flee?',
    'Silicon Valley startup: ethics vs profit',
    'World War 1 trenches: survive and lead',
    'Renaissance Florence: Medici family intrigue',
    'What if JFK survived the assassination?',
    'Viking expedition to unknown lands',
    'The French Revolution from Robespierre\'s view'
  ]
};

function getRandomSuggestions(suggestions: string[], count: number): string[] {
  const shuffled = [...suggestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const audienceLabels: Record<TargetAudience, { label: string; description: string; badge: string }> = {
  children: {
    label: 'Children',
    description: 'Ages 5-10, safe and fun content',
    badge: '5-10'
  },
  young_adult: {
    label: 'Young Adult',
    description: 'Ages 13-18, teen-appropriate themes',
    badge: '13-18'
  },
  adult: {
    label: 'Adult',
    description: 'Ages 18+, complex themes & historical',
    badge: '18+'
  }
};

export function StoryCreator({ userId, onStoryCreated }: StoryCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('adult');
  const [displayedSuggestions, setDisplayedSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadUsage();
  }, [userId]);

  // Update suggestions when audience changes
  useEffect(() => {
    setDisplayedSuggestions(getRandomSuggestions(audienceSuggestions[targetAudience], 2));
  }, [targetAudience]);

  const loadUsage = async () => {
    const data = await getSubscriptionUsage(userId);
    setUsage(data);
  };

  const handleGenerateStory = async () => {
    if (!prompt.trim()) {
      setError('Please describe the story you want to create');
      return;
    }

    if (usage && !usage.canGenerate) {
      setShowUpgradeModal(true);
      return;
    }

    const tier = usage?.tier || 'free';
    const allowImages = tier !== 'free';

    setIsGenerating(true);
    setError(null);
    setProgress('Creating your story with AI...');
    setProgressPercent(5);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      setProgress('Generating story details...');
      setProgressPercent(10);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-story`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            userPrompt: prompt,
            generateFullStory: true,
            targetAudience
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'daily_limit_reached') {
          setShowUpgradeModal(true);
          setIsGenerating(false);
          setProgress('');
          setProgressPercent(0);
          return;
        }
        throw new Error(errorData.error || 'Failed to generate story');
      }

      const generatedData = await response.json();

      setProgress('Creating story structure...');
      setProgressPercent(40);

      // Start cover image generation in parallel (non-blocking)
      const imagePrompt = `Young Adult book cover illustration: ${generatedData.title}. ${generatedData.description.substring(0, 150)}. Dramatic, modern, cinematic style for teens and young adults.`;
      
      const coverImagePromise = allowImages
        ? fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ prompt: imagePrompt, targetAudience }),
            }
          ).then(async (imageResponse) => {
            if (imageResponse.ok) {
              const imageData = await imageResponse.json();
              return imageData.imageUrl;
            }
            return null;
          }).catch(() => null)
        : Promise.resolve(null);

      // Create story without waiting for cover image
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          title: generatedData.title,
          description: generatedData.description,
          age_range: generatedData.ageRange || audienceLabels[targetAudience].badge,
          estimated_duration: generatedData.estimatedDuration || (targetAudience === 'adult' ? 25 : targetAudience === 'young_adult' ? 15 : 10),
          story_context: generatedData.storyContext,
          created_by: userId,
          is_public: isPublic,
          is_user_generated: tier === 'free',
          generation_status: 'first_chapter_ready',
          generation_progress: 10,
          language: generatedData.language || 'en',
          cover_image_url: null,
          target_audience: targetAudience,
        })
        .select()
        .single();

      if (storyError) throw storyError;

      // Update cover image in background when ready
      coverImagePromise.then(async (coverImageUrl) => {
        if (coverImageUrl && story.id) {
          await supabase
            .from('stories')
            .update({ cover_image_url: coverImageUrl })
            .eq('id', story.id);
        }
      });

      setProgress('Creating first chapter...');
      setProgressPercent(50);

      const { data: startNode, error: startNodeError } = await supabase
        .from('story_nodes')
        .insert({
          story_id: story.id,
          node_key: 'start',
          content: generatedData.startContent,
          is_ending: false,
          ending_type: null,
          order_index: 0,
          parent_choice_id: null,
        })
        .select()
        .single();

      if (startNodeError) throw startNodeError;

      setProgress('Creating story choices...');
      setProgressPercent(70);

      if (generatedData.initialChoices && generatedData.initialChoices.length > 0) {
        for (let i = 0; i < generatedData.initialChoices.length; i++) {
          const choice = generatedData.initialChoices[i];

          const { data: placeholderNode } = await supabase
            .from('story_nodes')
            .insert({
              story_id: story.id,
              node_key: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_placeholder`,
              content: '',
              is_ending: false,
              ending_type: null,
              order_index: i + 1,
              parent_choice_id: null,
              is_placeholder: true,
            })
            .select()
            .single();

          if (placeholderNode) {
            await supabase
              .from('story_choices')
              .insert({
                from_node_id: startNode.id,
                to_node_id: placeholderNode.id,
                choice_text: choice.text,
                consequence_hint: choice.hint,
                choice_order: i,
              });
          }
        }
      }

      setProgress('Starting background generation...');
      setProgressPercent(85);

      await startStoryGeneration(story.id, userId);

      setProgress('Story ready to begin!');
      setProgressPercent(100);

      await loadUsage();

      // Quest progress: daily create
      await progressQuest('create_story').catch(() => null);

      // Navigate immediately - no artificial delay
      onStoryCreated(story.id);
    } catch (err) {
      console.error('Error generating story:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate story. Please try again.');
      setIsGenerating(false);
      setProgress('');
      setProgressPercent(0);
    }
  };

  const refreshSuggestions = () => {
    setDisplayedSuggestions(getRandomSuggestions(audienceSuggestions[targetAudience], 2));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 pb-20 flex items-center justify-center">
      <SEO
        title="Create Your Story"
        description="Create your own AI-powered interactive story with Next Tale. Describe your adventure and let AI generate a personalized choose-your-own-adventure experience."
        url="/create"
        keywords={['create story', 'AI story generator', 'interactive fiction creator', 'write your own adventure']}
      />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      <main className="max-w-2xl w-full mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-lg mb-6">
            <BookPlus className="w-12 h-12 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            Create Your Story
          </h1>
          <p className="text-lg text-gray-600">
            Describe the adventure you want to experience
          </p>
          <div className="mt-6 flex justify-center">
            <UsageBadge onUpgradeClick={() => setShowUpgradeModal(true)} />
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          {/* Audience Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(audienceLabels) as TargetAudience[]).map((audience) => (
                <button
                  key={audience}
                  onClick={() => setTargetAudience(audience)}
                  disabled={isGenerating}
                  className={`p-3 rounded-xl border-2 transition-all disabled:opacity-50 ${
                    targetAudience === audience
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{audienceLabels[audience].label}</div>
                  <div className="text-xs mt-1 opacity-75">{audienceLabels[audience].badge}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {audienceLabels[targetAudience].description}
            </p>
          </div>

          <label className="block text-sm font-semibold text-gray-700 mb-3">
            What kind of story do you want?
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={targetAudience === 'adult'
              ? "E.g., What if the Roman Empire never fell? or The biography of Genghis Khan..."
              : targetAudience === 'young_adult'
              ? "E.g., A teenager discovers a hidden world beneath their city..."
              : "E.g., A brave knight saves a friendly dragon..."}
            className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 resize-none text-gray-800"
            disabled={isGenerating}
          />

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">
                Need inspiration? Try these:
              </p>
              <button
                onClick={refreshSuggestions}
                disabled={isGenerating}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                More ideas
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayedSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(suggestion)}
                  disabled={isGenerating}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm rounded-xl transition-colors disabled:opacity-50 text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-semibold text-gray-700">
                Story Visibility
              </label>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                disabled={isGenerating}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  isPublic ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <span className={`text-sm font-medium ${isPublic ? 'text-green-600' : 'text-gray-600'}`}>
              {isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isGenerating && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">{progress}</span>
                <span className="text-gray-500">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {progressPercent < 100 ? 'Please wait while we create your story...' : 'Ready to start reading!'}
              </p>
            </div>
          )}

          <button
            onClick={handleGenerateStory}
            disabled={isGenerating || !prompt.trim()}
            className="w-full mt-8 py-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Creating Your Story...
              </>
            ) : (
              <>
                <Wand2 className="w-6 h-6" />
                Generate Story with AI
              </>
            )}
          </button>
        </div>

        <aside className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-gray-700 space-y-2">
              <p className="font-semibold">How it works:</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>Describe the story you want to create</li>
                <li>AI generates the first chapter instantly</li>
                <li>Start reading while the rest generates in the background</li>
                <li>All story paths will be ready as you read</li>
              </ol>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
