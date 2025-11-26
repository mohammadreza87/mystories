import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default title and message', () => {
    render(<ErrorState />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/please try again/i)).toBeInTheDocument();
  });

  it('renders custom title/message and handles retry', () => {
    const retry = vi.fn();
    render(<ErrorState title="Oops" message="Custom message" onRetry={retry} />);

    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByText('Custom message')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
