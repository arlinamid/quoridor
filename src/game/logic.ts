export type SkillType = 'TELEPORT' | 'HAMMER' | 'SKIP' | 'MOLE' | 'DYNAMITE' | 'SHIELD' | 'WALLS' | 'MAGNET' | 'TRAP' | 'SWAP';

export type PlayerEffect = {
  type: 'MOLE' | 'SHIELD' | 'SKIP';
  duration: number;
};

export type Player = {
  r: number;
  c: number;
  walls: number;
  goalRow?: number;   // P0 (row 0→8) and P1 (row 8→0)
  goalCol?: number;   // P2 (col 0→8) and P3 (col 8→0)
  inventory?: SkillType[];
  effects?: PlayerEffect[];
};

export type Wall = { r: number; c: number; orient: 'h' | 'v' };

export type GameState = {
  players: Player[];
  walls: Wall[];
  turn: number;
  gameOver: boolean;
  lastMoveTime?: number;
  treasureMode?: boolean;
  playerCount?: number;
  botPlayers?: number[];   // indices of bot-controlled players
  treasures?: { r: number; c: number }[];
  traps?: { r: number; c: number; owner: number }[];
};

export function hasWon(p: Player): boolean {
  return (p.goalRow !== undefined && p.r === p.goalRow) ||
         (p.goalCol !== undefined && p.c === p.goalCol);
}

export function initState(treasureMode = false, playerCount = 2): GameState {
  const wallCount = playerCount === 4 ? 5 : playerCount === 3 ? 7 : 10;

  const players: Player[] = [
    { r: 0, c: 4, walls: wallCount, goalRow: 8, inventory: [], effects: [] },
    { r: 8, c: 4, walls: wallCount, goalRow: 0, inventory: [], effects: [] },
  ];
  if (playerCount >= 3) players.push({ r: 4, c: 0, walls: wallCount, goalCol: 8, inventory: [], effects: [] });
  if (playerCount >= 4) players.push({ r: 4, c: 8, walls: wallCount, goalCol: 0, inventory: [], effects: [] });

  const state: GameState = {
    players,
    walls: [],
    turn: 0,
    gameOver: false,
    lastMoveTime: undefined,
    treasureMode,
    playerCount,
  };

  if (treasureMode) {
    const treasureCount = playerCount * 2; // 4 / 6 / 8 for 2/3/4 players
    state.treasures = [];
    while (state.treasures.length < treasureCount) {
      const r = Math.floor(Math.random() * 7) + 1;
      const c = Math.floor(Math.random() * 9);
      if (!state.treasures.some(t => t.r === r && t.c === c)) {
        state.treasures.push({ r, c });
      }
    }
    state.traps = [];
  }

  return state;
}

export function v2w(vr: number, vc: number, o: 'h' | 'v'): Wall | null {
  if (o === 'h') {
    const ir = Math.round((vr - 1) / 2);
    const ic = Math.floor(vc / 2);
    if (ir < 0 || ir >= 8 || ic < 0 || ic >= 8) return null;
    return { r: ir, c: ic, orient: 'h' };
  }
  const ic = Math.round((vc - 1) / 2);
  const ir = Math.floor(vr / 2);
  if (ir < 0 || ir >= 8 || ic < 0 || ic >= 8) return null;
  return { r: ir, c: ic, orient: 'v' };
}

export function isBlocked(s: GameState, r1: number, c1: number, r2: number, c2: number, ignoreWalls = false) {
  if (ignoreWalls) return false;
  for (const w of s.walls) {
    if (w.orient === 'h') {
      if ((r1 === w.r && r2 === w.r + 1) || (r1 === w.r + 1 && r2 === w.r)) {
        if (c1 >= w.c && c1 <= w.c + 1 && c1 === c2) return true;
      }
    } else {
      if ((c1 === w.c && c2 === w.c + 1) || (c1 === w.c + 1 && c2 === w.c)) {
        if (r1 >= w.r && r1 <= w.r + 1 && r1 === r2) return true;
      }
    }
  }
  return false;
}

