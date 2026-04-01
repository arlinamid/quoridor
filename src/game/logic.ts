export type Player = { r: number; c: number; walls: number; goalRow: number };
export type Wall = { r: number; c: number; orient: 'h' | 'v' };
export type GameState = { players: Player[]; walls: Wall[]; turn: number; gameOver: boolean; lastMoveTime?: number };

export function initState(): GameState {
  return {
    players: [
      { r: 0, c: 4, walls: 10, goalRow: 8 },
      { r: 8, c: 4, walls: 10, goalRow: 0 }
    ],
    walls: [],
    turn: 0,
    gameOver: false,
    lastMoveTime: Date.now()
  };
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

export function isBlocked(s: GameState, r1: number, c1: number, r2: number, c2: number) {
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
  const o = s.players[1 - pi];
  const mv: { r: number; c: number }[] = [];
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (const [dr, dc] of ds) {
    const nr = p.r + dr, nc = p.c + dc;
    if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) continue;
    if (isBlocked(s, p.r, p.c, nr, nc)) continue;

    if (nr === o.r && nc === o.c) {
      const jr = nr + dr, jc = nc + dc;
      if (jr >= 0 && jr < 9 && jc >= 0 && jc < 9 && !isBlocked(s, nr, nc, jr, jc)) {
        mv.push({ r: jr, c: jc });
      } else {
        const sd = dr === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [sdr, sdc] of sd) {
          const sr = nr + sdr, sc = nc + sdc;
          if (sr >= 0 && sr < 9 && sc >= 0 && sc < 9 && !isBlocked(s, nr, nc, sr, sc) && !(sr === p.r && sc === p.c)) {
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
    players: s.players.map(p => ({ ...p })),
    walls: s.walls.map(w => ({ ...w })),
    turn: s.turn,
    gameOver: s.gameOver,
    lastMoveTime: s.lastMoveTime
  };
}

export function bfsDist(s: GameState, pi: number) {
  const p = s.players[pi];
  const gr = p.goalRow;
  const vis = new Set<number>();
  const q = [{ r: p.r, c: p.c, d: 0 }];
  vis.add(p.r * 9 + p.c);
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (q.length) {
    const { r, c, d } = q.shift()!;
    if (r === gr) return d;
    for (const [dr, dc] of ds) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || vis.has(nr * 9 + nc) || isBlocked(s, r, c, nr, nc)) continue;
      vis.add(nr * 9 + nc);
      q.push({ r: nr, c: nc, d: d + 1 });
    }
  }
  return Infinity;
}

export function isValidWall(s: GameState, wr: number, wc: number, o: 'h' | 'v') {
  if (wr < 0 || wr >= 8 || wc < 0 || wc >= 8) return false;
  if (s.players[s.turn].walls <= 0) return false;
  const nw: Wall = { r: wr, c: wc, orient: o };
  for (const w of s.walls) if (wallsOverlap(w, nw)) return false;

  const ts = cloneS(s);
  ts.walls.push(nw);
  for (let i = 0; i < 2; i++) {
    if (bfsDist(ts, i) === Infinity) return false;
  }
  return true;
}

// AI Logic
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
  const gr = p.goalRow;
  const vis = new Map<number, { r: number, c: number } | null>();
  const q = [{ r: p.r, c: p.c }];
  vis.set(p.r * 9 + p.c, null);
  const ds = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (q.length) {
    const { r, c } = q.shift()!;
    if (r === gr) {
      const path = [];
      let cur: { r: number, c: number } | null | undefined = { r, c };
      while (cur) {
        path.unshift(cur);
        cur = vis.get(cur.r * 9 + cur.c);
      }
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
  if (s.players[1].r === s.players[1].goalRow) return 1000;
  if (s.players[0].r === s.players[0].goalRow) return -1000;
  if (d === 0) return ev(s);

  const pi = isMax ? 1 : 0;
  const mv = getValidMoves(s, pi);

  if (isMax) {
    let best = -Infinity;
    for (const m of mv) {
      const ns = cloneS(s);
      ns.players[pi].r = m.r; ns.players[pi].c = m.c; ns.turn = 1 - pi;
      best = Math.max(best, mm(ns, d - 1, false, a, b));
      a = Math.max(a, best);
      if (b <= a) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of mv) {
      const ns = cloneS(s);
      ns.players[pi].r = m.r; ns.players[pi].c = m.c; ns.turn = 1 - pi;
      best = Math.min(best, mm(ns, d - 1, true, a, b));
      b = Math.min(b, best);
      if (b <= a) break;
    }
    return best;
  }
}

export type AIMove = { type: 'move', r: number, c: number } | { type: 'wall', r: number, c: number, orient: 'h' | 'v' };

export function mmRoot(s: GameState, d: number): AIMove {
  let bs = -Infinity;
  let ba: AIMove | null = null;
  const mv = getValidMoves(s, 1);

  for (const m of mv) {
    const ns = cloneS(s);
    ns.players[1].r = m.r; ns.players[1].c = m.c;
    if (m.r === ns.players[1].goalRow) return { type: 'move', r: m.r, c: m.c };
    ns.turn = 0;
    const sc = mm(ns, d - 1, false, -Infinity, Infinity);
    if (sc > bs) { bs = sc; ba = { type: 'move', r: m.r, c: m.c }; }
  }

  if (s.players[1].walls > 0) {
    for (const w of getWC(s, 1)) {
      if (!isValidWall(s, w.r, w.c, w.orient)) continue;
      const ns = cloneS(s);
      ns.walls.push(w); ns.players[1].walls--; ns.turn = 0;
      const sc = mm(ns, d - 1, false, -Infinity, Infinity);
      if (sc > bs) { bs = sc; ba = { type: 'wall', r: w.r, c: w.c, orient: w.orient }; }
    }
  }

  return ba || { type: 'move', r: mv[0]?.r ?? s.players[1].r, c: mv[0]?.c ?? s.players[1].c };
}
