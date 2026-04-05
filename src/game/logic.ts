import { generateBattlefieldTrenches } from './battlefield';

export type SkillType = 'TELEPORT' | 'HAMMER' | 'SKIP' | 'MOLE' | 'DYNAMITE' | 'SHIELD' | 'WALLS' | 'MAGNET' | 'TRAP' | 'SWAP';

/** Kincsmód: egyszerre max. ennyi skill fér a készleten (5. szinttől 3 = Gamepass, alatta 2). */
export function maxTreasureInventorySlots(level: number): number {
  return (level ?? 1) >= 5 ? 3 : 2;
}

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

/** Lobby / waiting row: FFA vagy fix csapatbeosztás 3–4 játékosnál. */
export type OnlineTeamLayoutId = 'ffa' | '3_1v2' | '3_2v1' | '4_2v2';

/** Online: skill/dig FX szinkron ellenfeleknek — nem tartalmazza a konkrét skill nevét (rejtett animáció). */
export type SkillFxBroadcast = {
  actorIdx: number;
  actorPos: { r: number; c: number };
  target?: { r: number; c: number };
  partnerPos?: { r: number; c: number };
  opponents?: Array<{ r: number; c: number }>;
  preMs: number;
  postMs: number;
  seq: number;
};

export type GameState = {
  players: Player[];
  walls: Wall[];
  turn: number;
  gameOver: boolean;
  lastMoveTime?: number;
  treasureMode?: boolean;
  /** Battlefield: rejtett csapdák csak tulajnak, max fal 5/4/3, árok, kincsben nincs TRAP. */
  battlefieldMode?: boolean;
  playerCount?: number;
  botPlayers?: number[];   // indices of bot-controlled players
  /** Online team mode: same length as players, 0 = team A, 1 = team B. Omitted = free-for-all. */
  teams?: number[];
  /** Waiting lobby only (DB): host team preset for joiners; not used on the board during play. */
  pendingTeamLayout?: OnlineTeamLayoutId;
  treasures?: { r: number; c: number }[];
  traps?: { r: number; c: number; owner: number }[];
  /** Nem léphető cellák (Tetris-I/L/T árkok). */
  trenches?: { r: number; c: number }[];
  /** Csak online skill/dig pillanatban; kliens nem tárolja hosszan, ellenfélnek rejtett FX-hez. */
  skillFxBroadcast?: SkillFxBroadcast;
};

/** UI / lokális állapot: ne tartalmazzon ideiglenes broadcast kulcsot. */
export function stripSkillFxBroadcast(s: GameState): GameState {
  if (s.skillFxBroadcast === undefined) return s;
  const o = { ...s };
  delete (o as { skillFxBroadcast?: SkillFxBroadcast }).skillFxBroadcast;
  return o;
}

export type InitStateOptions = { battlefield?: boolean };

export function isTrenchCell(s: GameState, r: number, c: number): boolean {
  return s.trenches?.some(t => t.r === r && t.c === c) ?? false;
}

/** Hány szomszédos (ortogonális) mező árok — az AI így „látja”, mennyire szűk a hely. */
export function orthoTrenchNeighborCount(s: GameState, r: number, c: number): number {
  if (!s.trenches?.length) return 0;
  let n = 0;
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9 && isTrenchCell(s, nr, nc)) n++;
  }
  return n;
}

function trenchAwareAi(s: GameState): boolean {
  return (s.trenches?.length ?? 0) > 0;
}

/** P1 egyedül vs P2+P3 | P1+P2 vs P3 egyedül | 4 fő: P1+P2 vs P3+P4 */
export function teamsForOnlineLayout(layout: OnlineTeamLayoutId, playerCount: number): number[] | undefined {
  if (layout === 'ffa' || playerCount < 3) return undefined;
  if (playerCount === 3) {
    if (layout === '3_1v2') return [0, 1, 1];
    if (layout === '3_2v1') return [0, 0, 1];
    return undefined;
  }
  if (playerCount === 4 && layout === '4_2v2') return [0, 0, 1, 1];
  return undefined;
}

