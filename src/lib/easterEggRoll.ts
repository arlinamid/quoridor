import type { CollectibleType } from './types';

/** Deterministic egg roll for tests and production (`nextRoll` defaults to Math.random). */
export function rollEggAt(now: Date, nextRoll: () => number = Math.random): CollectibleType | null {
  const isEvent = now >= new Date('2026-04-04') && now < new Date('2026-04-09');
  const roll = nextRoll();
  if (isEvent) {
    if (roll < 0.003) return 'EGG_RAINBOW';
    if (roll < 0.012) return 'EGG_GOLD';
    if (roll < 0.045) return 'EGG_BASIC';
  } else {
    if (roll < 0.0005) return 'EGG_RAINBOW';
    if (roll < 0.002) return 'EGG_GOLD';
    if (roll < 0.005) return 'EGG_BASIC';
  }
  return null;
}
