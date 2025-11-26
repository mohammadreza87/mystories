import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Sparkles, Loader, User, ThumbsUp, ThumbsDown, Share2 } from 'lucide-react';
import { getStoryNode, getNodeChoices, saveProgress, updateNodeImage, updateNodeAudio, updateNodeVideo, createStoryNode, createStoryChoice, getStory, getStoryGenerationStatus, getUserReaction, addReaction, updateReaction, removeReaction } from '../lib/storyService';
import { trackChapterRead, trackStoryCompletion } from '../lib/pointsService';
import { progressQuest } from '../lib/questsService';
import { supabase } from '../lib/supabase';
import { generateChapterVideo } from '../lib/videoService';
import type { StoryNode, StoryChoice, Story, StoryReaction } from '../lib/types';
import { useToast } from './Toast';
import { useTimeout, useSubscriptionUsage } from '../hooks';

// Map target_audience to artStyle for video generation
type ArtStyle = 'cartoon' | 'comic' | 'realistic';
const getArtStyleFromAudience = (targetAudience?: 'children' | 'young_adult' | 'adult'): ArtStyle => {
  switch (targetAudience) {
    case 'children':
      return 'cartoon';
    case 'young_adult':
      return 'comic';
    case 'adult':
      return 'realistic';
    default:
      return 'comic'; // Default to comic style
  }
};

const SHORT_START_MAX_WORDS = 220;
const shortenStartContent = (content: string, maxWords: number = SHORT_START_MAX_WORDS) => {
  const words = content.trim().split(/\s+/);
  if (words.length <= maxWords) return content;
  return `${words.slice(0, maxWords).join(' ')}…`;
};

interface StoryReaderProps {
  storyId: string;
  userId: string;
  onComplete: () => void;
}

interface StoryChapter {
  node: StoryNode;
  choices: (StoryChoice & { to_node: StoryNode })[];
  selectedChoiceId?: string;
  imageUrl?: string | null;
  generatingImage?: boolean;
  videoUrl?: string | null;
  generatingVideo?: boolean;
}