export function isTeamGameState(s: GameState): boolean {
  return Array.isArray(s.teams) && s.teams.length === s.players.length && s.players.length >= 3;
}

/** Viewer `viewerIdx` wins if same team as `winnerIdx` (or solo FFA: only exact index). */
export function viewerSharesWin(teams: number[] | undefined, winnerIdx: number, viewerIdx: number, playerCount: number): boolean {
  if (!teams || teams.length !== playerCount) return winnerIdx === viewerIdx;
  return teams[winnerIdx] === teams[viewerIdx];
}

/** Üres mező, nincs bábu, nincs még csapda ezen a cellán. */
export function isValidTrapPlacement(s: GameState, r: number, c: number): boolean {
  if (r < 0 || r >= 9 || c < 0 || c >= 9) return false;
  if (isTrenchCell(s, r, c)) return false;
  if (s.players.some(pl => pl.r === r && pl.c === c)) return false;
  if (s.traps?.some(t => t.r === r && t.c === c)) return false;
  return true;
}

/** A csapda aktiválódik-e, ha `victimIdx` rálép (nem a tulaj, csapatjátékban nem saját csapat). */
export function trapAffectsVictim(s: GameState, trapOwner: number, victimIdx: number): boolean {
  if (trapOwner === victimIdx) return false;
  if (isTeamGameState(s) && s.teams && s.teams.length === s.players.length) {
    return s.teams[trapOwner] !== s.teams[victimIdx];
  }
  return true;
}

/** Kinek látszik a csapda a táblán a lehelyezés után (ellenfélnek nem, csak „belépésre” derül ki). */
export function viewerSeesTrapMarker(s: GameState, viewerIdx: number, trapOwner: number): boolean {
  if (s.battlefieldMode) return viewerIdx === trapOwner;
  if (isTeamGameState(s) && s.teams && s.teams.length === s.players.length) {
    return s.teams[viewerIdx] === s.teams[trapOwner];
  }
  return viewerIdx === trapOwner;
}

export function hasWon(p: Player): boolean {
  return (p.goalRow !== undefined && p.r === p.goalRow) ||
         (p.goalCol !== undefined && p.c === p.goalCol);
}

