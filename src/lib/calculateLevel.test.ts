import { describe, expect, it } from 'vitest';
import { calculateLevel } from './supabase';

describe('calculateLevel', () => {
  it('level 1 at 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it.each([
    [0, 1],
    [99, 1],
    [100, 2],
    [399, 2],
    [400, 3],
    [899, 3],
    [900, 4],
    [901, 4],
  ])('calculateLevel(%i) === %i', (xp, lvl) => {
    expect(calculateLevel(xp)).toBe(lvl);
  });

  it('matches sqrt formula floor(sqrt(xp/100))+1', () => {
    for (const xp of [0, 50, 250, 1000, 10000]) {
      expect(calculateLevel(xp)).toBe(Math.floor(Math.sqrt(xp / 100)) + 1);
    }
  });

  it('is monotonic non-decreasing', () => {
    let prev = 0;
    for (let xp = 0; xp <= 5000; xp += 17) {
      expect(calculateLevel(xp)).toBeGreaterThanOrEqual(prev);
      prev = calculateLevel(xp);
    }
  });
});
