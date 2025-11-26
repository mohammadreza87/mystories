/**
 * Hook for managing story audio playback with word highlighting.
 *
 * Encapsulates all text-to-speech functionality:
 * - Audio generation via TTS API
 * - Playback controls (play, pause, stop, resume)
 * - Word-by-word highlighting synchronized with audio
 * - Audio caching to database
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { updateNodeAudio } from '../lib/storyService';
import { useTimeout } from './useTimeout';

interface UseAudioPlaybackOptions {
  onError?: (error: string) => void;
}

interface UseAudioPlaybackReturn {
  // State
  isSpeaking: boolean;
  isGenerating: boolean;
  currentWordIndex: number;
  playingNodeId: string | null;

  // Actions
  speakText: (text: string, nodeId: string, cachedAudioData: string | null) => Promise<void>;
  stopSpeech: () => void;
  pauseSpeech: () => void;
  resumeSpeech: (text: string) => void;
  toggleSpeech: (text: string, nodeId: string, audioUrl: string | null) => void;

  // Cleanup
  cleanup: () => void;
}

export function useAudioPlayback(options: UseAudioPlaybackOptions = {}): UseAudioPlaybackReturn {
  const { onError } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safeTimeout = useTimeout();

  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  }, []);

  const startWordHighlighting = useCallback((words: string[], duration: number) => {
    clearWordTimer();

    const msPerWord = (duration * 1000) / words.length;
    let wordIndex = 0;
    setCurrentWordIndex(0);

    wordTimerRef.current = setInterval(() => {
      wordIndex++;
      if (wordIndex >= words.length) {
        setCurrentWordIndex(-1);
        clearWordTimer();
      } else {
        setCurrentWordIndex(wordIndex);
      }
    }, msPerWord);
  }, [clearWordTimer]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
    setCurrentWordIndex(-1);
    setPlayingNodeId(null);
    clearWordTimer();
  }, [clearWordTimer]);

  const pauseSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsSpeaking(false);
    clearWordTimer();
  }, [clearWordTimer]);

  const speakText = useCallback(async (text: string, nodeId: string, cachedAudioData: string | null) => {
    try {
      setIsGenerating(true);
      stopSpeech();

      const words = text.split(/\s+/);
      let base64Audio: string;

      // Use cached audio if available and valid
      if (cachedAudioData && !cachedAudioData.startsWith('blob:')) {
        base64Audio = cachedAudioData;
      } else {
        // Clear invalid blob URL from cache
        if (cachedAudioData?.startsWith('blob:')) {
          await updateNodeAudio(nodeId, null);
        }

        // Generate new audio via TTS API
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Not authenticated');
        }

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

        if (!response.ok) {
          // Silently fail for billing issues - TTS is optional
          if (response.status === 400 || response.status === 429) {
            console.warn('Text-to-speech unavailable (billing inactive)');
            setIsGenerating(false);
            return;
          }
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to generate speech');
        }

        const data = await response.json();
        if (!data.audio) {
          throw new Error('No audio data received');
        }

        base64Audio = data.audio;

        // Cache audio to database
        await updateNodeAudio(nodeId, base64Audio);
      }

      // Convert base64 to blob and create audio element
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;

      audioRef.current.onplay = () => {
        setIsSpeaking(true);
        setPlayingNodeId(nodeId);
        startWordHighlighting(words, audioRef.current!.duration);
      };

      audioRef.current.onended = () => {
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        setPlayingNodeId(null);
        clearWordTimer();
      };

      audioRef.current.onerror = () => {
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        setPlayingNodeId(null);
        clearWordTimer();
        onError?.('Failed to play audio');
      };

      await audioRef.current.play();
      setIsGenerating(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate speech';
      onError?.(errorMessage);
      setIsGenerating(false);
      setIsSpeaking(false);
    }
  }, [stopSpeech, startWordHighlighting, clearWordTimer, onError]);

  const resumeSpeech = useCallback((text: string) => {
    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsSpeaking(true);

      const words = text.split(/\s+/);
      const remainingDuration = audioRef.current.duration - audioRef.current.currentTime;
      const remainingWords = words.length - currentWordIndex;

      if (remainingWords > 0 && remainingDuration > 0) {
        const msPerWord = (remainingDuration * 1000) / remainingWords;
        let wordIndex = currentWordIndex;

        wordTimerRef.current = setInterval(() => {
          wordIndex++;
          if (wordIndex >= words.length) {
            setCurrentWordIndex(-1);
            clearWordTimer();
          } else {
            setCurrentWordIndex(wordIndex);
          }
        }, msPerWord);
      }
    }
  }, [currentWordIndex, clearWordTimer]);

  const toggleSpeech = useCallback((text: string, nodeId: string, audioUrl: string | null) => {
    // If audio is playing and we click the same node, pause it
    if (isSpeaking && playingNodeId === nodeId) {
      pauseSpeech();
      return;
    }

    // If audio is playing but we click a different node, stop current and play new
    if (isSpeaking && playingNodeId !== nodeId) {
      stopSpeech();
      setCurrentWordIndex(-1);
      speakText(text, nodeId, audioUrl);
      return;
    }

    // If audio is paused on the same node, resume it
    if (
      audioRef.current &&
      audioRef.current.src &&
      audioRef.current.currentTime > 0 &&
      currentWordIndex >= 0 &&
      playingNodeId === nodeId
    ) {
      resumeSpeech(text);
      return;
    }

    // Start new audio
    if (!isGenerating) {
      setCurrentWordIndex(-1);
      speakText(text, nodeId, audioUrl);
    }
  }, [isSpeaking, playingNodeId, isGenerating, currentWordIndex, pauseSpeech, stopSpeech, speakText, resumeSpeech]);

  const cleanup = useCallback(() => {
    stopSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    clearWordTimer();
  }, [stopSpeech, clearWordTimer]);

  return {
    isSpeaking,
    isGenerating,
    currentWordIndex,
    playingNodeId,
    speakText,
    stopSpeech,
    pauseSpeech,
    resumeSpeech,
    toggleSpeech,
    cleanup,
  };
}