export function StoryReader({ storyId, userId, onComplete }: StoryReaderProps) {
  const { showToast } = useToast();
  const safeTimeout = useTimeout();
  const navigate = useNavigate();
  const { usage: subscriptionUsage } = useSubscriptionUsage(userId || undefined);
  const [chapters, setChapters] = useState<StoryChapter[]>([]);
  const [pathTaken, setPathTaken] = useState<string[]>(['start']);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [imageStyleReference, setImageStyleReference] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number>(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [userReaction, setUserReaction] = useState<StoryReaction | null>(null);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [chapterVideos, setChapterVideos] = useState<Record<string, { url: string | null; generating: boolean; failed?: boolean }>>({});
  const videoGenerationAttemptedRef = useRef<Set<string>>(new Set());
  const latestChapterRef = useRef<HTMLDivElement | null>(null);
  const wordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentChapterIdRef = useRef<string | null>(null);
  const hasUserInteractedRef = useRef<boolean>(false);
  const isStoryOwner = story?.created_by && userId ? story.created_by === userId : false;
  const seedChapterVideoFromNode = (node: StoryNode) => {
    if (node.video_url) {
      setChapterVideos((prev) => ({
        ...prev,
        [node.id]: { url: node.video_url, generating: false },
      }));
      videoGenerationAttemptedRef.current.add(node.id);
    } else if (node.video_status === 'failed') {
      setChapterVideos((prev) => ({
        ...prev,
        [node.id]: { url: null, generating: false, failed: true },
      }));
    }
  };

  useEffect(() => {
    initializeStory();
    loadReactionData();
  }, [storyId]);

  // Track user interaction to enable audio autoplay
  useEffect(() => {
    const markInteracted = () => {
      hasUserInteractedRef.current = true;
    };

    document.addEventListener('click', markInteracted, { once: true });
    document.addEventListener('touchstart', markInteracted, { once: true });
    document.addEventListener('keydown', markInteracted, { once: true });

    return () => {
      document.removeEventListener('click', markInteracted);
      document.removeEventListener('touchstart', markInteracted);
      document.removeEventListener('keydown', markInteracted);
    };
  }, []);

  const loadReactionData = async () => {
    if (!userId) return;

    try {
      const reaction = await getUserReaction(userId, storyId);
      setUserReaction(reaction);
    } catch (error) {
      console.error('Error loading reaction:', error);
    }
  };

  useEffect(() => {
    if (!storyId) return;

    const checkGenerationProgress = async () => {
      const status = await getStoryGenerationStatus(storyId);
      if (status) {
        setGenerationProgress(status.progress);
        setGenerationStatus(status.status);
      }
    };

    checkGenerationProgress();

    const interval = setInterval(checkGenerationProgress, 3000);

    return () => clearInterval(interval);
  }, [storyId]);

  const initializeStory = async () => {
    try {
      const storyData = await getStory(storyId);
      if (!storyData) return;
      setStory(storyData);
      setLikesCount(storyData.likes_count || 0);
      setDislikesCount(storyData.dislikes_count || 0);

      if (storyData.image_prompt) {
        setImageStyleReference(storyData.image_prompt);
      }

      loadStoryNode('start', undefined, storyData);
    } catch (error) {
      console.error('Error initializing story:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeech();
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (wordTimerRef.current) {
        clearInterval(wordTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (chapters.length > 0) {
      const latestChapter = chapters[chapters.length - 1];
      const isNewChapter = currentChapterIdRef.current !== latestChapter.node.id;
      const isLoadingNode = latestChapter.node.id === 'loading' || latestChapter.node.node_key === 'loading';
      const hasContent = latestChapter.node.content && latestChapter.node.content.trim().length > 0;

      if (isNewChapter && !latestChapter.node.is_ending && !isLoadingNode && hasContent) {
        currentChapterIdRef.current = latestChapter.node.id;
        // Only auto-play if user has interacted with the page (browser autoplay policy)
        if (hasUserInteractedRef.current) {
          // Use safe timeout to prevent memory leaks on unmount
          safeTimeout.set(() => {
            speakText(latestChapter.node.content, latestChapter.node.id, latestChapter.node.audio_url);
          }, 300);
        }
      }
    }
  }, [chapters]);

  useEffect(() => {
    if (latestChapterRef.current && chapters.length > 1) {
      latestChapterRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [chapters]);

  // Auto-generate chapter video for Max plan users when a chapter is first loaded
  useEffect(() => {
    if (!subscriptionUsage?.features.video || chapters.length === 0 || !userId) return;
    if (!isStoryOwner) return; // Only allow owners to auto-generate videos for their stories

    const latest = chapters[chapters.length - 1];
    const chapterId = latest.node.id;

    if (latest.node.id === 'loading') return;

    const storedVideoUrl = (latest.node as StoryNode).video_url;
    const storedStatus = (latest.node as StoryNode).video_status;

    if (storedVideoUrl) {
      seedChapterVideoFromNode(latest.node);
      return;
    }

    if (storedStatus === 'failed' || storedStatus === 'pending') {
      // Do not auto-regenerate to avoid credit drain; allow manual retry from UI.
      return;
    }

    // Use ref to prevent race conditions - check if we've already attempted this chapter
    if (videoGenerationAttemptedRef.current.has(chapterId)) return;

    // Mark as attempted immediately to prevent duplicate calls
    videoGenerationAttemptedRef.current.add(chapterId);

    setChapterVideos((prev) => ({
      ...prev,
      [chapterId]: { url: null, generating: true },
    }));

    updateNodeVideo(chapterId, { status: 'pending', error: null }).catch(() => null);

    generateChapterVideo({
      prompt: `${story?.title || 'Story'} - ${latest.node.content.slice(0, 400)}`,
      artStyle: getArtStyleFromAudience(story?.target_audience),
      aspectRatio: '16:9',
    })
      .then(async (videoUrl) => {
        setChapterVideos((prev) => ({
          ...prev,
          [chapterId]: { url: videoUrl, generating: false },
        }));
        await updateNodeVideo(chapterId, { videoUrl, status: 'complete', error: null });
      })
      .catch(async (err) => {
        console.error('Video generation failed', err);
        showToast('Video generation failed. Please try again.', 'error');
        setChapterVideos((prev) => ({
          ...prev,
          [chapterId]: { url: null, generating: false, failed: true },
        }));
        await updateNodeVideo(chapterId, { status: 'failed', error: (err as Error).message?.slice(0, 500) || 'Video generation failed' });
      });
  }, [chapters, story?.title, story?.target_audience, subscriptionUsage?.features.video, userId]);

  const generateUniqueNodeKey = (): string => {
    return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const generateNodeImage = async (nodeContent: string, storyTitle: string): Promise<string | null> => {
    try {
      if (!nodeContent || !storyTitle) {
        console.error('Missing content or title for image generation');
        return null;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const prompt = `${storyTitle}: ${nodeContent.substring(0, 200)}`;

      console.log('Generating image with prompt:', prompt);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Not authenticated for image generation');
        return null;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            prompt,
            styleReference: imageStyleReference,
            targetAudience: story?.target_audience || 'children'
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        // Silently fail for billing issues - images are optional
        if (response.status === 400 || response.status === 429) {
          console.warn('Image generation unavailable (billing inactive)');
          return null;
        }
        console.error('Failed to generate node image:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error('Error generating node image:', error);
      return null;
    }
  };

  const generateStory = async (storyContext: string, userChoice?: string, previousContent?: string): Promise<any> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const realChapterCount = chapters.filter(ch => ch.node.id !== 'loading' && ch.node.node_key !== 'loading').length;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-story`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            storyContext,
            userChoice,
            previousContent,
            storyTitle: story?.title,
            chapterCount: realChapterCount
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Generate story error:', errorData);
        throw new Error(errorData.error || 'Failed to generate story');
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating story:', error);
      throw error;
    }
  };

  const loadStoryNode = async (nodeKey: string, previousContent?: string, storyOverride?: Story) => {
    const currentStory = storyOverride || story;
    try {
      setLoading(true);
      let node = await getStoryNode(storyId, nodeKey);

      if (!node && currentStory?.story_context) {
        setIsGenerating(true);
        const generatedStory = await generateStory(currentStory.story_context);
        const trimmedContent = shortenStartContent(generatedStory.content);

        node = await createStoryNode(
          storyId,
          nodeKey,
          trimmedContent,
          generatedStory.isEnding,
          generatedStory.endingType,
          0,
          null
        );

        if (!generatedStory.choices || generatedStory.choices.length === 0) {
          console.error('AI returned no choices for initial story:', generatedStory);
          throw new Error('Story generation failed: No choices provided');
        }

        const placeholderChoices = [];
        for (let i = 0; i < generatedStory.choices.length; i++) {
          const choice = generatedStory.choices[i];
          const placeholderNode = await createStoryNode(
            storyId,
            `${generateUniqueNodeKey()}_placeholder`,
            '',
            false,
            null,
            i + 1,
            null
          );

          const createdChoice = await createStoryChoice(
            node.id,
            placeholderNode.id,
            choice.text,
            choice.hint,
            i
          );
          placeholderChoices.push({ ...createdChoice, to_node: placeholderNode });
        }

        setIsGenerating(false);

        const chapter: StoryChapter = {
          node: { ...node, content: trimmedContent },
          choices: placeholderChoices,
          imageUrl: currentStory.cover_image_url,
          generatingImage: false
        };

        setChapters([chapter]);
        seedChapterVideoFromNode(node);
        setLoading(false);
        return;
      }

      if (!node) {
        setLoading(false);
        return;
      }

      const nodeChoices = node.is_ending ? [] : await getNodeChoices(node.id);
      console.log('Loaded node choices:', nodeChoices.length, 'choices for node:', node.id);
      console.log('Node is_ending:', node.is_ending);
      console.log('Choices details:', nodeChoices);

      const isFirstChapter = nodeKey === 'start';
      const shouldUseCoverImage = isFirstChapter && currentStory?.cover_image_url;
      const existingNodeImage = node.image_url;

      const adjustedNode = isFirstChapter ? { ...node, content: shortenStartContent(node.content) } : node;

      const chapter: StoryChapter = {
        node: adjustedNode,
        choices: nodeChoices,
        imageUrl: shouldUseCoverImage ? currentStory.cover_image_url : existingNodeImage,
        generatingImage: false // Don't show loading state, just show content immediately
      };

      console.log('Setting chapter with choices:', chapter.choices.length);
      setChapters([chapter]);
      seedChapterVideoFromNode(adjustedNode);

      if (userId) {
        await trackChapterRead(userId, storyId, node.id, currentStory?.created_by || null);
      }

      // Generate images in background without blocking text display
      if (!shouldUseCoverImage && !existingNodeImage && currentStory) {
        console.log('No cached image for start node, generating new image in background');
        // Fire and forget - don't await
        generateNodeImage(node.content, currentStory.title).then(async (imageUrl) => {
          if (imageUrl) {
            await updateNodeImage(node.id, imageUrl, node.content.substring(0, 200));
            setChapters(prev => prev.map(ch =>
              ch.node.id === node.id
                ? { ...ch, imageUrl }
                : ch
            ));
          }
        }).catch((err) => {
          console.log('Image generation failed, continuing without image:', err);
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading story node:', error);
      setLoading(false);
      setIsGenerating(false);
    }
  };

  const handleChoice = async (
    chapterIndex: number,
    choice: StoryChoice & { to_node: StoryNode }
  ) => {
    const updatedChapters = [...chapters];
    updatedChapters[chapterIndex].selectedChoiceId = choice.id;
    setChapters(updatedChapters);

    stopSpeech();

    // Removed artificial delay for faster response

    const currentNode = updatedChapters[chapterIndex].node;
    const isPlaceholder = !choice.to_node.content;

    if (isPlaceholder && story?.story_context) {
      const loadingChapter: StoryChapter = {
        node: {
          id: 'loading',
          story_id: storyId,
          node_key: 'loading',
          content: '✨ Generating your story...',
          is_ending: false,
          ending_type: null,
          sequence_order: updatedChapters.length,
          parent_choice_id: null,
          image_url: null,
          image_prompt: null,
          audio_url: null,
          created_at: new Date().toISOString()
        },
        choices: [],
        imageUrl: null,
        generatingImage: false
      };

      setChapters([...updatedChapters, loadingChapter]);

      try {
        // Generate content immediately instead of polling
        setIsGenerating(true);
        const generatedStory = await generateStory(
          story.story_context,
          choice.choice_text,
          currentNode.content
        );

        const newNodeKey = generateUniqueNodeKey();
        const newNode = await createStoryNode(
          storyId,
          newNodeKey,
          generatedStory.content,
          generatedStory.isEnding,
          generatedStory.endingType,
          updatedChapters.length,
          choice.id
        );

        await supabase
          .from('story_choices')
          .update({ to_node_id: newNode.id })
          .eq('id', choice.id);

        const newChoices = [];
        if (!generatedStory.isEnding) {
          if (!generatedStory.choices || generatedStory.choices.length === 0) {
            console.error('AI returned no choices for non-ending story:', generatedStory);
            throw new Error('Story generation failed: No choices provided for continuing story');
          }

          for (let i = 0; i < generatedStory.choices.length; i++) {
            const ch = generatedStory.choices[i];
            const placeholderNode = await createStoryNode(
              storyId,
              `${generateUniqueNodeKey()}_placeholder`,
              '',
              false,
              null,
              i + 1,
              null
            );

            const createdChoice = await createStoryChoice(
              newNode.id,
              placeholderNode.id,
              ch.text,
              ch.hint,
              i
            );
            newChoices.push({ ...createdChoice, to_node: placeholderNode });
          }
        }

        const newPath = [...pathTaken, newNodeKey];
        setPathTaken(newPath);

      if (userId) {
        await saveProgress(
          userId,
          storyId,
          newNode.id,
          newPath,
          generatedStory.isEnding
        );
      }

        const newChapter: StoryChapter = {
          node: newNode,
          choices: newChoices,
          imageUrl: null,
          generatingImage: false // Show content immediately
        };

      setChapters([...updatedChapters, newChapter]);
      seedChapterVideoFromNode(newNode);
      setIsGenerating(false);

        if (userId) {
          await trackChapterRead(userId, storyId, newNode.id, story.created_by || null);

          if (generatedStory.isEnding) {
            await trackStoryCompletion(userId, storyId, story.created_by || null);
          }
        }

        // Generate image in background without blocking (fire and forget)
        if (story) {
          generateNodeImage(newNode.content, story.title).then(async (imageUrl) => {
            if (imageUrl) {
              await updateNodeImage(newNode.id, imageUrl, newNode.content.substring(0, 200));
              setChapters(prev => prev.map(ch =>
                ch.node.id === newNode.id
                  ? { ...ch, imageUrl }
                  : ch
              ));
            }
          }).catch((err) => {
            console.log('Image generation failed, continuing without image:', err);
          });
        }
      } catch (error) {
        console.error('Error generating next chapter:', error);
        setIsGenerating(false);
      }
    } else {
      const newPath = [...pathTaken, choice.to_node.node_key];
      setPathTaken(newPath);

      if (userId) {
        await saveProgress(
          userId,
          storyId,
          choice.to_node.id,
          newPath,
          choice.to_node.is_ending
        );
      }

      const nextChoices = choice.to_node.is_ending
        ? []
        : await getNodeChoices(choice.to_node.id);

      if (!choice.to_node.is_ending && nextChoices.length === 0 && story?.story_context) {
        console.log('Node has no choices, generating them dynamically...');
        setIsGenerating(true);

        try {
          const generatedStory = await generateStory(
            story.story_context,
            choice.choice_text,
            currentNode.content
          );

          if (!generatedStory.choices || generatedStory.choices.length === 0) {
            throw new Error('Failed to generate choices for existing node');
          }

          const newChoices = [];
          for (let i = 0; i < generatedStory.choices.length; i++) {
            const ch = generatedStory.choices[i];
            const placeholderNode = await createStoryNode(
              storyId,
              `${generateUniqueNodeKey()}_placeholder`,
              '',
              false,
              null,
              i + 1,
              null
            );

            const createdChoice = await createStoryChoice(
              choice.to_node.id,
              placeholderNode.id,
              ch.text,
              ch.hint,
              i
            );
            newChoices.push({ ...createdChoice, to_node: placeholderNode });
          }

          const existingImageUrl = choice.to_node.image_url;
          const newChapter: StoryChapter = {
            node: choice.to_node,
            choices: newChoices,
            imageUrl: existingImageUrl,
            generatingImage: false
          };

          setChapters([...updatedChapters, newChapter]);
          seedChapterVideoFromNode(choice.to_node);
          setIsGenerating(false);
        } catch (error) {
          console.error('Error generating choices for node:', error);
          setIsGenerating(false);
          const existingImageUrl = choice.to_node.image_url;
          setChapters([...updatedChapters, {
            node: choice.to_node,
            choices: [],
            imageUrl: existingImageUrl,
            generatingImage: false
          }]);
          seedChapterVideoFromNode(choice.to_node);
        }
      } else {
        const existingImageUrl = choice.to_node.image_url;
        const newChapter: StoryChapter = {
          node: choice.to_node,
          choices: nextChoices,
          imageUrl: existingImageUrl,
          generatingImage: false
        };

        setChapters([...updatedChapters, newChapter]);
        seedChapterVideoFromNode(choice.to_node);
      }

      if (userId) {
        await trackChapterRead(userId, storyId, choice.to_node.id, story?.created_by || null);

        if (choice.to_node.is_ending) {
          await trackStoryCompletion(userId, storyId, story?.created_by || null);
        }
      }

      // Generate image in background without blocking (fire and forget)
      if (story && !choice.to_node.image_url) {
        console.log('No cached image, generating new image for node in background');
        generateNodeImage(choice.to_node.content, story.title).then(async (imageUrl) => {
          if (imageUrl) {
            await updateNodeImage(choice.to_node.id, imageUrl, choice.to_node.content.substring(0, 200));
            setChapters(prev => prev.map(ch =>
              ch.node.id === choice.to_node.id
                ? { ...ch, imageUrl }
                : ch
            ));
          }
        }).catch((err) => {
          console.log('Image generation failed, continuing without image:', err);
        });
      } else if (choice.to_node.image_url) {
        console.log('Using cached image from database');
      }
    }
  };

  const speakText = async (text: string, nodeId: string, audioData: string | null) => {
    try {
      setError(null);
      setIsGenerating(true);
      stopSpeech();

      const words = text.split(/\s+/);

      let base64Audio: string;

      if (audioData && !audioData.startsWith('blob:')) {
        console.log('Using cached audio from database');
        base64Audio = audioData;
      } else {
        // Only Pro/Max with auth can generate fresh audio; otherwise silently skip
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !subscriptionUsage?.features.audio) {
          setIsGenerating(false);
          setIsSpeaking(false);
          return;
        }

        if (audioData?.startsWith('blob:')) {
          console.log('Clearing invalid blob URL from cache');
          await updateNodeAudio(nodeId, null);
        }

        console.log('No cached audio, generating new audio');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(
          `${supabaseUrl}/functions/v1/text-to-speech`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              text,
              voice: 'coral',
              speed: 0.85,
            }),
          }
        );

        console.log('TTS Response status:', response.status);

        if (!response.ok) {
          // Silently fail for billing issues - TTS is optional
          if (response.status === 400 || response.status === 429) {
            console.warn('Text-to-speech unavailable (billing inactive)');
            setIsSpeaking(false);
            setIsGenerating(false);
            return;
          }
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('TTS API error:', errorData);
          setError(errorData.error || 'Failed to generate speech');
          throw new Error(errorData.error || 'Failed to generate speech');
        }

        const data = await response.json();
        console.log('TTS Response received, audio data length:', data.audio?.length);

        if (!data.audio) {
          throw new Error('No audio data received');
        }

        base64Audio = data.audio;

        await updateNodeAudio(nodeId, base64Audio);
        console.log('Audio data saved to database');
      }

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;
      audioRef.current.onplay = () => {
        console.log('Audio playing');
        setIsSpeaking(true);
        setPlayingChapterId(nodeId);
        startWordHighlighting(words, audioRef.current!.duration);
      };
      audioRef.current.onended = () => {
        console.log('Audio ended');
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        setPlayingChapterId(null);
        if (wordTimerRef.current) {
          clearInterval(wordTimerRef.current);
        }
      };
      audioRef.current.onerror = (e) => {
        console.error('Audio playback error:', e);
        setIsSpeaking(false);
        setError('Failed to play audio');
        setCurrentWordIndex(-1);
        setPlayingChapterId(null);
        if (wordTimerRef.current) {
          clearInterval(wordTimerRef.current);
        }
      };

      console.log('Starting audio playback');
      try {
        await audioRef.current.play();
      } catch (playError) {
        // Handle browser autoplay policy - don't show error, just silently fail
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          console.log('Audio autoplay blocked by browser policy - user interaction required');
          setIsSpeaking(false);
          setIsGenerating(false);
          return;
        }
        throw playError;
      }
      setIsGenerating(false);
    } catch (error) {
      console.error('Error in speakText:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsGenerating(false);
      setIsSpeaking(false);
    }
  };

  const startWordHighlighting = (words: string[], duration: number) => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
    }

    const msPerWord = (duration * 1000) / words.length;
    let wordIndex = 0;
    setCurrentWordIndex(0);

    wordTimerRef.current = setInterval(() => {
      wordIndex++;
      if (wordIndex >= words.length) {
        setCurrentWordIndex(-1);
        if (wordTimerRef.current) {
          clearInterval(wordTimerRef.current);
        }
      } else {
        setCurrentWordIndex(wordIndex);
      }
    }, msPerWord);
  };

  const stopSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setCurrentWordIndex(-1);
    setPlayingChapterId(null);
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
    }
  };

  const pauseSpeech = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
    }
  };

  const resumeSpeech = () => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsSpeaking(true);

      const currentChapter = chapters[chapters.length - 1];
      const words = currentChapter.node.content.split(/\s+/);
      const remainingDuration = audioRef.current.duration - audioRef.current.currentTime;
      const remainingWords = words.length - currentWordIndex;

      if (remainingWords > 0 && remainingDuration > 0) {
        const msPerWord = (remainingDuration * 1000) / remainingWords;
        let wordIndex = currentWordIndex;

        wordTimerRef.current = setInterval(() => {
          wordIndex++;
          if (wordIndex >= words.length) {
            setCurrentWordIndex(-1);
            if (wordTimerRef.current) {
              clearInterval(wordTimerRef.current);
            }
          } else {
            setCurrentWordIndex(wordIndex);
          }
        }, msPerWord);
      }
    }
  };

  const toggleSpeech = (text: string, nodeId: string, audioUrl: string | null) => {
    // If audio is playing and we click the same chapter, pause it
    if (isSpeaking && playingChapterId === nodeId) {
      pauseSpeech();
    }
    // If audio is playing but we click a different chapter, stop current and play new
    else if (isSpeaking && playingChapterId !== nodeId) {
      stopSpeech();
      setCurrentWordIndex(-1);
      speakText(text, nodeId, audioUrl);
    }
    // If audio is paused on the same chapter, resume it
    else if (audioRef.current && audioRef.current.src && audioRef.current.currentTime > 0 && currentWordIndex >= 0 && playingChapterId === nodeId) {
      resumeSpeech();
    }
    // Start new audio
    else if (!isGenerating) {
      setCurrentWordIndex(-1);
      speakText(text, nodeId, audioUrl);
    }
  };

  const restartStory = () => {
    stopSpeech();
    setPathTaken(['start']);
    loadStoryNode('start');
  };

  const getEndingEmoji = (endingType: string | null) => {
    switch (endingType) {
      case 'happy':
        return '🌟';
      case 'learning_moment':
        return '💡';
      default:
        return '📖';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentChapter = chapters[chapters.length - 1];
  const isStoryEnded = currentChapter?.node.is_ending;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between sticky top-0 bg-gradient-to-br from-orange-50 via-yellow-50 to-pink-50 py-4 z-10">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {chapters.map((_, idx) => (
              <div
                key={idx}
                className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">Chapter {chapters.length}</span>
        </div>

        <button
          onClick={restartStory}
          className="p-3 rounded-full bg-gray-500 hover:bg-gray-600 text-white transition-colors shadow-lg"
          aria-label="Restart story"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {generationStatus && generationStatus !== 'fully_generated' && generationProgress < 100 && (
        <div className="mb-4 bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-md">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Story generating in background...
            </span>
            <span className="text-gray-500">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All story paths will be ready as you read. No waiting!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="text-red-600 font-semibold">Audio Error:</div>
          <div className="text-red-700 flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-6">
        {chapters.map((chapter, chapterIndex) => (
          <div
            key={chapterIndex}
            ref={chapterIndex === chapters.length - 1 ? latestChapterRef : null}
          >
            {chapter.node.id === 'loading' ? (
              <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30 -ml-32 -mb-32"></div>

                <div className="relative flex flex-col items-center justify-center min-h-[300px] gap-6">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                    <Loader className="w-12 h-12 text-blue-600 animate-spin" />
                    <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold text-gray-800">Crafting your story...</h3>
                    <p className="text-gray-600">The AI is writing what happens next</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30 -ml-32 -mb-32"></div>

                <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    Chapter {chapterIndex + 1}
                  </div>
                  <button
                    onClick={() => toggleSpeech(chapter.node.content, chapter.node.id, chapter.node.audio_url)}
                    disabled={isGenerating && playingChapterId !== chapter.node.id}
                    className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={playingChapterId === chapter.node.id && isSpeaking ? "Pause" : "Play"}
                  >
                    {isGenerating && playingChapterId === chapter.node.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : playingChapterId === chapter.node.id && isSpeaking ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {chapter.imageUrl ? (
                  <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
                    <img
                      src={chapter.imageUrl}
                      alt={`Chapter ${chapterIndex + 1} illustration`}
                      className="w-full h-auto object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', chapter.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : chapter.generatingImage ? (
                  <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-8 flex items-center justify-center gap-3">
                    <Loader className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-blue-700 font-medium">Creating illustration...</span>
                  </div>
                ) : null}

                <div className="prose prose-lg max-w-none">
                  <p className="text-xl md:text-2xl leading-relaxed text-gray-800">
                    {chapter.node.content.split(/\s+/).map((word, index) => (
                      <span key={index}>
                        <span
                          className={`transition-all duration-200 ${
                            playingChapterId === chapter.node.id && index === currentWordIndex
                              ? 'bg-yellow-300 text-gray-900 px-1 rounded font-semibold'
                              : ''
                          }`}
                        >
                          {word}
                        </span>
                        {' '}
                      </span>
                    ))}
                  </p>
                </div>

                {subscriptionUsage?.features.video && (
                  <div className="mt-6 mb-6">
                    {(() => {
                      const videoEntry = chapterVideos[chapter.node.id];
                      const resolvedVideoUrl = videoEntry?.url ?? chapter.node.video_url;
                      const isVideoGenerating = videoEntry?.generating || chapter.node.video_status === 'pending';
                      const videoFailed = videoEntry?.failed || chapter.node.video_status === 'failed';

                      if (resolvedVideoUrl) {
                        return (
                      <video
                        controls
                        className="w-full rounded-2xl shadow-lg"
                          src={resolvedVideoUrl || undefined}
                      />
                        );
                      }

                      if (!isStoryOwner) {
                        return (
                          <div className="w-full bg-gray-50 text-gray-600 border border-gray-200 rounded-xl px-4 py-3 text-center">
                            Video generation is available only to the story owner. Any saved video will appear here.
                          </div>
                        );
                      }

                      return (
                      <button
                        onClick={async () => {
                          const chapterId = chapter.node.id;
                          // Allow manual retry even if auto-generation failed
                          setChapterVideos((prev) => ({
                            ...prev,
                            [chapterId]: { url: null, generating: true, failed: false },
                          }));
                          await updateNodeVideo(chapterId, { status: 'pending', error: null });
                          try {
                            const videoUrl = await generateChapterVideo({
                              prompt: `${story?.title || 'Story'} - ${chapter.node.content.slice(0, 400)}`,
                              artStyle: getArtStyleFromAudience(story?.target_audience),
                              aspectRatio: '16:9',
                            });
                            setChapterVideos((prev) => ({
                              ...prev,
                              [chapterId]: { url: videoUrl, generating: false },
                            }));
                            await updateNodeVideo(chapterId, { videoUrl, status: 'complete', error: null });
                          } catch (err) {
                            console.error('Video generation failed', err);
                            showToast('Video generation failed. Please try again.', 'error');
                            setChapterVideos((prev) => ({
                              ...prev,
                              [chapterId]: { url: null, generating: false, failed: true },
                            }));
                            await updateNodeVideo(chapterId, { status: 'failed', error: (err as Error).message?.slice(0, 500) || 'Video generation failed' });
                          }
                        }}
                          disabled={isVideoGenerating}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                      >
                          {isVideoGenerating
                          ? 'Generating video...'
                            : videoFailed
                            ? 'Retry video generation'
                            : 'Generate video for this chapter'}
                      </button>
                      );
                    })()}
                  </div>
                )}

                {chapter.node.is_ending && (
                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-100 to-orange-100 px-8 py-4 rounded-2xl">
                      <span className="text-4xl">{getEndingEmoji(chapter.node.ending_type)}</span>
                      <span className="text-xl font-semibold text-gray-700">The End</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

            {chapter.node.id !== 'loading' && chapter.choices.length > 0 && (
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-2 justify-center mb-6">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-xl font-semibold text-gray-700">What should happen next?</h3>
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {chapter.choices.map((choice) => {
                    const isSelected = chapter.selectedChoiceId === choice.id;
                    const isDisabled = chapter.selectedChoiceId !== undefined;

                    return (
                      <button
                        key={choice.id}
                        onClick={() => handleChoice(chapterIndex, choice)}
                        disabled={isDisabled}
                        className={`group relative bg-white rounded-2xl p-6 text-left transition-all duration-300 shadow-lg ${
                          isSelected
                            ? 'ring-4 ring-green-400 scale-105'
                            : isDisabled
                            ? 'opacity-30'
                            : 'hover:scale-105 hover:ring-4 hover:ring-blue-300 hover:shadow-2xl'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl"></div>
                        )}
                        {!isDisabled && !isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        )}

                        <div className="relative">
                          <p className="text-lg font-semibold text-gray-800 mb-2">
                            {choice.choice_text}
                          </p>
                          {choice.consequence_hint && (
                            <p className="text-sm text-gray-600 italic">
                              💭 {choice.consequence_hint}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {isStoryEnded && (
        <>
          {story?.creator && (
            <div className="bg-white rounded-3xl shadow-xl p-8 mt-8 mx-auto max-w-md">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Story created by</p>
                <div className="flex items-center justify-center gap-3">
                  {story.creator.avatar_url ? (
                    <img
                      src={story.creator.avatar_url}
                      alt={story.creator.display_name || 'Creator'}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <span className="text-xl font-bold text-gray-800">
                    {story.creator.display_name || 'Anonymous'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-xl p-8 mt-8 mx-auto max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">Did you enjoy this story?</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                  userReaction?.reaction_type === 'like'
                    ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                }`}
                onClick={async () => {
                  if (!userId) {
                    showToast('Please sign in to react to stories', 'warning');
                    return;
                  }
                  try {
                    if (userReaction?.reaction_type === 'like') {
                      await removeReaction(userId, storyId);
                      setUserReaction(null);
                      setLikesCount(prev => prev - 1);
                    } else {
                      if (userReaction) {
                        await updateReaction(userId, storyId, 'like');
                        setDislikesCount(prev => prev - 1);
                        setLikesCount(prev => prev + 1);
                      } else {
                        await addReaction(userId, storyId, 'like');
                        setLikesCount(prev => prev + 1);
                      }
                      setUserReaction({ user_id: userId, story_id: storyId, reaction_type: 'like', created_at: new Date().toISOString() });
                    }
                  } catch (error) {
                    console.error('Error handling reaction:', error);
                    showToast('Failed to save reaction', 'error');
                  }
                }}
              >
                <ThumbsUp className="w-5 h-5" />
                <span>{likesCount}</span>
              </button>

              <button
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-semibold ${
                  userReaction?.reaction_type === 'dislike'
                    ? 'bg-red-100 text-red-700 ring-2 ring-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                }`}
                onClick={async () => {
                  if (!userId) {
                    showToast('Please sign in to react to stories', 'warning');
                    return;
                  }
                  try {
                    if (userReaction?.reaction_type === 'dislike') {
                      await removeReaction(userId, storyId);
                      setUserReaction(null);
                      setDislikesCount(prev => prev - 1);
                    } else {
                      if (userReaction) {
                        await updateReaction(userId, storyId, 'dislike');
                        setLikesCount(prev => prev - 1);
                        setDislikesCount(prev => prev + 1);
                      } else {
                        await addReaction(userId, storyId, 'dislike');
                        setDislikesCount(prev => prev + 1);
                      }
                      setUserReaction({ user_id: userId, story_id: storyId, reaction_type: 'dislike', created_at: new Date().toISOString() });
                    }
                  } catch (error) {
                    console.error('Error handling reaction:', error);
                    showToast('Failed to save reaction', 'error');
                  }
                }}
              >
                <ThumbsDown className="w-5 h-5" />
                <span>{dislikesCount}</span>
              </button>

              <button
                className="flex items-center gap-2 px-6 py-3 rounded-xl transition-all bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
                onClick={async () => {
                  const shareUrl = `${window.location.origin}?story=${storyId}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: story?.title || 'Story',
                        text: `Check out this interactive story: ${story?.title}`,
                        url: shareUrl,
                      });
                    } catch (error) {
                      if ((error as Error).name !== 'AbortError') {
                        console.error('Error sharing:', error);
                      }
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      showToast('Link copied to clipboard!', 'success');
                    } catch (error) {
                      console.error('Error copying to clipboard:', error);
                      showToast('Failed to copy link', 'error');
                    }
                  }
                }}
              >
                <Share2 className="w-5 h-5" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-8 pb-12">
            <button
              onClick={restartStory}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Read Again
            </button>
            <button
              onClick={onComplete}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Choose Another Story
            </button>
          </div>
        </>
      )}
    </div>
  );
}
