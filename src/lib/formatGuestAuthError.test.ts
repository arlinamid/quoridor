import { describe, expect, it } from 'vitest';
import { formatGuestAuthError } from './supabase';

describe('formatGuestAuthError', () => {
  it('maps anonymous DB signup failure to Hungarian guidance', () => {
    const msg = formatGuestAuthError(new Error('Database error creating anonymous user'));
    expect(msg).toContain('vendégfiókot');
    expect(msg).toContain('magic link');
  });

  it('maps generic database error substring', () => {
    expect(formatGuestAuthError({ message: 'Database error saving new user' })).toContain('adatbázis');
  });

  it('maps internal server error', () => {
    expect(formatGuestAuthError(new Error('Internal Server Error'))).toContain('adatbázis');
  });

  it('maps network-style errors', () => {
    expect(formatGuestAuthError(new Error('Network request failed'))).toContain('Hálózati');
    expect(formatGuestAuthError(new Error('Failed to fetch'))).toContain('Hálózati');
  });

  it('passes through unknown messages', () => {
    expect(formatGuestAuthError(new Error('Invalid login credentials'))).toBe('Invalid login credentials');
  });

  it('handles empty message with fallback', () => {
    expect(formatGuestAuthError(new Error('   '))).toMatch(/Ismeretlen|hiba/i);
  });

  it('handles non-Error primitives', () => {
    expect(formatGuestAuthError(null)).toMatch(/Ismeretlen|hiba/i);
    expect(formatGuestAuthError(undefined)).toMatch(/Ismeretlen|hiba/i);
  });
});
