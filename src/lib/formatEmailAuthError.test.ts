import { describe, expect, it } from 'vitest';
import { formatEmailAuthError, isEmailRateLimitError } from './supabase';

describe('isEmailRateLimitError', () => {
  it('detects over_email_send_rate_limit code', () => {
    expect(isEmailRateLimitError({ code: 'over_email_send_rate_limit', message: 'x' })).toBe(true);
  });

  it('detects message substrings', () => {
    expect(isEmailRateLimitError(new Error('Email rate limit exceeded'))).toBe(true);
    expect(isEmailRateLimitError(new Error('Rate limit reached'))).toBe(true);
  });

  it('detects HTTP 429 shape', () => {
    expect(isEmailRateLimitError({ status: 429, message: 'Too many requests' })).toBe(true);
  });

  it('returns false for other errors', () => {
    expect(isEmailRateLimitError(new Error('Invalid email'))).toBe(false);
  });
});

describe('formatEmailAuthError', () => {
  it('maps rate limit to Hungarian guidance', () => {
    const s = formatEmailAuthError(new Error('rate limit exceeded'));
    expect(s).toContain('Supabase');
    expect(s).toContain('limit');
  });

  it('passes through unrelated messages', () => {
    expect(formatEmailAuthError(new Error('User not found'))).toBe('User not found');
  });
});
