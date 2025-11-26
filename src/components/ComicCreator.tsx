/**
 * ComicCreator component - Create adult comic book stories with AI.
 * Uses the story bible system for consistent character and visual style.
 */

import { useState, useEffect } from 'react';
import { Loader, BookOpen, Palette, Zap, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createComicStory } from '../lib/storyBibleService';
import { getSubscriptionUsage, type SubscriptionUsage } from '../lib/subscriptionService';
import UsageBadge from './UsageBadge';
import UpgradeModal from './UpgradeModal';
import { progressQuest } from '../lib/questsService';
import type { ComicStoryRequest } from '../lib/storyBible.types';

// Comic style options with descriptions
const COMIC_STYLES = [
  {
    id: 'noir',
    name: 'Noir',
    description: 'Dark, gritty crime drama with high contrast visuals',
    influences: 'Frank Miller, Sin City',
    icon: '🌑',
  },
  {
    id: 'manga',
    name: 'Manga',
    description: 'Intense emotional storytelling with dynamic action',
    influences: 'Naoki Urasawa, Kentaro Miura',
    icon: '⚡',
  },
  {
    id: 'western',
    name: 'Western Comic',
    description: 'Bold, cinematic superhero-style storytelling',
    influences: 'Alex Ross, Jim Lee',
    icon: '💪',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neon-soaked dystopian tech-noir',
    influences: 'Ghost in the Shell, Blade Runner',
    icon: '🤖',
  },
  {
    id: 'horror',
    name: 'Horror',
    description: 'Unsettling, visceral terror and dread',
    influences: 'Junji Ito, Bernie Wrightson',
    icon: '👻',
  },
  {
    id: 'fantasy',
    name: 'Dark Fantasy',
    description: 'Epic, mystical adventures in otherworldly realms',
    influences: 'Frazetta, Moebius',
    icon: '🗡️',
  },
];

// Tone options
const TONE_OPTIONS = [
  { id: 'dramatic', name: 'Dramatic', description: 'Intense emotional stakes' },
  { id: 'dark', name: 'Dark', description: 'Grim and morally complex' },
  { id: 'action', name: 'Action-Packed', description: 'Fast-paced thrills' },
  { id: 'mystery', name: 'Mysterious', description: 'Suspenseful and intriguing' },
  { id: 'psychological', name: 'Psychological', description: 'Mind-bending depth' },
  { id: 'epic', name: 'Epic', description: 'Grand scale and scope' },
];

// Example prompts for adults
const ADULT_SUGGESTIONS = [
  'A jaded detective hunts a serial killer who leaves cryptic art at crime scenes',
  'A corporate spy discovers their employer is hiding a world-ending secret',
  'A disgraced samurai seeks redemption in a city controlled by rival gangs',
  'A hacker uncovers evidence that reality itself is a simulation',
  'A demon hunter must sacrifice everything to save a cursed city',
];

interface ComicCreatorProps {
  userId: string;
  onStoryCreated: (storyId: string) => void;
}

