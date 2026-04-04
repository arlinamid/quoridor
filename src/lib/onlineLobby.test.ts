import { describe, expect, it } from 'vitest';
import { countFilledOnlineSlots, filterBotSlotsForPlayerCount } from './onlineLobby';

describe('countFilledOnlineSlots', () => {
  it('counts humans and bots only within lobby cap', () => {
    const row = {
      player1_id: 'a',
      player2_id: 'b',
      player3_id: null,
      player4_id: null,
    };
    expect(countFilledOnlineSlots(row, 3, [])).toBe(2);
    expect(countFilledOnlineSlots(row, 3, [2])).toBe(3);
  });

  it('ignores empty high slots when cap is 2', () => {
    const row = {
      player1_id: 'a',
      player2_id: 'b',
      player3_id: 'ghost',
    };
    expect(countFilledOnlineSlots(row, 2, [])).toBe(2);
  });

  it('returns 0 for null row with no bots', () => {
    expect(countFilledOnlineSlots(null, 2, [])).toBe(0);
  });
});

describe('filterBotSlotsForPlayerCount', () => {
  it('drops bots in removed slots', () => {
    expect(filterBotSlotsForPlayerCount([1, 2], 2)).toEqual([1]);
    expect(filterBotSlotsForPlayerCount([0, 2], 3)).toEqual([0, 2]);
  });
});