export function initState(
  treasureMode = false,
  playerCount = 2,
  loadout?: SkillType[],
  teams?: number[],
  options?: InitStateOptions
): GameState {
  const battlefield = Boolean(options?.battlefield);
  const effectiveTreasure = treasureMode || battlefield;

  const wallCount = battlefield
    ? playerCount === 4 ? 3 : playerCount === 3 ? 4 : 5
    : playerCount === 4 ? 5 : playerCount === 3 ? 7 : 10;

  const inv0 = loadout
    ? (battlefield ? loadout.filter(s => s !== 'TRAP') : [...loadout]).slice(0, 3)
    : [];

  const players: Player[] = [
    { r: 0, c: 4, walls: wallCount, goalRow: 8, inventory: [...inv0], effects: [] },
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
    treasureMode: effectiveTreasure,
    battlefieldMode: battlefield,
    playerCount,
  };

  if (teams && teams.length === playerCount) {
    state.teams = [...teams];
  }

  if (battlefield) {
    state.trenches = generateBattlefieldTrenches(playerCount, Math.random);
  }

  if (effectiveTreasure) {
    const trenchKeys = new Set((state.trenches ?? []).map(t => `${t.r},${t.c}`));
    const treasureCount = playerCount * 2;
    state.treasures = [];
    while (state.treasures.length < treasureCount) {
      const r = Math.floor(Math.random() * 7) + 1;
      const c = Math.floor(Math.random() * 9);
      if (trenchKeys.has(`${r},${c}`)) continue;
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

/**
 * Vízszintes vagy függőleges sáv (nem sarok): a két szomszédos mező, amit a rés elválaszt.
 * Sarokrésekre `null` (ott több mező érintett).
 */
export function gapAdjacentCells(vr: number, vc: number): { a: { r: number; c: number }; b: { r: number; c: number } } | null {
  const isR = vr % 2 === 0;
  const isC = vc % 2 === 0;
  if (isR && isC) return null;
  if (!isR && isC) {
    const rTop = (vr - 1) >> 1;
    const rBot = (vr + 1) >> 1;
    const c = vc >> 1;
    return { a: { r: rTop, c }, b: { r: rBot, c } };
  }
  if (isR && !isC) {
    const r = vr >> 1;
    const cLeft = (vc - 1) >> 1;
    const cRight = (vc + 1) >> 1;
    return { a: { r, c: cLeft }, b: { r, c: cRight } };
  }
  return null;
}

/**
 * Fal a vizuális rács rése alapján: H/V sávnál mindig a helyes irány; saroknál `cornerOrient`.
 */
export function wallFromGapVisual(vr: number, vc: number, cornerOrient: 'h' | 'v'): Wall | null {
  const isR = vr % 2 === 0;
  const isC = vc % 2 === 0;
  if (isR && isC) return null;
  if (!isR && isC) return v2w(vr, vc, 'h');
  if (isR && !isC) return v2w(vr, vc, 'v');
  return v2w(vr, vc, cornerOrient);
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
          && !isTrenchCell(s, jr, jc)
          && !others.some(o => o.r === jr && o.c === jc)) {
        mv.push({ r: jr, c: jc });
      } else {
        // Sidestep
        const sd = dr === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        for (const [sdr, sdc] of sd) {
          const sr = nr + sdr, sc = nc + sdc;
          if (sr >= 0 && sr < 9 && sc >= 0 && sc < 9
              && !isBlocked(s, nr, nc, sr, sc, hasMole)
              && !isTrenchCell(s, sr, sc)
              && !others.some(o => o.r === sr && o.c === sc)
              && !(sr === p.r && sc === p.c)) {
            mv.push({ r: sr, c: sc });
          }
        }
      }
    } else {
      if (!isTrenchCell(s, nr, nc)) mv.push({ r: nr, c: nc });
    }
  }
  return mv;
}

/**
 * A rés pontosan az aktuális játékos mezője és egy érvényes lépési cél között van-e.
 * Ilyenkor „fal nélküli” (nem fal-mód) réskattintást nem fogadunk el, hogy ne ütközzön a lépés szándékával;
 * fal-módban továbbra is lehet ide falat rakni.
 */
export function isGapBetweenPlayerAndValidMove(s: GameState, vr: number, vc: number): boolean {
  const pair = gapAdjacentCells(vr, vc);
  if (!pair) return false;
  const p = s.players[s.turn];
  const moves = getValidMoves(s, s.turn);
  const isDest = (r: number, c: number) => moves.some(m => m.r === r && m.c === c);
  const onP = (r: number, c: number) => r === p.r && c === p.c;
  return (onP(pair.a.r, pair.a.c) && isDest(pair.b.r, pair.b.c))
    || (onP(pair.b.r, pair.b.c) && isDest(pair.a.r, pair.a.c));
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
    battlefieldMode: s.battlefieldMode,
    playerCount: s.playerCount,
    botPlayers: s.botPlayers ? [...s.botPlayers] : undefined,
    teams: s.teams ? [...s.teams] : undefined,
    pendingTeamLayout: s.pendingTeamLayout,
    treasures: s.treasures ? s.treasures.map(t => ({ ...t })) : undefined,
    traps: s.traps ? s.traps.map(t => ({ ...t })) : undefined,
    trenches: s.trenches ? s.trenches.map(t => ({ ...t })) : undefined,
    skillFxBroadcast: s.skillFxBroadcast ? { ...s.skillFxBroadcast } : undefined,
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
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || vis.has(nr * 9 + nc) || isBlocked(s, r, c, nr, nc) || isTrenchCell(s, nr, nc)) continue;
      vis.add(nr * 9 + nc);
      q.push({ r: nr, c: nc, d: d + 1 });
    }
  }
  return Infinity;
}

