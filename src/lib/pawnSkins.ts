import type { CollectibleType } from './types';

/** Központi azonosítók — DB / owned_skins / equipped_skin_id */
export type PawnSkinId = 'bunny_egg' | 'bunny_idle';

export type PawnSkinCatalogEntry = {
  id: PawnSkinId;
  /** Relatív útvonal a public gyökérhez: /sprites/bunny/frame- */
  frameBasePath: string;
  frameCount: number;
  /** Animációs FPS (1 = statikus első képkocka) */
  fps: number;
  eggType: CollectibleType;
  eggCost: number;
};

/** Új skin: vedd fel ide + migrációban az RPC whitelistbe. */
export const PAWN_SKIN_CATALOG: PawnSkinCatalogEntry[] = [
  {
    id: 'bunny_egg',
    frameBasePath: '/sprites/bunny/frame-',
    frameCount: 9,
    fps: 5,
    eggType: 'EGG_GOLD',
    eggCost: 2,
  },
  {
    id: 'bunny_idle',
    frameBasePath: '/sprites/bunny/frame-',
    frameCount: 1,
    fps: 1,
    eggType: 'EGG_BASIC',
    eggCost: 1,
  },
];

const byId: Record<string, PawnSkinCatalogEntry> = Object.fromEntries(
  PAWN_SKIN_CATALOG.map(e => [e.id, e])
);

export function getPawnSkinMeta(id: string | null | undefined): PawnSkinCatalogEntry | null {
  if (!id) return null;
  return byId[id] ?? null;
}

export function pawnSkinFrameUrl(entry: PawnSkinCatalogEntry, frameIndexZeroBased: number): string {
  const i = entry.frameCount <= 1 ? 0 : frameIndexZeroBased % entry.frameCount;
  const n = String(i + 1).padStart(2, '0');
  return `${entry.frameBasePath}${n}.png`;
}

/** Username, akinek a nyúl skin automatikusan jár (bolt / tojás nélkül). */
export const PAWN_SKIN_GRANT_USERNAME = 'Arlinamid';

export function shouldGrantUsernamePawnSkin(username: string | undefined | null): boolean {
  return (username ?? '').trim().toLowerCase() === PAWN_SKIN_GRANT_USERNAME.toLowerCase();
}

/** Ajándék skin(ek) a fenti felhasználónak — elsődlegesen az animált. */
export const USERNAME_GRANT_SKIN_IDS: PawnSkinId[] = ['bunny_egg'];