export function getValidMoves(s: GameState, pi: number) {
  const p = s.players[pi];
  const others = s.players.filter((_, i) => i !== pi);
  const mv: { r: number; c: number }[] = [];
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const hasMole = p.effects?.some(e => e.type === 'MOLE' && e.duration > 0) || false;

  for (const [dr, dc] of ds) {
    const nr = p.r + dr, nc = p.c + dc;
    if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue;
    if (isBlocked(s, p.r, p.c, nr, nc, hasMole)) continue;

    const occupied = others.some(o => o.r === nr && o.c === nc);
    if (occupied) {
      // Try straight jump
      const jr = nr + dr, jc = nc + dc;
      if (jr >= 0 && jr < 9 && jc >= 0 && jc < 9
          && !isBlocked(s, nr, nc, jr, jc, hasMole)
          && !others.some(o => o.r === jr && o.c === jc)) {
        mv.push({ r: jr, c: jc });
      } else {
        // Sidestep
        const sd = dr === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [sdr, sdc] of sd) {
          const sr = nr + sdr, sc = nc + sdc;
          if (sr >= 0 && sr < 9 && sc >= 0 && sc < 9
              && !isBlocked(s, nr, nc, sr, sc, hasMole)
              && !others.some(o => o.r === sr && o.c === sc)
              && !(sr === p.r && sc === p.c)) {
            mv.push({ r: sr, c: sc });
          }
        }
      }
    } else {
      mv.push({ r: nr, c: nc });
    }
  }
  return mv;
}

export function wallsOverlap(a: Wall, b: Wall) {
  if (a.orient === b.orient) {
    return a.orient === 'h' ? (a.r === b.r && Math.abs(a.c - b.c) <= 1) : (a.c === b.c && Math.abs(a.r - b.r) <= 1);
  }
  return a.r === b.r && a.c === b.c;
}

export function cloneS(s: GameState): GameState {
  return {
    players: s.players.map(p => ({
      ...p,
      inventory: p.inventory ? [...p.inventory] : [],
      effects: p.effects ? p.effects.map(e => ({ ...e })) : []
    })),
    walls: s.walls.map(w => ({ ...w })),
    turn: s.turn,
    gameOver: s.gameOver,
    lastMoveTime: s.lastMoveTime,
    treasureMode: s.treasureMode,
    playerCount: s.playerCount,
    botPlayers: s.botPlayers ? [...s.botPlayers] : undefined,
    treasures: s.treasures ? s.treasures.map(t => ({ ...t })) : undefined,
    traps: s.traps ? s.traps.map(t => ({ ...t })) : undefined
  };
}

export function bfsDist(s: GameState, pi: number) {
  const p = s.players[pi];
  const vis = new Set<number>();
  const q = [{ r: p.r, c: p.c, d: 0 }];
  vis.add(p.r * 9 + p.c);
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (q.length) {
    const { r, c, d } = q.shift()!;
    if ((p.goalRow !== undefined && r === p.goalRow) ||
        (p.goalCol !== undefined && c === p.goalCol)) return d;
    for (const [dr, dc] of ds) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || vis.has(nr * 9 + nc) || isBlocked(s, r, c, nr, nc)) continue;
      vis.add(nr * 9 + nc);
      q.push({ r: nr, c: nc, d: d + 1 });
    }
  }
  return Infinity;
}

export function applySkill(s: GameState, skill: SkillType, target?: { r: number, c: number }): GameState {
  const ns = cloneS(s);
  const p = ns.players[ns.turn];
  const o = ns.players[1 - Math.min(ns.turn, 1)]; // opponent = player 1 in 2-player, player 1 otherwise

  if (p.inventory) {
    const idx = p.inventory.indexOf(skill);
    if (idx !== -1) p.inventory.splice(idx, 1);
  }
  if (!p.effects) p.effects = [];
  if (!o.effects) o.effects = [];

  switch (skill) {
    case 'TELEPORT':
      if (target) { p.r = target.r; p.c = target.c; }
      break;
    case 'HAMMER':
      if (target) {
        const widx = ns.walls.findIndex(w => w.r === target.r && w.c === target.c);
        if (widx !== -1) ns.walls.splice(widx, 1);
      }
      break;
    case 'SKIP':
      o.effects.push({ type: 'SKIP', duration: 1 });
      break;
    case 'MOLE':
      p.effects.push({ type: 'MOLE', duration: 1 });
      break;
    case 'DYNAMITE':
      if (target) {
        ns.walls = ns.walls.filter(w => {
          if (w.orient === 'h') return !(w.r === target.r && (w.c === target.c || w.c === target.c - 1));
          else return !(w.c === target.c && (w.r === target.r || w.r === target.r - 1));
        });
      }
      break;
    case 'SHIELD':
      p.effects.push({ type: 'SHIELD', duration: 2 });
      break;
    case 'WALLS':
      p.walls += 2;
      break;
    case 'MAGNET': {
      const dr = p.r - o.r, dc = p.c - o.c;
      if (Math.abs(dr) > Math.abs(dc)) o.r += Math.sign(dr) * Math.min(2, Math.abs(dr) - 1);
      else o.c += Math.sign(dc) * Math.min(2, Math.abs(dc) - 1);
      break;
    }
    case 'TRAP':
      if (!ns.traps) ns.traps = [];
      ns.traps.push({ r: p.r, c: p.c, owner: ns.turn });
      break;
    case 'SWAP': {
      const tempR = p.r, tempC = p.c;
      p.r = o.r; p.c = o.c;
      o.r = tempR; o.c = tempC;
      break;
    }
  }
  return ns;
}