export type ApplySkillResult = {
  state: GameState;
  /** Index of the other player in a random SWAP (for trap / UI). */
  swapPartner?: number;
  /** Ha false, a képesség nem került felhasználásra (pl. érvénytelen TRAP cél). */
  applied?: boolean;
};

/**
 * @param rng — used for SWAP partner pick (deterministic tests can inject a seeded PRNG).
 */
export function applySkill(
  s: GameState,
  skill: SkillType,
  target?: { r: number; c: number },
  rng: () => number = Math.random
): ApplySkillResult {
  if (skill === 'TRAP' && (!target || !isValidTrapPlacement(s, target.r, target.c))) {
    return { state: s, applied: false };
  }

  if (skill === 'TELEPORT' && target) {
    const pl = s.players[s.turn];
    const dist = Math.abs(pl.r - target.r) + Math.abs(pl.c - target.c);
    const occ = s.players.some((o, i) => i !== s.turn && o.r === target.r && o.c === target.c);
    if (dist > 2 || dist === 0 || occ || isTrenchCell(s, target.r, target.c)) {
      return { state: s, applied: false };
    }
  }

  const ns = cloneS(s);
  const p = ns.players[ns.turn];
  let swapPartner: number | undefined;

  if (p.inventory) {
    const idx = p.inventory.indexOf(skill);
    if (idx !== -1) p.inventory.splice(idx, 1);
  }
  if (!p.effects) p.effects = [];

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
    case 'SKIP': {
      const n = ns.players.length;
      const nextIdx = (ns.turn + 1) % n;
      const tgt = ns.players[nextIdx];
      if (!tgt.effects) tgt.effects = [];
      tgt.effects.push({ type: 'SKIP', duration: 1 });
      break;
    }
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
      for (let i = 0; i < ns.players.length; i++) {
        if (i === ns.turn) continue;
        const o = ns.players[i];
        const dr = p.r - o.r, dc = p.c - o.c;
        if (dr === 0 && dc === 0) continue;
        let nr = o.r, nc = o.c;
        if (Math.abs(dr) > Math.abs(dc)) {
          const step = Math.sign(dr) * Math.min(2, Math.max(0, Math.abs(dr) - 1));
          if (step !== 0) nr = o.r + step;
        } else {
          const step = Math.sign(dc) * Math.min(2, Math.max(0, Math.abs(dc) - 1));
          if (step !== 0) nc = o.c + step;
        }
        if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || isTrenchCell(ns, nr, nc)) continue;
        const occupied = ns.players.some((pl, idx) => idx !== i && pl.r === nr && pl.c === nc);
        if (!occupied) {
          o.r = nr;
          o.c = nc;
        }
      }
      break;
    }
    case 'TRAP':
      if (!ns.traps) ns.traps = [];
      ns.traps.push({ r: target!.r, c: target!.c, owner: ns.turn });
      break;
    case 'SWAP': {
      const candidates = ns.players.map((_, i) => i).filter(i => i !== ns.turn);
      if (candidates.length === 0) break;
      const k = candidates[Math.floor(rng() * candidates.length)];
      const o = ns.players[k];
      const tempR = p.r, tempC = p.c;
      p.r = o.r; p.c = o.c;
      o.r = tempR; o.c = tempC;
      swapPartner = k;
      break;
    }
  }
  return { state: ns, swapPartner };
}

