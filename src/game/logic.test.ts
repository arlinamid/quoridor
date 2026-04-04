import { describe, expect, it } from 'vitest';
import { hasWon, initState, v2w, isBlocked, type GameState } from './logic';

describe('hasWon', () => {
  it('detects goal row', () => {
    expect(hasWon({ r: 8, c: 4, walls: 0, goalRow: 8 })).toBe(true);
    expect(hasWon({ r: 7, c: 4, walls: 0, goalRow: 8 })).toBe(false);
  });

  it('detects goal col for P2/P3 style goals', () => {
    expect(hasWon({ r: 4, c: 8, walls: 0, goalCol: 8 })).toBe(true);
    expect(hasWon({ r: 4, c: 7, walls: 0, goalCol: 8 })).toBe(false);
  });
});

describe('initState', () => {
  it('creates 2 players by default', () => {
    const s = initState(false, 2);
    expect(s.players).toHaveLength(2);
    expect(s.playerCount).toBe(2);
  });

  it('creates 4 players and wall budget 5', () => {
    const s = initState(false, 4);
    expect(s.players).toHaveLength(4);
    expect(s.players[0].walls).toBe(5);
  });

  it('P2 and P3 start on correct treasure axes', () => {
    const s = initState(true, 4);
    expect(s.players[2]).toMatchObject({ r: 4, c: 0, goalCol: 8 });
    expect(s.players[3]).toMatchObject({ r: 4, c: 8, goalCol: 0 });
  });
});

describe('v2w', () => {
  it('maps horizontal gap coords within the 8×8 wall grid', () => {
    expect(v2w(1, 0, 'h')).toEqual({ r: 0, c: 0, orient: 'h' });
    expect(v2w(1, 14, 'h')).toEqual({ r: 0, c: 7, orient: 'h' });
  });

  it('returns null when wall indices leave the board', () => {
    expect(v2w(1, 16, 'h')).toBeNull();
    expect(v2w(1, 18, 'h')).toBeNull();
  });
});

describe('isBlocked', () => {
  it('detects horizontal wall between stacked cells', () => {
    const s: GameState = {
      players: [],
      walls: [{ r: 3, c: 4, orient: 'h' }],
      turn: 0,
      gameOver: false,
    };
    expect(isBlocked(s, 3, 4, 4, 4)).toBe(true);
    expect(isBlocked(s, 3, 4, 3, 5)).toBe(false);
  });
});
