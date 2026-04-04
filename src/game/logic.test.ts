import { describe, expect, it } from 'vitest';
import { hasWon, initState, v2w, isBlocked, applySkill, getValidMoves, advanceTurn, consumeActiveMole, type GameState } from './logic';

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

describe('applySkill — multi-player targeting', () => {
  it('SKIP applies to next player in turn order (4 players)', () => {
    const s = initState(false, 4);
    s.turn = 2;
    s.players[2].inventory = ['SKIP'];
    const { state } = applySkill(s, 'SKIP');
    expect(state.players[3].effects?.some(e => e.type === 'SKIP')).toBe(true);
    expect(state.players[0].effects?.some(e => e.type === 'SKIP')).toBe(false);
    expect(state.players[1].effects?.some(e => e.type === 'SKIP')).toBe(false);
  });

  it('SKIP applies to P1 when P0 uses it (2 players)', () => {
    const s = initState(false, 2);
    s.turn = 0;
    s.players[0].inventory = ['SKIP'];
    const { state } = applySkill(s, 'SKIP');
    expect(state.players[1].effects?.some(e => e.type === 'SKIP')).toBe(true);
  });

  it('SWAP exchanges with a randomly chosen other player (seeded rng)', () => {
    const s = initState(false, 3);
    s.turn = 0;
    s.players[0].inventory = ['SWAP'];
    s.players[0].r = 1;
    s.players[0].c = 4;
    s.players[1].r = 2;
    s.players[1].c = 4;
    s.players[2].r = 3;
    s.players[2].c = 4;
    const { state, swapPartner } = applySkill(s, 'SWAP', undefined, () => 0.1);
    expect(swapPartner).toBe(1);
    expect(state.players[0].r).toBe(2);
    expect(state.players[1].r).toBe(1);
  });

  it('MAGNET pulls every opponent toward the actor on dominant axis', () => {
    const s = initState(false, 3);
    s.turn = 0;
    s.players[0].inventory = ['MAGNET'];
    s.players[0].r = 0;
    s.players[0].c = 4;
    s.players[1].r = 8;
    s.players[1].c = 4;
    s.players[2].r = 4;
    s.players[2].c = 0;
    const { state } = applySkill(s, 'MAGNET');
    expect(state.players[1].r).toBe(6);
    expect(state.players[2].c).toBe(2);
  });

  it('MAGNET does not move onto an occupied cell', () => {
    const s = initState(false, 3);
    s.turn = 0;
    s.players[0].inventory = ['MAGNET'];
    s.players[0].r = 4;
    s.players[0].c = 4;
    s.players[1].r = 6;
    s.players[1].c = 4;
    s.players[2].r = 5;
    s.players[2].c = 4;
    const { state } = applySkill(s, 'MAGNET');
    expect(state.players[1].r).toBe(6);
    expect(state.players[2].r).toBe(5);
  });
});

describe('MOLE (Vakond)', () => {
  it('vertical wall blocks right step without MOLE', () => {
    const s = initState(false, 2);
    s.walls = [{ r: 0, c: 4, orient: 'v' }];
    const moves = getValidMoves(s, 0);
    expect(moves.some(m => m.r === 0 && m.c === 5)).toBe(false);
  });

  it('keeps MOLE through opponent turn; turn-start decay does not strip MOLE before moving', () => {
    const s = initState(false, 2);
    s.players[0].inventory = ['MOLE'];
    const { state } = applySkill(s, 'MOLE');
    expect(state.players[0].effects?.some(e => e.type === 'MOLE' && e.duration > 0)).toBe(true);
    advanceTurn(state);
    expect(state.turn).toBe(1);
    expect(state.players[0].effects?.some(e => e.type === 'MOLE')).toBe(true);
    advanceTurn(state);
    expect(state.turn).toBe(0);
    expect(state.players[0].effects?.some(e => e.type === 'MOLE')).toBe(true);
    const s2 = state;
    s2.walls = [{ r: 0, c: 4, orient: 'v' }];
    const moves = getValidMoves(s2, 0);
    expect(moves.some(m => m.r === 0 && m.c === 5)).toBe(true);
  });

  it('consumeActiveMole removes Vakond after a qualifying action', () => {
    const s = initState(false, 2);
    s.players[0].effects = [{ type: 'MOLE', duration: 1 }];
    consumeActiveMole(s.players[0]);
    expect(s.players[0].effects?.some(e => e.type === 'MOLE')).toBe(false);
  });
});
