import { describe, expect, it } from 'vitest';
import {
  hasWon, initState, v2w, isBlocked, applySkill, getValidMoves, advanceTurn, consumeActiveMole,
  teamsForOnlineLayout, viewerSharesWin, cloneS, isValidTrapPlacement, trapAffectsVictim, viewerSeesTrapMarker,
  evHard, mmRoot, opponentIndices, getWallCandidatesNearPath, greedyBotMove,
  gapAdjacentCells, wallFromGapVisual, isGapBetweenPlayerAndValidMove, orthoTrenchNeighborCount,
  stripSkillFxBroadcast,
  type GameState,
} from './logic';

describe('opponentIndices', () => {
  it('3p FFA: both other slots are opponents', () => {
    const s = initState(false, 3);
    expect(opponentIndices(s, 0).sort()).toEqual([1, 2]);
  });
  it('3p 1v2: solo sees both duo players as opponents', () => {
    const teams = teamsForOnlineLayout('3_1v2', 3)!;
    const s = initState(false, 3, undefined, teams);
    expect(opponentIndices(s, 0).sort()).toEqual([1, 2]);
  });
  it('3p 1v2: duo member only opposes the solo player', () => {
    const teams = teamsForOnlineLayout('3_1v2', 3)!;
    const s = initState(false, 3, undefined, teams);
    expect(opponentIndices(s, 1)).toEqual([0]);
    expect(opponentIndices(s, 2)).toEqual([0]);
  });
  it('3p 2v1: duo sees only the solo opponent', () => {
    const teams = teamsForOnlineLayout('3_2v1', 3)!;
    const s = initState(false, 3, undefined, teams);
    expect(opponentIndices(s, 0)).toEqual([2]);
    expect(opponentIndices(s, 1)).toEqual([2]);
    expect(opponentIndices(s, 2).sort()).toEqual([0, 1]);
  });
  it('4p 2v2: each side only sees the other pair as opponents', () => {
    const teams = teamsForOnlineLayout('4_2v2', 4)!;
    const s = initState(false, 4, undefined, teams);
    expect(opponentIndices(s, 0).sort()).toEqual([2, 3]);
    expect(opponentIndices(s, 1).sort()).toEqual([2, 3]);
    expect(opponentIndices(s, 2).sort()).toEqual([0, 1]);
    expect(opponentIndices(s, 3).sort()).toEqual([0, 1]);
  });
  it('4p FFA: everyone else is an opponent', () => {
    const s = initState(false, 4);
    expect(opponentIndices(s, 0).sort()).toEqual([1, 2, 3]);
  });
});

describe('getWallCandidatesNearPath', () => {
  it('returns many candidates for P3 bot (not broken 1 - pi index)', () => {
    const s = initState(false, 3);
    expect(getWallCandidatesNearPath(s, 2).length).toBeGreaterThan(20);
  });
});

describe('greedyBotMove', () => {
  it('returns a legal move for bot at index 2 in 3p', () => {
    const s = initState(false, 3);
    s.turn = 2;
    const m = greedyBotMove(s, 2);
    expect(m.type).toBe('move');
  });
});

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

  it('battlefield: treasure rules, trenches, 2p walls 5, 4p walls 3', () => {
    const s2 = initState(false, 2, undefined, undefined, { battlefield: true });
    expect(s2.treasureMode).toBe(true);
    expect(s2.battlefieldMode).toBe(true);
    expect(s2.players[0].walls).toBe(5);
    expect((s2.trenches?.length ?? 0)).toBeGreaterThan(0);

    const s4 = initState(false, 4, undefined, undefined, { battlefield: true });
    expect(s4.players[0].walls).toBe(3);
  });

  it('battlefield: treasures never on trench cells', () => {
    for (let i = 0; i < 15; i++) {
      const s = initState(false, 2, undefined, undefined, { battlefield: true });
      const keys = new Set((s.trenches ?? []).map(t => `${t.r},${t.c}`));
      for (const tr of s.treasures ?? []) {
        expect(keys.has(`${tr.r},${tr.c}`)).toBe(false);
      }
    }
  });

  it('battlefield: P0 loadout has no TRAP', () => {
    const s = initState(false, 2, ['TRAP', 'TELEPORT', 'HAMMER'], undefined, { battlefield: true });
    expect(s.players[0].inventory).not.toContain('TRAP');
    expect(s.players[0].inventory).toContain('TELEPORT');
  });
});

