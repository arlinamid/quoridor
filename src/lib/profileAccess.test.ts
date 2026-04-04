import { describe, expect, it } from 'vitest';
import { profileSelectTable } from './profileAccess';

describe('profileSelectTable', () => {
  const uid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const other = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  it('uses full profiles when viewer matches target', () => {
    expect(profileSelectTable(uid, uid)).toBe('profiles');
  });

  it('uses profiles_peer for different viewer', () => {
    expect(profileSelectTable(uid, other)).toBe('profiles_peer');
  });

  it('uses profiles_peer when viewer is null (no self context)', () => {
    expect(profileSelectTable(uid, null)).toBe('profiles_peer');
  });

  it('uses profiles_peer when viewer is undefined', () => {
    expect(profileSelectTable(uid, undefined)).toBe('profiles_peer');
  });

  it('uses profiles_peer for empty string viewer', () => {
    expect(profileSelectTable(uid, '')).toBe('profiles_peer');
  });

  it.each([
    [other, uid],
    [uid, other],
  ])('peer read when ids differ (%s vs %s)', (target, viewer) => {
    expect(profileSelectTable(target, viewer)).toBe('profiles_peer');
  });
});
