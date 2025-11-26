import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for safely managing setTimeout with automatic cleanup.
 * Prevents memory leaks by clearing timeout on unmount.
 */
export function useTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any pending timeout on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // Only execute if still mounted
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { set, clear };
}

/**
 * Custom hook for safely managing setInterval with automatic cleanup.
 * Prevents memory leaks by clearing interval on unmount.
 */
export function useInterval() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Clean up any pending interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const set = useCallback((callback: () => void, delay: number) => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      // Only execute if still mounted
      if (isMountedRef.current) {
        callback();
      }
    }, delay);
  }, []);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { set, clear, ref: intervalRef };
}

/**
 * Hook that returns whether the component is mounted.
 * Useful for async operations to check if it's safe to update state.
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return useCallback(() => isMountedRef.current, []);
}

/**
 * Hook for safely executing async operations.
 * Automatically cancels state updates if component unmounts.
 */
export function useSafeAsync<T>() {
  const isMounted = useIsMounted();

  const execute = useCallback(
    async (
      asyncFn: () => Promise<T>,
      onSuccess: (result: T) => void,
      onError?: (error: Error) => void
    ) => {
      try {
        const result = await asyncFn();
        if (isMounted()) {
          onSuccess(result);
        }
      } catch (error) {
        if (isMounted() && onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
    [isMounted]
  );

  return { execute, isMounted };
}
