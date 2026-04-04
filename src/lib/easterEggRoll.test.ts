import { describe, expect, it } from 'vitest';
import { rollEggAt } from './easterEggRoll';

const EVENT_START = new Date('2026-04-04T12:00:00.000Z');
const OFF_SEASON = new Date('2026-03-01T12:00:00.000Z');

describe('rollEggAt', () => {
  describe('event window (2026-04-04 .. 2026-04-08)', () => {
    it('returns RAINBOW for lowest rolls', () => {
      expect(rollEggAt(EVENT_START, () => 0)).toBe('EGG_RAINBOW');
      expect(rollEggAt(EVENT_START, () => 0.002999)).toBe('EGG_RAINBOW');
    });

    it('returns GOLD between rainbow and basic thresholds', () => {
      expect(rollEggAt(EVENT_START, () => 0.003)).toBe('EGG_GOLD');
      expect(rollEggAt(EVENT_START, () => 0.011999)).toBe('EGG_GOLD');
    });

    it('returns BASIC before upper event bound', () => {
      expect(rollEggAt(EVENT_START, () => 0.012)).toBe('EGG_BASIC');
      expect(rollEggAt(EVENT_START, () => 0.044999)).toBe('EGG_BASIC');
    });

    it('returns null at or above 0.045', () => {
      expect(rollEggAt(EVENT_START, () => 0.045)).toBeNull();
      expect(rollEggAt(EVENT_START, () => 0.99)).toBeNull();
    });
  });

  describe('off-season', () => {
    it('uses tighter thresholds', () => {
      expect(rollEggAt(OFF_SEASON, () => 0)).toBe('EGG_RAINBOW');
      expect(rollEggAt(OFF_SEASON, () => 0.000499)).toBe('EGG_RAINBOW');
      expect(rollEggAt(OFF_SEASON, () => 0.0005)).toBe('EGG_GOLD');
      expect(rollEggAt(OFF_SEASON, () => 0.001999)).toBe('EGG_GOLD');
      expect(rollEggAt(OFF_SEASON, () => 0.002)).toBe('EGG_BASIC');
      expect(rollEggAt(OFF_SEASON, () => 0.004999)).toBe('EGG_BASIC');
      expect(rollEggAt(OFF_SEASON, () => 0.005)).toBeNull();
    });
  });

  describe('distribution sanity (event tier sums)', () => {
    it('approximates combined hit rate ~4.5% over a uniform grid of rolls', () => {
      const n = 50_000;
      let hits = 0;
      for (let i = 0; i < n; i++) {
        const r = (i + 0.5) / n;
        if (rollEggAt(EVENT_START, () => r) !== null) hits++;
      }
      const p = hits / n;
      expect(p).toBeGreaterThan(0.042);
      expect(p).toBeLessThan(0.048);
    });
  });
});