export function advanceTurn(state: GameState) {
  const n = state.players.length;
  state.turn = (state.turn + 1) % n;

  const p = state.players[state.turn];

  // Check SKIP *before* decrementing so duration-1 effects are still visible
  if (p.effects?.some(e => e.type === 'SKIP')) {
    // Remove the SKIP effect, then decay remaining effects for this player
    p.effects = p.effects.filter(e => e.type !== 'SKIP');
    p.effects.forEach(e => { if (e.duration > 0) e.duration--; });
    p.effects = p.effects.filter(e => e.duration > 0);
    // Advance again to the next player
    state.turn = (state.turn + 1) % n;
    const p2 = state.players[state.turn];
    if (p2.effects) {
      p2.effects.forEach(e => { if (e.duration > 0) e.duration--; });
      p2.effects = p2.effects.filter(e => e.duration > 0);
    }
    return;
  }

  // Normal duration decay for the upcoming player
  if (p.effects) {
    p.effects.forEach(e => { if (e.duration > 0) e.duration--; });
    p.effects = p.effects.filter(e => e.duration > 0);
  }
}

export function isValidWall(s: GameState, wr: number, wc: number, o: 'h' | 'v') {
  if (wr < 0 || wr >= 8 || wc < 0 || wc >= 8) return false;
  if (s.players[s.turn].walls <= 0) return false;
  const nw: Wall = { r: wr, c: wc, orient: o };
  for (const w of s.walls) if (wallsOverlap(w, nw)) return false;

  // Shield check (2-player only)
  if (s.players.length === 2) {
    const opp = s.players[1 - s.turn];
    const hasShield = opp.effects?.some(e => e.type === 'SHIELD' && e.duration > 0) || false;
    if (hasShield && o === 'h') {
      if (1 - s.turn === 0) {
        if (wr === opp.r && (wc === opp.c || wc === opp.c - 1)) return false;
      } else {
        if (wr === opp.r - 1 && (wc === opp.c || wc === opp.c - 1)) return false;
      }
    }
  }

  const ts = cloneS(s);
  ts.walls.push(nw);
  for (let i = 0; i < s.players.length; i++) {
    if (bfsDist(ts, i) === Infinity) return false;
  }
  return true;
}

// AI Logic (2-player only)
export function getWC(s: GameState, ai: number) {
  const opp = s.players[1 - ai];
  const cd: Wall[] = [];
  const tr = new Set<string>();
  const path = bfsPath(s, 1 - ai);

  for (const n of path.slice(0, 5)) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const wr = n.r + dr, wc = n.c + dc;
        if (wr < 0 || wr >= 8 || wc < 0 || wc >= 8) continue;
        if (!tr.has(`${wr},${wc},h`)) { tr.add(`${wr},${wc},h`); cd.push({ r: wr, c: wc, orient: 'h' }); }
        if (!tr.has(`${wr},${wc},v`)) { tr.add(`${wr},${wc},v`); cd.push({ r: wr, c: wc, orient: 'v' }); }
      }
    }
  }
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const wr = opp.r + dr, wc = opp.c + dc;
      if (wr < 0 || wr >= 8 || wc < 0 || wc >= 8) continue;
      if (!tr.has(`${wr},${wc},h`)) { tr.add(`${wr},${wc},h`); cd.push({ r: wr, c: wc, orient: 'h' }); }
      if (!tr.has(`${wr},${wc},v`)) { tr.add(`${wr},${wc},v`); cd.push({ r: wr, c: wc, orient: 'v' }); }
    }
  }
  return cd;
}

export function bfsPath(s: GameState, pi: number) {
  const p = s.players[pi];
  const vis = new Map<number, { r: number, c: number } | null>();
  const q = [{ r: p.r, c: p.c }];
  vis.set(p.r * 9 + p.c, null);
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (q.length) {
    const { r, c } = q.shift()!;
    if ((p.goalRow !== undefined && r === p.goalRow) ||
        (p.goalCol !== undefined && c === p.goalCol)) {
      const path = [];
      let cur: { r: number, c: number } | null | undefined = { r, c };
      while (cur) { path.unshift(cur); cur = vis.get(cur.r * 9 + cur.c); }
      return path;
    }
    for (const [dr, dc] of ds) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || vis.has(nr * 9 + nc) || isBlocked(s, r, c, nr, nc)) continue;
      vis.set(nr * 9 + nc, { r, c });
      q.push({ r: nr, c: nc });
    }
  }
  return [{ r: p.r, c: p.c }];
}

