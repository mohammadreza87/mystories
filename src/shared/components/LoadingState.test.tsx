import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('renders default message and spinner', () => {
    render(<LoadingState />);

    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('applies size classes', () => {
    render(<LoadingState size="lg" />);

    const spinner = screen.getByRole('status', { name: /loading/i });
    expect(spinner.className).toContain('h-16');
    expect(spinner.className).toContain('w-16');
  });

  it('uses full screen layout when requested', () => {
    render(<LoadingState fullScreen />);

    const container = screen.getByText(/loading/i).closest('div');
    expect(container?.className).toContain('min-h-screen');
  });
});