/** SHIELD / SKIP duration tick at turn start. MOLE (Vakond) is excluded — it expires after the bearer moves or ends turn with wall/dig/other skill. */
function decayEffectsAtTurnStart(effects: PlayerEffect[] | undefined) {
  if (!effects?.length) return;
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    if (e.type === 'MOLE') continue;
    if (e.duration > 0) e.duration--;
    if (e.duration <= 0) effects.splice(i, 1);
  }
}

/** Call before advanceTurn when the current player used a move, wall, dig, or any skill other than activating MOLE. */
export function consumeActiveMole(p: Player) {
  if (!p.effects?.length) return;
  const i = p.effects.findIndex(e => e.type === 'MOLE' && e.duration > 0);
  if (i !== -1) p.effects.splice(i, 1);
}

export function advanceTurn(state: GameState) {
  const n = state.players.length;
  state.turn = (state.turn + 1) % n;

  const p = state.players[state.turn];

  // Check SKIP *before* decrementing so duration-1 effects are still visible
  if (p.effects?.some(e => e.type === 'SKIP')) {
    // Remove the SKIP effect, then decay remaining effects for this player
    p.effects = p.effects.filter(e => e.type !== 'SKIP');
    decayEffectsAtTurnStart(p.effects);
    // Advance again to the next player
    state.turn = (state.turn + 1) % n;
    const p2 = state.players[state.turn];
    if (p2.effects) decayEffectsAtTurnStart(p2.effects);
    return;
  }

  // Normal duration decay for the upcoming player
  if (p.effects) decayEffectsAtTurnStart(p.effects);
}

export function isValidWall(s: GameState, wr: number, wc: number, o: 'h' | 'v') {
  if (wr < 0 || wr >= 8 || wc < 0 || wc >= 8) return false;
  if (s.players[s.turn].walls <= 0) return false;
  const nw: Wall = { r: wr, c: wc, orient: o };
  for (const w of s.walls) if (wallsOverlap(w, nw)) return false;

  // Shield check: block all walls in 3×3 zone around any shielded opponent
  for (let i = 0; i < s.players.length; i++) {
    if (i === s.turn) continue;
    const opp = s.players[i];
    const hasShield = opp.effects?.some(e => e.type === 'SHIELD' && e.duration > 0) ?? false;
    if (hasShield) {
      // A wall at (wr,wc) touches the 3×3 cell zone [opp.r-1..opp.r+1]×[opp.c-1..opp.c+1]
      // iff wr ∈ [opp.r-2, opp.r+1] and wc ∈ [opp.c-2, opp.c+1] (valid for both h and v)
      if (wr >= opp.r - 2 && wr <= opp.r + 1 && wc >= opp.c - 2 && wc <= opp.c + 1) {
        return false;
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

// AI Logic (2-player minimax + multi-player greedy bot)

/** Csapatjátékban: másik csapat; FFA: minden másik játékos. */
export function opponentIndices(s: GameState, pi: number): number[] {
  const n = s.players.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i === pi) continue;
    if (isTeamGameState(s) && s.teams && s.teams[i] === s.teams[pi]) continue;
    out.push(i);
  }
  return out;
}

/**
 * Faljelöltek egy adott ellenfél útja és mezője körül (többjátékos-biztos).
 * A régi `getWC` csak 2 játékosnál volt helyes (`1 - ai`).
 */
export function getWallCandidatesNearPath(s: GameState, targetPi: number): Wall[] {
  const opp = s.players[targetPi];
  if (!opp) return [];
  const cd: Wall[] = [];
  const tr = new Set<string>();
  const path = bfsPath(s, targetPi);

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

/** 2 játékos + minimax: ellenfél index `1 - ai`. */
export function getWC(s: GameState, ai: number) {
  const oppIdx = 1 - ai;
  if (oppIdx < 0 || oppIdx >= s.players.length) return [];
  return getWallCandidatesNearPath(s, oppIdx);
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
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9 || vis.has(nr * 9 + nc) || isBlocked(s, r, c, nr, nc) || isTrenchCell(s, nr, nc)) continue;
      vis.set(nr * 9 + nc, { r, c });
      q.push({ r: nr, c: nc });
    }
  }
  return [{ r: p.r, c: p.c }];
}