describe('stripSkillFxBroadcast', () => {
  it('removes skillFxBroadcast without cloning whole state', () => {
    const s = initState(false, 2);
    s.skillFxBroadcast = {
      actorIdx: 0,
      actorPos: { r: 1, c: 1 },
      preMs: 100,
      postMs: 200,
      seq: 42,
    };
    const t = stripSkillFxBroadcast(s);
    expect(t.skillFxBroadcast).toBeUndefined();
    expect(s.skillFxBroadcast).toBeDefined();
  });
});

describe('orthoTrenchNeighborCount', () => {
  it('counts only in-bounds orthogonal trench cells', () => {
    const s = initState(false, 2);
    s.trenches = [{ r: 4, c: 4 }, { r: 4, c: 5 }];
    expect(orthoTrenchNeighborCount(s, 4, 3)).toBe(1);
    expect(orthoTrenchNeighborCount(s, 3, 4)).toBe(1);
    expect(orthoTrenchNeighborCount(s, 5, 4)).toBe(1);
    expect(orthoTrenchNeighborCount(s, 4, 6)).toBe(1);
    expect(orthoTrenchNeighborCount(s, 0, 0)).toBe(0);
  });
});

describe('battlefield trenches & skills', () => {
  it('cannot move onto a trench', () => {
    const s = initState(false, 2);
    s.trenches = [{ r: 5, c: 5 }];
    s.players[0] = { ...s.players[0], r: 4, c: 5 };
    s.turn = 0;
    const moves = getValidMoves(s, 0);
    expect(moves.some(m => m.r === 5 && m.c === 5)).toBe(false);
  });

  it('TELEPORT cannot target trench', () => {
    const s = initState(false, 2);
    s.trenches = [{ r: 5, c: 5 }];
    s.players[0] = { ...s.players[0], r: 5, c: 4, inventory: ['TELEPORT'] };
    s.turn = 0;
    const res = applySkill(s, 'TELEPORT', { r: 5, c: 5 });
    expect(res.applied).toBe(false);
  });

  it('battlefield: trap marker visible only to owner', () => {
    const s0 = initState(true, 2);
    s0.battlefieldMode = true;
    s0.players[0].inventory = ['TRAP'];
    s0.turn = 0;
    const placed = applySkill(s0, 'TRAP', { r: 3, c: 3 });
    expect(placed.applied !== false && (placed.state.traps?.length ?? 0) > 0).toBe(true);
    expect(viewerSeesTrapMarker(placed.state, 0, 0)).toBe(true);
    expect(viewerSeesTrapMarker(placed.state, 1, 0)).toBe(false);
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

describe('gapAdjacentCells', () => {
  it('maps horizontal strip between stacked cells', () => {
    expect(gapAdjacentCells(1, 2)).toEqual({ a: { r: 0, c: 1 }, b: { r: 1, c: 1 } });
  });
  it('maps vertical strip between adjacent columns', () => {
    expect(gapAdjacentCells(2, 7)).toEqual({ a: { r: 1, c: 3 }, b: { r: 1, c: 4 } });
  });
  it('returns null on corner cells', () => {
    expect(gapAdjacentCells(1, 1)).toBeNull();
  });
});

describe('wallFromGapVisual', () => {
  it('H strip ignores cornerOrient', () => {
    expect(wallFromGapVisual(1, 8, 'v')).toEqual(v2w(1, 8, 'h'));
  });
  it('V strip ignores cornerOrient', () => {
    expect(wallFromGapVisual(4, 5, 'h')).toEqual(v2w(4, 5, 'v'));
  });
});

describe('isGapBetweenPlayerAndValidMove', () => {
  it('is true for the gap between player and a direct valid step', () => {
    const s = initState(false, 2);
    s.players[0].r = 0;
    s.players[0].c = 4;
    s.players[1].r = 8;
    s.players[1].c = 4;
    s.turn = 0;
    expect(getValidMoves(s, 0).some(m => m.r === 1 && m.c === 4)).toBe(true);
    expect(isGapBetweenPlayerAndValidMove(s, 1, 8)).toBe(true);
  });
  it('is false when the gap is not between player and any valid move', () => {
    const s = initState(false, 2);
    s.players[0].r = 0;
    s.players[0].c = 4;
    s.players[1].r = 8;
    s.players[1].c = 4;
    s.turn = 0;
    expect(isGapBetweenPlayerAndValidMove(s, 1, 0)).toBe(false);
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

describe('AI (minimax hardening)', () => {
  it('evHard is always finite (clamps Infinity BFS)', () => {
    const s = initState(false, 2);
    expect(Number.isFinite(evHard(s))).toBe(true);
  });

  it('mmRoot with evHard and maxWallCandidates returns a move or wall', () => {
    const s = initState(false, 2);
    s.turn = 1;
    const m = mmRoot(s, 2, { evalFn: evHard, maxWallCandidates: 16 });
    expect(['move', 'wall']).toContain(m.type);
    if (m.type === 'move') {
      expect(m.r).toBeGreaterThanOrEqual(0);
      expect(m.c).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('TRAP', () => {
  it('isValidTrapPlacement rejects occupied and duplicate trap cells', () => {
    const s = initState(true, 2);
    expect(isValidTrapPlacement(s, 0, 4)).toBe(false);
    expect(isValidTrapPlacement(s, 5, 5)).toBe(true);
    s.traps = [{ r: 5, c: 5, owner: 1 }];
    expect(isValidTrapPlacement(s, 5, 5)).toBe(false);
  });

  it('places trap on chosen empty cell and consumes inventory', () => {
    const s = initState(true, 2);
    s.players[0].inventory = ['TRAP'];
    const { state, applied } = applySkill(s, 'TRAP', { r: 5, c: 5 });
    expect(applied).not.toBe(false);
    expect(state.traps?.some(t => t.r === 5 && t.c === 5 && t.owner === 0)).toBe(true);
    expect(state.players[0].inventory?.includes('TRAP')).toBe(false);
  });

  it('fails without target or on invalid cell without consuming inventory', () => {
    const s = initState(true, 2);
    s.players[0].inventory = ['TRAP'];
    const noTarget = applySkill(s, 'TRAP');
    expect(noTarget.applied).toBe(false);
    expect(noTarget.state).toBe(s);
    expect(s.players[0].inventory).toContain('TRAP');

    const occupied = applySkill(s, 'TRAP', { r: 8, c: 4 });
    expect(occupied.applied).toBe(false);
    expect(s.players[0].inventory).toContain('TRAP');
  });

  it('trapAffectsVictim skips same team in team mode', () => {
    const s = initState(false, 4, undefined, [0, 0, 1, 1]);
    expect(trapAffectsVictim(s, 0, 1)).toBe(false);
    expect(trapAffectsVictim(s, 0, 2)).toBe(true);
  });

  it('viewerSeesTrapMarker: teammates see each other traps on board', () => {
    const s = initState(false, 4, undefined, [0, 0, 1, 1]);
    expect(viewerSeesTrapMarker(s, 0, 1)).toBe(true);
    expect(viewerSeesTrapMarker(s, 2, 1)).toBe(false);
  });
});

describe('online team layout', () => {
  it('teamsForOnlineLayout maps 3p and 4p presets', () => {
    expect(teamsForOnlineLayout('ffa', 3)).toBeUndefined();
    expect(teamsForOnlineLayout('3_1v2', 3)).toEqual([0, 1, 1]);
    expect(teamsForOnlineLayout('3_2v1', 3)).toEqual([0, 0, 1]);
    expect(teamsForOnlineLayout('4_2v2', 4)).toEqual([0, 0, 1, 1]);
  });

  it('initState attaches teams when provided', () => {
    const t = [0, 1, 1] as const;
    const s = initState(false, 3, undefined, [...t]);
    expect(s.teams).toEqual([0, 1, 1]);
  });

  it('cloneS copies teams', () => {
    const s = initState(false, 3, undefined, [0, 0, 1]);
    const c = cloneS(s);
    expect(c.teams).toEqual([0, 0, 1]);
    c.teams![0] = 9;
    expect(s.teams![0]).toBe(0);
  });

  it('viewerSharesWin: FFA is exact index; team mode shares team id', () => {
    expect(viewerSharesWin(undefined, 2, 1, 3)).toBe(false);
    expect(viewerSharesWin([0, 1, 1], 2, 1, 3)).toBe(true);
    expect(viewerSharesWin([0, 1, 1], 0, 1, 3)).toBe(false);
  });
});