export function ev(s: GameState) {
  return (bfsDist(s, 0) - bfsDist(s, 1)) * 10 + (s.players[1].walls - s.players[0].walls) * 2 + (4 - Math.abs(s.players[1].c - 4));
}

export function mm(s: GameState, d: number, isMax: boolean, a: number, b: number): number {
  if (hasWon(s.players[1])) return 1000;
  if (hasWon(s.players[0])) return -1000;
  if (d === 0) return ev(s);

  const pi = isMax ? 1 : 0;
  const mv = getValidMoves(s, pi);

  if (isMax) {
    let best = -Infinity;
    for (const m of mv) {
      const ns = cloneS(s); ns.players[pi].r = m.r; ns.players[pi].c = m.c; ns.turn = 1 - pi;
      best = Math.max(best, mm(ns, d - 1, false, a, b));
      a = Math.max(a, best); if (b <= a) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of mv) {
      const ns = cloneS(s); ns.players[pi].r = m.r; ns.players[pi].c = m.c; ns.turn = 1 - pi;
      best = Math.min(best, mm(ns, d - 1, true, a, b));
      b = Math.min(b, best); if (b <= a) break;
    }
    return best;
  }
}

export type AIMove = { type: 'move', r: number, c: number } | { type: 'wall', r: number, c: number, orient: 'h' | 'v' };

export function mmRoot(s: GameState, d: number): AIMove {
  let bs = -Infinity, ba: AIMove | null = null;
  const mv = getValidMoves(s, 1);

  for (const m of mv) {
    const ns = cloneS(s); ns.players[1].r = m.r; ns.players[1].c = m.c;
    if (hasWon(ns.players[1])) return { type: 'move', r: m.r, c: m.c };
    ns.turn = 0;
    const sc = mm(ns, d - 1, false, -Infinity, Infinity);
    if (sc > bs) { bs = sc; ba = { type: 'move', r: m.r, c: m.c }; }
  }

  if (s.players[1].walls > 0) {
    for (const w of getWC(s, 1)) {
      if (!isValidWall(s, w.r, w.c, w.orient)) continue;
      const ns = cloneS(s); ns.walls.push(w); ns.players[1].walls--; ns.turn = 0;
      const sc = mm(ns, d - 1, false, -Infinity, Infinity);
      if (sc > bs) { bs = sc; ba = { type: 'wall', r: w.r, c: w.c, orient: w.orient }; }
    }
  }

  return ba || { type: 'move', r: mv[0]?.r ?? s.players[1].r, c: mv[0]?.c ?? s.players[1].c };
}

// Greedy bot for any player index: picks the move that minimises BFS distance to goal.
// Falls back to placing a wall that best blocks the closest opponent if no progress is possible.
export function greedyBotMove(s: GameState, pi: number): AIMove {
  const moves = getValidMoves(s, pi);
  let bestMove: AIMove | null = null;
  let bestDist = bfsDist(s, pi);

  for (const m of moves) {
    const ns = cloneS(s);
    ns.players[pi].r = m.r;
    ns.players[pi].c = m.c;
    const d = bfsDist(ns, pi);
    if (d < bestDist) { bestDist = d; bestMove = { type: 'move', r: m.r, c: m.c }; }
  }

  // If a step forward was found, take it
  if (bestMove) return bestMove;

  // Try a wall that delays the leading opponent most
  if (s.players[pi].walls > 0) {
    const opponents = s.players
      .map((_, i) => i)
      .filter(i => i !== pi)
      .sort((a, b) => bfsDist(s, a) - bfsDist(s, b));
    const opp = opponents[0];
    const baseDist = bfsDist(s, opp);
    let bestWall: AIMove | null = null;
    let bestGain = 0;
    for (const w of getWC(s, pi)) {
      if (!isValidWall(s, w.r, w.c, w.orient)) continue;
      const ns = cloneS(s);
      ns.walls.push(w);
      const gain = bfsDist(ns, opp) - baseDist;
      if (gain > bestGain) { bestGain = gain; bestWall = { type: 'wall', r: w.r, c: w.c, orient: w.orient }; }
    }
    if (bestWall && bestGain >= 2) return bestWall;
  }

  // Fallback: any available move
  if (moves.length > 0) return { type: 'move', r: moves[0].r, c: moves[0].c };
  return { type: 'move', r: s.players[pi].r, c: s.players[pi].c };
}
