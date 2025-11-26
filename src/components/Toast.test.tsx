import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

describe('Toast Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useToast hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      // Suppress console error for this test
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useToast());
      }).toThrow('useToast must be used within a ToastProvider');

      spy.mockRestore();
    });

    it('should provide showToast and removeToast functions', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      expect(result.current.showToast).toBeDefined();
      expect(result.current.removeToast).toBeDefined();
      expect(result.current.toasts).toEqual([]);
    });
  });

  describe('showToast', () => {
    it('should add a toast to the list', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Test message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Test message');
      expect(result.current.toasts[0].type).toBe('info');
    });

    it('should add toast with specified type', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Error message', 'error');
      });

      expect(result.current.toasts[0].type).toBe('error');
    });

    it('should auto-remove toast after duration', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Test message', 'info', 3000);
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should not auto-remove toast when duration is 0', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Persistent message', 'info', 0);
      });

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(result.current.toasts).toHaveLength(1);
    });
  });

  describe('removeToast', () => {
    it('should remove specific toast by id', () => {
      const { result } = renderHook(() => useToast(), {
        wrapper: ToastProvider,
      });

      act(() => {
        result.current.showToast('Message 1', 'info', 0);
        result.current.showToast('Message 2', 'info', 0);
      });

      expect(result.current.toasts).toHaveLength(2);

      const toastId = result.current.toasts[0].id;

      act(() => {
        result.current.removeToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Message 2');
    });
  });

  describe('ToastProvider rendering', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Child content</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render toast messages', () => {
      function TestComponent() {
        const { showToast } = useToast();
        return (
          <button onClick={() => showToast('Test toast message', 'success')}>
            Show Toast
          </button>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));

      expect(screen.getByText('Test toast message')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should render different toast types with correct styling', () => {
      function TestComponent() {
        const { showToast } = useToast();
        return (
          <>
            <button onClick={() => showToast('Success', 'success', 0)}>Success</button>
            <button onClick={() => showToast('Error', 'error', 0)}>Error</button>
            <button onClick={() => showToast('Warning', 'warning', 0)}>Warning</button>
            <button onClick={() => showToast('Info', 'info', 0)}>Info</button>
          </>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Success'));
      fireEvent.click(screen.getByText('Error'));
      fireEvent.click(screen.getByText('Warning'));
      fireEvent.click(screen.getByText('Info'));

      const alerts = screen.getAllByRole('alert');
      expect(alerts).toHaveLength(4);
    });

    it('should dismiss toast when close button is clicked', () => {
      function TestComponent() {
        const { showToast, toasts } = useToast();
        return (
          <>
            <button onClick={() => showToast('Dismissable toast', 'info', 0)}>
              Show Toast
            </button>
            <span data-testid="toast-count">{toasts.length}</span>
          </>
        );
      }

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      fireEvent.click(screen.getByText('Show Toast'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      const dismissButton = screen.getByRole('button', { name: 'Dismiss' });
      fireEvent.click(dismissButton);

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });
  });
});