export function ev(s: GameState) {
  let score =
    (bfsDist(s, 0) - bfsDist(s, 1)) * 10 + (s.players[1].walls - s.players[0].walls) * 2 + (4 - Math.abs(s.players[1].c - 4));
  if (trenchAwareAi(s)) {
    const w = 5;
    score += orthoTrenchNeighborCount(s, s.players[0].r, s.players[0].c) * w;
    score -= orthoTrenchNeighborCount(s, s.players[1].r, s.players[1].c) * w;
  }
  return score;
}

/** Nehéz AI: stabil távolság (Infinity → clamp), mobilitás, sürgősség ha valaki a cél közelében van. */
export function evHard(s: GameState): number {
  const FAR = 26;
  const d0 = bfsDist(s, 0);
  const d1 = bfsDist(s, 1);
  const u0 = d0 === Infinity ? FAR : Math.min(d0, FAR);
  const u1 = d1 === Infinity ? FAR : Math.min(d1, FAR);
  let score = (u0 - u1) * 14;
  score += (s.players[1].walls - s.players[0].walls) * 4;
  score += (4 - Math.abs(s.players[1].c - 4)) * 2;
  if (s.players.length === 2) {
    const m0 = getValidMoves(s, 0).length;
    const m1 = getValidMoves(s, 1).length;
    const mobW = trenchAwareAi(s) ? 5 : 3;
    score += (m1 - m0) * mobW;
  }
  if (trenchAwareAi(s)) {
    const wT = 4;
    score += orthoTrenchNeighborCount(s, s.players[0].r, s.players[0].c) * wT;
    score -= orthoTrenchNeighborCount(s, s.players[1].r, s.players[1].c) * wT;
  }
  if (u0 <= 4) score += (5 - u0) * 7;
  if (u1 <= 4) score -= (5 - u1) * 7;
  return score;
}

type EvalFn = (state: GameState) => number;

/** Erősebb lépések előre — jobb alpha-beta vágás. */
function orderedPawnMoves(s: GameState, pi: number): { r: number; c: number }[] {
  const mv = getValidMoves(s, pi);
  if (mv.length <= 1) return mv;
  const aware = trenchAwareAi(s);
  return [...mv].sort((a, b) => {
    const na = cloneS(s);
    na.players[pi].r = a.r;
    na.players[pi].c = a.c;
    consumeActiveMole(na.players[pi]);
    const nb = cloneS(s);
    nb.players[pi].r = b.r;
    nb.players[pi].c = b.c;
    consumeActiveMole(nb.players[pi]);
    const da = bfsDist(na, pi);
    const db = bfsDist(nb, pi);
    if (da !== db) return da - db;
    if (!aware) return 0;
    const ma = getValidMoves(na, pi).length;
    const mb = getValidMoves(nb, pi).length;
    if (ma !== mb) return mb - ma;
    return orthoTrenchNeighborCount(s, a.r, a.c) - orthoTrenchNeighborCount(s, b.r, b.c);
  });
}

/** Gyökérszint: ellenfél útvonal-növekedés szerint csökkenő (legjobb blokkok előre). */
function orderedRootWalls(s: GameState, ai: number, maxCandidates: number | undefined): Wall[] {
  const opp = 1 - ai;
  const baseOpp = bfsDist(s, opp);
  const wc = getWC(s, ai);
  const ranked: { w: Wall; gain: number }[] = [];
  for (const w of wc) {
    if (!isValidWall(s, w.r, w.c, w.orient)) continue;
    const ns = cloneS(s);
    ns.walls.push({ ...w });
    ns.players[ai].walls--;
    consumeActiveMole(ns.players[ai]);
    const after = bfsDist(ns, opp);
    const gain = after === Infinity ? 80 : after - baseOpp;
    ranked.push({ w, gain });
  }
  ranked.sort((a, b) => b.gain - a.gain);
  const list = ranked.map(x => x.w);
  return maxCandidates !== undefined ? list.slice(0, maxCandidates) : list;
}

