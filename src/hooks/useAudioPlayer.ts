/**
 * Custom hook for audio playback with word highlighting.
 * Handles TTS generation, caching, and synchronized word highlighting.
 */

import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { config } from '../config';

interface UseAudioPlayerOptions {
  onWordChange?: (index: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onError?: (error: string) => void;
}

interface UseAudioPlayerReturn {
  isPlaying: boolean;
  isLoading: boolean;
  currentWordIndex: number;
  playingNodeId: string | null;
  error: string | null;
  play: (text: string, nodeId: string, cachedAudio?: string | null) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggle: (text: string, nodeId: string, cachedAudio?: string | null) => void;
}

export function useAudioPlayer(options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef<string[]>([]);

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
    options.onWordChange?.(0);

    wordTimerRef.current = setInterval(() => {
      wordIndex++;
      if (wordIndex >= words.length) {
        setCurrentWordIndex(-1);
        options.onWordChange?.(-1);
        clearWordTimer();
      } else {
        setCurrentWordIndex(wordIndex);
        options.onWordChange?.(wordIndex);
      }
    }, msPerWord);
  }, [clearWordTimer, options]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentWordIndex(-1);
    setPlayingNodeId(null);
    clearWordTimer();
    options.onPlayStateChange?.(false);
  }, [clearWordTimer, options]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    clearWordTimer();
    options.onPlayStateChange?.(false);
  }, [clearWordTimer, options]);

  const resume = useCallback(() => {
    if (audioRef.current?.src && audioRef.current.currentTime > 0) {
      audioRef.current.play();
      setIsPlaying(true);
      options.onPlayStateChange?.(true);

      // Resume word highlighting
      const remainingDuration = audioRef.current.duration - audioRef.current.currentTime;
      const remainingWords = wordsRef.current.length - currentWordIndex;

      if (remainingWords > 0 && remainingDuration > 0) {
        const msPerWord = (remainingDuration * 1000) / remainingWords;
        let wordIndex = currentWordIndex;

        wordTimerRef.current = setInterval(() => {
          wordIndex++;
          if (wordIndex >= wordsRef.current.length) {
            setCurrentWordIndex(-1);
            options.onWordChange?.(-1);
            clearWordTimer();
          } else {
            setCurrentWordIndex(wordIndex);
            options.onWordChange?.(wordIndex);
          }
        }, msPerWord);
      }
    }
  }, [currentWordIndex, clearWordTimer, options]);

  const play = useCallback(async (text: string, nodeId: string, cachedAudio?: string | null) => {
    try {
      setError(null);
      setIsLoading(true);
      stop();

      const words = text.split(/\s+/);
      wordsRef.current = words;

      let base64Audio: string;

      // Use cached audio if available and valid
      if (cachedAudio && !cachedAudio.startsWith('blob:')) {
        base64Audio = cachedAudio;
      } else {
        // Generate new audio via TTS
        const response = await fetch(
          `${config.supabase.functionsUrl}/text-to-speech`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.supabase.anonKey}`,
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
            console.warn('Text-to-speech unavailable');
            setIsLoading(false);
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
      }

      // Convert base64 to blob URL
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Create audio element if needed
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;
      audioRef.current.onplay = () => {
        setIsPlaying(true);
        setPlayingNodeId(nodeId);
        options.onPlayStateChange?.(true);
        startWordHighlighting(words, audioRef.current!.duration);
      };
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
        setPlayingNodeId(null);
        clearWordTimer();
        options.onPlayStateChange?.(false);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play audio');
        setCurrentWordIndex(-1);
        setPlayingNodeId(null);
        clearWordTimer();
        options.onError?.('Failed to play audio');
      };

      await audioRef.current.play();
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate speech';
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      options.onError?.(errorMessage);
    }
  }, [stop, startWordHighlighting, clearWordTimer, options]);

  const toggle = useCallback((text: string, nodeId: string, cachedAudio?: string | null) => {
    if (isPlaying && playingNodeId === nodeId) {
      pause();
    } else if (isPlaying && playingNodeId !== nodeId) {
      stop();
      play(text, nodeId, cachedAudio);
    } else if (audioRef.current?.src && audioRef.current.currentTime > 0 && playingNodeId === nodeId) {
      resume();
    } else if (!isLoading) {
      play(text, nodeId, cachedAudio);
    }
  }, [isPlaying, isLoading, playingNodeId, pause, stop, play, resume]);

  return {
    isPlaying,
    isLoading,
    currentWordIndex,
    playingNodeId,
    error,
    play,
    pause,
    resume,
    stop,
    toggle,
  };
}