export function ComicCreator({ userId, onStoryCreated }: ComicCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [comicStyle, setComicStyle] = useState('noir');
  const [tone, setTone] = useState('dramatic');
  const [isPublic, setIsPublic] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);

  useEffect(() => {
    loadUsage();
  }, [userId]);

  const loadUsage = async () => {
    const data = await getSubscriptionUsage(userId);
    setUsage(data);
  };

  const selectedStyle = COMIC_STYLES.find(s => s.id === comicStyle) || COMIC_STYLES[0];
  const selectedTone = TONE_OPTIONS.find(t => t.id === tone) || TONE_OPTIONS[0];

  const handleCreateStory = async () => {
    if (!prompt.trim()) {
      setError('Please describe your story concept');
      return;
    }

    const tier = usage?.tier || 'free';
    if (usage && (!usage.canGenerate || tier === 'free')) {
      setShowUpgradeModal(true);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setProgress('Analyzing your concept...');
    setProgressPercent(5);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      setProgress('Creating story bible...');
      setProgressPercent(15);

      const request: ComicStoryRequest = {
        prompt: prompt.trim(),
        comicStyle,
        targetAudience: 'adult',
        tone,
      };

      setProgress('Building characters and world...');
      setProgressPercent(30);

      // Create the story using our new service
      const result = await createComicStory(request, userId, session.access_token);

      setProgress('Generating first chapter...');
      setProgressPercent(60);

      // Update story visibility
      if (isPublic) {
        await supabase
          .from('stories')
          .update({ is_public: true })
          .eq('id', result.storyId);
      }

      setProgress('Preparing your story...');
      setProgressPercent(90);

      // Refresh usage
      await loadUsage();

      // Quest progress
      await progressQuest('create_story').catch(() => null);

      setProgress('Story ready!');
      setProgressPercent(100);

      // Navigate to the story
      onStoryCreated(result.storyId);

    } catch (err) {
      console.error('Error creating comic story:', err);
      setError(err instanceof Error ? err.message : 'Failed to create story. Please try again.');
      setIsGenerating(false);
      setProgress('');
      setProgressPercent(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-20">
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl shadow-lg shadow-red-500/30 mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Create Your Comic
          </h1>
          <p className="text-gray-400 text-lg">
            Craft an adult graphic novel with AI-powered storytelling
          </p>
          <div className="mt-6 flex justify-center">
            <UsageBadge onUpgradeClick={() => setShowUpgradeModal(true)} />
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6 mb-6">
          {/* Story Concept */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Story Concept
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your story idea. Be specific about characters, setting, and conflict..."
              className="w-full h-36 px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none text-gray-100 placeholder-gray-500"
              disabled={isGenerating}
            />

            {/* Suggestions */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Need inspiration?
              </p>
              <div className="flex flex-wrap gap-2">
                {ADULT_SUGGESTIONS.slice(0, 3).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(suggestion)}
                    disabled={isGenerating}
                    className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50 border border-gray-600"
                  >
                    {suggestion.substring(0, 40)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style & Tone Selection */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Comic Style Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Visual Style
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowStyleDropdown(!showStyleDropdown);
                  setShowToneDropdown(false);
                }}
                disabled={isGenerating}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-left hover:border-gray-500 disabled:opacity-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedStyle.icon}</span>
                  <div>
                    <div className="text-gray-100 font-medium">{selectedStyle.name}</div>
                    <div className="text-xs text-gray-500">{selectedStyle.influences}</div>
                  </div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showStyleDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStyleDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-xl overflow-hidden">
                  {COMIC_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setComicStyle(style.id);
                        setShowStyleDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                        style.id === comicStyle ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <span className="text-2xl">{style.icon}</span>
                      <div>
                        <div className="text-gray-100 font-medium">{style.name}</div>
                        <div className="text-xs text-gray-400">{style.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tone Dropdown */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Story Tone
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowToneDropdown(!showToneDropdown);
                  setShowStyleDropdown(false);
                }}
                disabled={isGenerating}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-xl text-left hover:border-gray-500 disabled:opacity-50 transition-colors"
              >
                <div>
                  <div className="text-gray-100 font-medium">{selectedTone.name}</div>
                  <div className="text-xs text-gray-500">{selectedTone.description}</div>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showToneDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showToneDropdown && (
                <div className="absolute z-20 w-full mt-2 bg-gray-800 border border-gray-600 rounded-xl shadow-xl overflow-hidden">
                  {TONE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTone(t.id);
                        setShowToneDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                        t.id === tone ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <div>
                        <div className="text-gray-100 font-medium">{t.name}</div>
                        <div className="text-xs text-gray-400">{t.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-900/30 rounded-xl mb-6">
            <div>
              <div className="text-sm font-semibold text-gray-300">
                Story Visibility
              </div>
              <div className="text-xs text-gray-500">
                {isPublic ? 'Anyone can discover and read your story' : 'Only you can access this story'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              disabled={isGenerating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                isPublic ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">{progress}</span>
                <span className="text-gray-500">{progressPercent}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {progressPercent < 100
                  ? 'Creating your story bible for consistent characters and visuals...'
                  : 'Ready to start your adventure!'}
              </p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleCreateStory}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-600/30 hover:shadow-xl hover:shadow-red-600/40 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <Loader className="w-6 h-6 animate-spin" />
                Creating Your Story...
              </>
            ) : (
              <>
                <Zap className="w-6 h-6" />
                Generate Comic Story
              </>
            )}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div className="text-sm text-gray-400 space-y-2">
              <p className="font-semibold text-gray-300">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>AI creates a story bible with unique characters and visual style</li>
                <li>First chapter generates instantly with image and narration</li>
                <li>Your choices shape the story with real consequences</li>
                <li>Background AI generates future paths as you read</li>
              </ol>
              <p className="text-xs text-gray-500 mt-3">
                Each story features consistent character designs and visual style throughout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComicCreator;
