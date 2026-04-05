/**
 * Battlefield mód: Tetris-szerű árok-cellák (I / L / T, elforgatva), véletlen elhelyezéssel.
 * Nem fedik a bábuk startmezőit; a kincsek és csapdák külön szűrve vannak a játéklogikában.
 */

export type TrenchCell = { r: number; c: number };

/** Relatív cellák (min-k normalizált bounding box). */
const TETRO_SHAPES: { r: number; c: number }[][] = [
  // I
  [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: 2 },
    { r: 0, c: 3 },
  ],
  [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 2, c: 0 },
    { r: 3, c: 0 },
  ],
  // L
  [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 2, c: 0 },
    { r: 2, c: 1 },
  ],
  [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: 2 },
    { r: 1, c: 0 },
  ],
  [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 1 },
    { r: 2, c: 1 },
  ],
  [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 2, c: 1 },
  ],
  // T
  [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: 2 },
    { r: 1, c: 1 },
  ],
  [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 2, c: 0 },
    { r: 1, c: 1 },
  ],
  [
    { r: 0, c: 1 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 1, c: 2 },
  ],
  [
    { r: 0, c: 0 },
    { r: 1, c: 0 },
    { r: 1, c: 1 },
    { r: 2, c: 0 },
  ],
];

const START_CELLS: { r: number; c: number }[] = [
  { r: 0, c: 4 },
  { r: 8, c: 4 },
  { r: 4, c: 0 },
  { r: 4, c: 8 },
];

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 9 && c >= 0 && c < 9;
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

function shapeAt(shape: { r: number; c: number }[], ar: number, ac: number): { r: number; c: number }[] {
  return shape.map(({ r, c }) => ({ r: ar + r, c: ac + c }));
}

/**
 * 2–3 tetrominó, átfedés nélkül; startmezők és már foglalt árok nélkül.
 */
export function generateBattlefieldTrenches(playerCount: number, rng: () => number): TrenchCell[] {
  const forbidden = new Set<string>();
  for (let i = 0; i < playerCount; i++) {
    const s = START_CELLS[i];
    forbidden.add(key(s.r, s.c));
  }

  const placed: TrenchCell[] = [];
  const pieceCount = playerCount >= 4 ? 3 : playerCount === 3 ? 3 : 2;

  for (let p = 0; p < pieceCount; p++) {
    let placedThis = false;
    for (let attempt = 0; attempt < 80 && !placedThis; attempt++) {
      const shape = TETRO_SHAPES[Math.floor(rng() * TETRO_SHAPES.length)]!;
      const ar = Math.floor(rng() * 9);
      const ac = Math.floor(rng() * 9);
      const cells = shapeAt(shape, ar, ac);
      if (!cells.every(({ r, c }) => inBounds(r, c))) continue;
      if (cells.some(({ r, c }) => forbidden.has(key(r, c)))) continue;
      for (const { r, c } of cells) {
        forbidden.add(key(r, c));
        placed.push({ r, c });
      }
      placedThis = true;
    }
  }

  return placed;
}
