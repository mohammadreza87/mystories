/**
 * Tests for error handling utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  AppError,
  ErrorCodes,
  getUserFacingMessage,
  logError,
} from './errors';

describe('AppError', () => {
  it('should create error with code and message', () => {
    const error = new AppError(ErrorCodes.NOT_FOUND, 'Story not found', 404);

    expect(error.code).toBe(ErrorCodes.NOT_FOUND);
    expect(error.message).toBe('Story not found');
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('AppError');
  });

  it('should detect upgrade required errors', () => {
    const limitError = new AppError(ErrorCodes.DAILY_LIMIT_REACHED, 'Limit reached');
    const subError = new AppError(ErrorCodes.SUBSCRIPTION_REQUIRED, 'Sub required');
    const otherError = new AppError(ErrorCodes.NOT_FOUND, 'Not found');

    expect(limitError.isUpgradeRequired()).toBe(true);
    expect(subError.isUpgradeRequired()).toBe(true);
    expect(otherError.isUpgradeRequired()).toBe(false);
  });

  it('should detect auth errors', () => {
    const authError = new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized');
    const sessionError = new AppError(ErrorCodes.SESSION_EXPIRED, 'Expired');
    const otherError = new AppError(ErrorCodes.NOT_FOUND, 'Not found');

    expect(authError.isAuthError()).toBe(true);
    expect(sessionError.isAuthError()).toBe(true);
    expect(otherError.isAuthError()).toBe(false);
  });
});

describe('getUserFacingMessage', () => {
  it('should return user-friendly message for AppError', () => {
    const error = new AppError(ErrorCodes.DAILY_LIMIT_REACHED, 'Internal message');
    const message = getUserFacingMessage(error);

    expect(message).toContain('daily story limit');
    expect(message).toContain('Pro');
  });

  it('should return message for standard Error', () => {
    const error = new Error('Something went wrong');
    const message = getUserFacingMessage(error);

    expect(message).toBe('Something went wrong');
  });

  it('should return network error message for fetch failures', () => {
    const error = new Error('fetch failed');
    const message = getUserFacingMessage(error);

    expect(message).toContain('Network error');
  });

  it('should return generic message for unknown errors', () => {
    const message = getUserFacingMessage('some string error');

    expect(message).toContain('unexpected error');
  });
});

describe('logError', () => {
  it('should log error with context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new AppError(ErrorCodes.NOT_FOUND, 'Story not found', 404);
    logError('StoryReader', error, { storyId: '123' });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedData = consoleSpy.mock.calls[0][1];
    expect(loggedData.context).toBe('StoryReader');
    expect(loggedData.storyId).toBe('123');

    consoleSpy.mockRestore();
  });
});
