import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Loader,
  BookOpen,
  FileText,
  MessageSquare,
  Crown,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import {
  getStory,
  getStoryNodes,
  getAllStoryChoices,
  updateStory,
  updateStoryNodeContent,
  updateStoryChoice,
  type StoryUpdateData
} from '../lib/storyService';
import { getSubscriptionUsage, type SubscriptionUsage } from '../lib/subscriptionService';
import type { Story, StoryNode, StoryChoice } from '../lib/types';
import { useToast } from './Toast';
import { LoadingState } from '../shared/components/LoadingState';
import { ErrorState } from '../shared/components/ErrorState';
import { SEO } from './SEO';

interface StoryEditorProps {
  storyId: string;
  onBack: () => void;
  onSave?: () => void;
}

type EditTab = 'details' | 'chapters' | 'choices';

interface ExtendedStoryChoice extends StoryChoice {
  from_node?: { node_key: string };
}

export function StoryEditor({ storyId, onBack, onSave }: StoryEditorProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [story, setStory] = useState<Story | null>(null);
  const [nodes, setNodes] = useState<StoryNode[]>([]);
  const [choices, setChoices] = useState<ExtendedStoryChoice[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionUsage | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<EditTab>('details');
  const [hasChanges, setHasChanges] = useState(false);

  // Edited values
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTargetAudience, setEditedTargetAudience] = useState<'children' | 'young_adult' | 'adult'>('children');
  const [editedArtStyle, setEditedArtStyle] = useState<'cartoon' | 'comic' | 'realistic'>('cartoon');
  const [editedNodes, setEditedNodes] = useState<Record<string, string>>({});
  const [editedChoices, setEditedChoices] = useState<Record<string, string>>({});

  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [storyId, user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const [storyData, nodesData, choicesData, subscriptionData] = await Promise.all([
        getStory(storyId),
        getStoryNodes(storyId),
        getAllStoryChoices(storyId),
        getSubscriptionUsage(user.id)
      ]);

      if (!storyData) {
        setError('Story not found');
        return;
      }

      // Check if user owns this story
      if (storyData.created_by !== user.id) {
        setError('You can only edit your own stories');
        return;
      }

      setStory(storyData);
      setNodes(nodesData);
      setChoices(choicesData);
      setSubscription(subscriptionData);

      // Initialize edit values
      setEditedTitle(storyData.title);
      setEditedDescription(storyData.description);
      setEditedTargetAudience(storyData.target_audience || 'children');
      setEditedArtStyle(storyData.art_style || 'cartoon');

    } catch (err) {
      console.error('Error loading story:', err);
      setError('Failed to load story');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = subscription && (
    subscription.tier === 'basic' ||
    subscription.tier === 'pro' ||
    subscription.tier === 'max' ||
    subscription.isGrandfathered
  );

  const handleSave = async () => {
    if (!story || !canEdit) return;

    try {
      setSaving(true);

      // Save story details if changed
      const storyUpdates: StoryUpdateData = {};
      if (editedTitle !== story.title) storyUpdates.title = editedTitle;
      if (editedDescription !== story.description) storyUpdates.description = editedDescription;
      if (editedTargetAudience !== story.target_audience) storyUpdates.target_audience = editedTargetAudience;
      if (editedArtStyle !== story.art_style) storyUpdates.art_style = editedArtStyle;

      if (Object.keys(storyUpdates).length > 0) {
        await updateStory(storyId, storyUpdates);
      }

      // Save node content changes
      for (const [nodeId, content] of Object.entries(editedNodes)) {
        await updateStoryNodeContent(nodeId, content);
      }

      // Save choice changes
      for (const [choiceId, choiceText] of Object.entries(editedChoices)) {
        await updateStoryChoice(choiceId, { choice_text: choiceText });
      }

      showToast('Story saved successfully!', 'success');
      setHasChanges(false);
      setEditedNodes({});
      setEditedChoices({});

      // Reload data to reflect changes
      await loadData();
      onSave?.();

    } catch (err) {
      console.error('Error saving story:', err);
      showToast('Failed to save changes', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleNodeContentChange = (nodeId: string, content: string) => {
    setEditedNodes(prev => ({ ...prev, [nodeId]: content }));
    setHasChanges(true);
  };

  const handleChoiceTextChange = (choiceId: string, text: string) => {
    setEditedChoices(prev => ({ ...prev, [choiceId]: text }));
    setHasChanges(true);
  };

  const handleDetailChange = () => {
    setHasChanges(true);
  };

  if (loading) {
    return <LoadingState fullScreen message="Loading story editor..." size="lg" />;
  }

  if (error) {
    return (
      <ErrorState
        fullScreen
        title="Unable to edit story"
        message={error}
        onRetry={loadData}
      />
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
          <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Upgrade Required</h2>
          <p className="text-gray-600 mb-6">
            Story editing is available for Basic, Pro, and Max subscribers.
            Upgrade your plan to edit your stories.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => window.location.href = '/subscription'}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              View Plans
            </button>
            <button
              onClick={onBack}
              className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 pb-20">
      <SEO
        title={`Edit: ${story?.title || 'Story'}`}
        description="Edit your story content, chapters, and choices."
        noindex={true}
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <h1 className="text-lg font-bold text-gray-800 truncate max-w-[200px]">
            Edit Story
          </h1>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
              hasChanges
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-lg p-1 flex gap-1">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'details'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Details</span>
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'chapters'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Chapters</span>
          </button>
          <button
            onClick={() => setActiveTab('choices')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'choices'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Choices</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4">
        {activeTab === 'details' && (
          <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Story Title
              </label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => {
                  setEditedTitle(e.target.value);
                  handleDetailChange();
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="Enter story title"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={editedDescription}
                onChange={(e) => {
                  setEditedDescription(e.target.value);
                  handleDetailChange();
                }}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                placeholder="Enter story description"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Audience
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['children', 'young_adult', 'adult'] as const).map((audience) => (
                  <button
                    key={audience}
                    onClick={() => {
                      setEditedTargetAudience(audience);
                      handleDetailChange();
                    }}
                    className={`py-3 px-4 rounded-xl font-medium transition-all ${
                      editedTargetAudience === audience
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {audience === 'children' && 'Children'}
                    {audience === 'young_adult' && 'Young Adult'}
                    {audience === 'adult' && 'Adult'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Art Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cartoon', 'comic', 'realistic'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => {
                      setEditedArtStyle(style);
                      handleDetailChange();
                    }}
                    className={`py-3 px-4 rounded-xl font-medium transition-all capitalize ${
                      editedArtStyle === style
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {hasChanges && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-xl text-yellow-700">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">You have unsaved changes</span>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chapters' && (
          <div className="space-y-4">
            {nodes.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Chapters Yet</h3>
                <p className="text-gray-600">
                  This story doesn't have any chapters to edit.
                </p>
              </div>
            ) : (
              nodes.map((node, index) => (
                <div key={node.id} className="bg-white rounded-3xl shadow-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </span>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-800">
                          {node.node_key === 'start' ? 'Introduction' : `Chapter ${index}`}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {node.is_ending ? 'Ending' : `${(editedNodes[node.id] || node.content).length} characters`}
                        </p>
                      </div>
                    </div>
                    <div className={`transition-transform ${expandedNode === node.id ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {expandedNode === node.id && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      <div className="pt-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Chapter Content
                        </label>
                        <textarea
                          value={editedNodes[node.id] ?? node.content}
                          onChange={(e) => handleNodeContentChange(node.id, e.target.value)}
                          rows={8}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none font-mono text-sm"
                          placeholder="Enter chapter content"
                        />
                        {editedNodes[node.id] !== undefined && editedNodes[node.id] !== node.content && (
                          <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                            <Check className="w-4 h-4" />
                            <span>Modified</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'choices' && (
          <div className="space-y-4">
            {choices.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No Choices Yet</h3>
                <p className="text-gray-600">
                  This story doesn't have any choices to edit.
                </p>
              </div>
            ) : (
              choices.map((choice, index) => (
                <div key={choice.id} className="bg-white rounded-3xl shadow-xl p-6">
                  <div className="flex items-start gap-4">
                    <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-2">
                        From: {choice.from_node?.node_key || 'Unknown'}
                      </div>
                      <input
                        type="text"
                        value={editedChoices[choice.id] ?? choice.choice_text}
                        onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder="Enter choice text"
                      />
                      {editedChoices[choice.id] !== undefined && editedChoices[choice.id] !== choice.choice_text && (
                        <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                          <Check className="w-4 h-4" />
                          <span>Modified</span>
                        </div>
                      )}
                      {choice.consequence_hint && (
                        <p className="text-xs text-gray-400 mt-2 italic">
                          Hint: {choice.consequence_hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating Save Button */}
      {hasChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold shadow-lg hover:bg-blue-700 transition-all hover:shadow-xl"
          >
            {saving ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      )}
    </div>
  );
}
