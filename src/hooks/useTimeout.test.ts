import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimeout, useInterval, useIsMounted, useSafeAsync } from './useTimeout';

describe('useTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute callback after delay', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
    });

    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout when clear is called', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
    });

    act(() => {
      result.current.clear();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should clear timeout on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback, 1000);
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should replace previous timeout when set is called again', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    const { result } = renderHook(() => useTimeout());

    act(() => {
      result.current.set(callback1, 1000);
    });

    act(() => {
      result.current.set(callback2, 500);
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});

describe('useInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute callback repeatedly', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useInterval());

    act(() => {
      result.current.set(callback, 100);
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should clear interval when clear is called', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useInterval());

    act(() => {
      result.current.set(callback, 100);
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(callback).toHaveBeenCalledTimes(2);

    act(() => {
      result.current.clear();
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should clear interval on unmount', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useInterval());

    act(() => {
      result.current.set(callback, 100);
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(callback).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('useIsMounted', () => {
  it('should return true when mounted', () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current()).toBe(true);
  });

  it('should return false after unmount', () => {
    const { result, unmount } = renderHook(() => useIsMounted());

    expect(result.current()).toBe(true);

    unmount();

    expect(result.current()).toBe(false);
  });
});

describe('useSafeAsync', () => {
  it('should call onSuccess when async function succeeds', async () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => useSafeAsync());

    await act(async () => {
      await result.current.execute(asyncFn, onSuccess, onError);
    });

    expect(onSuccess).toHaveBeenCalledWith('result');
    expect(onError).not.toHaveBeenCalled();
  });

  it('should call onError when async function fails', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);
    const onSuccess = vi.fn();
    const onError = vi.fn();

    const { result } = renderHook(() => useSafeAsync());

    await act(async () => {
      await result.current.execute(asyncFn, onSuccess, onError);
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should not call callbacks after unmount', async () => {
    const asyncFn = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve('result'), 100))
    );
    const onSuccess = vi.fn();

    const { result, unmount } = renderHook(() => useSafeAsync());

    // Start the async operation
    const promise = result.current.execute(asyncFn, onSuccess);

    // Unmount before completion
    unmount();

    // Wait for the async operation to complete
    await act(async () => {
      await promise;
    });

    // onSuccess should not be called because component unmounted
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