export function mm(
  s: GameState,
  d: number,
  isMax: boolean,
  a: number,
  b: number,
  evalFn: EvalFn = ev
): number {
  if (hasWon(s.players[1])) return 1000;
  if (hasWon(s.players[0])) return -1000;
  if (d === 0) return evalFn(s);

  const pi = isMax ? 1 : 0;
  const mv = orderedPawnMoves(s, pi);

  if (isMax) {
    let best = -Infinity;
    for (const m of mv) {
      const ns = cloneS(s); ns.players[pi].r = m.r; ns.players[pi].c = m.c;
      consumeActiveMole(ns.players[pi]);
      ns.turn = 1 - pi;
      best = Math.max(best, mm(ns, d - 1, false, a, b, evalFn));
      a = Math.max(a, best); if (b <= a) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of mv) {
      const ns = cloneS(s); ns.players[pi].r = m.r; ns.players[pi].c = m.c;
      consumeActiveMole(ns.players[pi]);
      ns.turn = 1 - pi;
      best = Math.min(best, mm(ns, d - 1, true, a, b, evalFn));
      b = Math.min(b, best); if (b <= a) break;
    }
    return best;
  }
}

export type AIMove = { type: 'move', r: number, c: number } | { type: 'wall', r: number, c: number, orient: 'h' | 'v' };

export type MMRootOptions = {
  /** Alapértelmezett: `ev`. Nehéz módhoz: `evHard`. */
  evalFn?: EvalFn;
  /** Ha megadod, csak a legjobb N fal jelölt kerül kiértékelésre (gyorsabb mély keresés). */
  maxWallCandidates?: number;
};

export function mmRoot(s: GameState, d: number, opts?: MMRootOptions): AIMove {
  const evalFn = opts?.evalFn ?? ev;
  const maxWalls = opts?.maxWallCandidates;
  let bs = -Infinity, ba: AIMove | null = null;
  const mv = orderedPawnMoves(s, 1);

  for (const m of mv) {
    const ns = cloneS(s); ns.players[1].r = m.r; ns.players[1].c = m.c;
    consumeActiveMole(ns.players[1]);
    if (hasWon(ns.players[1])) return { type: 'move', r: m.r, c: m.c };
    ns.turn = 0;
    const sc = mm(ns, d - 1, false, -Infinity, Infinity, evalFn);
    if (sc > bs) { bs = sc; ba = { type: 'move', r: m.r, c: m.c }; }
  }

  if (s.players[1].walls > 0) {
    const walls = orderedRootWalls(s, 1, maxWalls);
    for (const w of walls) {
      if (!isValidWall(s, w.r, w.c, w.orient)) continue;
      const ns = cloneS(s); ns.walls.push(w); ns.players[1].walls--; consumeActiveMole(ns.players[1]); ns.turn = 0;
      const sc = mm(ns, d - 1, false, -Infinity, Infinity, evalFn);
      if (sc > bs) { bs = sc; ba = { type: 'wall', r: w.r, c: w.c, orient: w.orient }; }
    }
  }

  return ba || { type: 'move', r: mv[0]?.r ?? s.players[1].r, c: mv[0]?.c ?? s.players[1].c };
}

/**
 * Online / többjátékos bot: erősebb greedy mint a nyers 2-játékos mmRoot, de olcsóbb.
 * — Csak ellenfél-csapatot / FFA ellenfeleket veszi figyelembe falnál és döntetlennél.
 * — Több egyforma „közelebb a célhoz” lépés közül azt választja, ami jobban hátráltatja
 *   a legveszélyesebb (legközelebb a célhoz lévő) ellenfelet.
 * — Faljelöltek: a cél felé legközelebb álló ellenfél útja (nem a hibás `1 - pi` index).
 */
