import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShare } from './useShare';
import { ToastProvider } from '../components/Toast';
import React, { ReactNode } from 'react';

// Wrapper with ToastProvider
function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

describe('useShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('share function with native share', () => {
    it('should use native share when available', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: mockShare,
        clipboard: { writeText: vi.fn() },
      });

      const { result } = renderHook(() => useShare(), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.share('https://example.com', 'Test Title', 'Test text');
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        text: 'Test text',
        url: 'https://example.com',
      });
      expect(success).toBe(true);
    });

    it('should use title as text if text not provided', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: mockShare,
        clipboard: { writeText: vi.fn() },
      });

      const { result } = renderHook(() => useShare(), { wrapper });

      await act(async () => {
        await result.current.share('https://example.com', 'Test Title');
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test Title',
        text: 'Test Title',
        url: 'https://example.com',
      });
    });

    it('should return false when native share is cancelled', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('navigator', {
        share: mockShare,
        clipboard: { writeText: vi.fn() },
      });

      const { result } = renderHook(() => useShare(), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.share('https://example.com', 'Test Title');
      });

      expect(success).toBe(false);
    });
  });

  describe('share function with clipboard fallback', () => {
    it('should fall back to clipboard when native share not available', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: undefined,
        clipboard: { writeText: mockWriteText },
      });

      const { result } = renderHook(() => useShare(), { wrapper });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.share('https://example.com', 'Test Title');
      });

      expect(mockWriteText).toHaveBeenCalledWith('https://example.com');
      expect(success).toBe(true);
    });

    it('should return false when clipboard fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      vi.stubGlobal('navigator', {
        share: undefined,
        clipboard: { writeText: mockWriteText },
      });

      const { result } = renderHook(() => useShare(), { wrapper });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.share('https://example.com', 'Test Title');
      });

      expect(success).toBe(false);
    });
  });

  describe('shareStory function', () => {
    it('should construct correct story URL', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        share: mockShare,
        clipboard: { writeText: vi.fn() },
      });
      vi.stubGlobal('location', { origin: 'https://mystories.com' });

      const { result } = renderHook(() => useShare(), { wrapper });

      await act(async () => {
        await result.current.shareStory('story-123', 'My Great Story');
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: 'My Great Story',
        text: 'Check out this interactive story: My Great Story',
        url: 'https://mystories.com?story=story-123',
      });
    });
  });
});