export function greedyBotMove(s: GameState, pi: number): AIMove {
  const moves = getValidMoves(s, pi);
  if (moves.length === 0) return { type: 'move', r: s.players[pi].r, c: s.players[pi].c };

  const opps = opponentIndices(s, pi);
  const minOppDist = (state: GameState) =>
    opps.length === 0 ? 99 : Math.min(...opps.map(i => bfsDist(state, i)));

  const baseSelf = bfsDist(s, pi);
  const baseOppMin = minOppDist(s);
  const aware = trenchAwareAi(s);

  type Scored = { r: number; c: number; selfD: number; oppMin: number; mob: number; trenchN: number };
  const scored: Scored[] = moves.map(m => {
    const ns = cloneS(s);
    ns.players[pi].r = m.r;
    ns.players[pi].c = m.c;
    consumeActiveMole(ns.players[pi]);
    return {
      r: m.r,
      c: m.c,
      selfD: bfsDist(ns, pi),
      oppMin: minOppDist(ns),
      mob: getValidMoves(ns, pi).length,
      trenchN: orthoTrenchNeighborCount(s, m.r, m.c),
    };
  });

  const betterGreedy = (a: Scored, b: Scored): Scored => {
    if (a.oppMin !== b.oppMin) return a.oppMin >= b.oppMin ? a : b;
    if (!aware) return a;
    if (a.mob !== b.mob) return a.mob >= b.mob ? a : b;
    return a.trenchN <= b.trenchN ? a : b;
  };

  const progressing = scored.filter(x => x.selfD < baseSelf);
  if (progressing.length > 0) {
    const bestSelf = Math.min(...progressing.map(x => x.selfD));
    const tier = progressing.filter(x => x.selfD === bestSelf);
    const pick = tier.reduce(betterGreedy);
    return { type: 'move', r: pick.r, c: pick.c };
  }

  // Nincs rövidítő lépés: fal, ami a legközelebb a célhoz lévő ellenfelet hátráltatja
  if (s.players[pi].walls > 0 && opps.length > 0) {
    const threat = opps.reduce((a, b) => (bfsDist(s, a) <= bfsDist(s, b) ? a : b));
    const baseThreat = bfsDist(s, threat);
    let bestWall: AIMove | null = null;
    let bestGain = 0;
    for (const w of getWallCandidatesNearPath(s, threat)) {
      if (!isValidWall(s, w.r, w.c, w.orient)) continue;
      const ns = cloneS(s);
      ns.walls.push(w);
      ns.players[pi].walls--;
      consumeActiveMole(ns.players[pi]);
      const gain = bfsDist(ns, threat) - baseThreat;
      if (gain > bestGain) {
        bestGain = gain;
        bestWall = { type: 'wall', r: w.r, c: w.c, orient: w.orient };
      }
    }
    if (bestWall && bestGain >= 1) return bestWall;
  }

  // Oldalsó / kitérő: ne essünk szét — tartjuk a távolságot, közben ellenfelet hátráltatjuk ha lehet
  const lateral = scored.filter(x => x.selfD === baseSelf);
  if (lateral.length > 0) {
    const pick = lateral.reduce(betterGreedy);
    if (pick.oppMin > baseOppMin) return { type: 'move', r: pick.r, c: pick.c };
  }

  const retreat = aware
    ? scored.reduce((a, b) => {
        if (a.selfD !== b.selfD) return a.selfD <= b.selfD ? a : b;
        if (a.mob !== b.mob) return a.mob >= b.mob ? a : b;
        return a.trenchN <= b.trenchN ? a : b;
      })
    : scored.reduce((a, b) => (a.selfD <= b.selfD ? a : b));
  return { type: 'move', r: retreat.r, c: retreat.c };
}
