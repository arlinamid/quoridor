/**
 * Online lobby helpers: count only slots within the lobby cap that have a human or a bot.
 * Prevents 3-pawn boards when only 2 participants joined (no ghost P3).
 */

import type { GameMode } from './types';

const SLOT_IDS = ['player1_id', 'player2_id', 'player3_id', 'player4_id'] as const;

export type GameRowSlots = Partial<Record<(typeof SLOT_IDS)[number], string | null>>;

export function countFilledOnlineSlots(
  row: GameRowSlots | null | undefined,
  lobbyCap: number,
  botSlots: number[]
): number {
  const cap = Math.min(Math.max(2, lobbyCap), 4);
  let c = 0;
  for (let i = 0; i < cap; i++) {
    const uid = row?.[SLOT_IDS[i]];
    if (uid || botSlots.includes(i)) c++;
  }
  return c;
}

/** Keep only bot indices that exist in an n-player game (0..n-1). */
export function filterBotSlotsForPlayerCount(botSlots: number[], n: number): number[] {
  return botSlots.filter((i) => i >= 0 && i < n).sort((a, b) => a - b);
}

/** Várakozó sor: klasszikus / kincs / battlefield egyezés a menü móddal. */
export function waitingGameRowMatchesMode(
  mode: GameMode,
  g: { state?: { treasureMode?: boolean; battlefieldMode?: boolean } }
): boolean {
  const tm = Boolean(g.state?.treasureMode);
  const bf = Boolean(g.state?.battlefieldMode);
  if (mode === 'battlefield-online') return bf;
  if (mode === 'treasure-online') return tm && !bf;
  if (mode === 'online') return !tm && !bf;
  return true;
}

/**
 * Első üres emberi slot a join_online_game RPC-hez: 1 → player2, 2 → player3, 3 → player4.
 * Lyukas sorrendnál (pl. P2 kilépett, P3 megvan) is helyes slotot ad.
 */
export function firstEmptyJoinSlot(
  row: GameRowSlots | null | undefined,
  maxPlayers: number
): 1 | 2 | 3 | null {
  const cap = Math.min(Math.max(2, maxPlayers), 4);
  for (let i = 1; i < cap; i++) {
    const field = SLOT_IDS[i];
    if (!row?.[field]) return i as 1 | 2 | 3;
  }
  return null;
}

/** Van-e még hely új játékosnak (DB slot; botok a host kliensén vannak). */
export function waitingRowHasFreeJoinSlot(
  row: GameRowSlots | null | undefined,
  maxPlayers: number
): boolean {
  return firstEmptyJoinSlot(row, maxPlayers) !== null;
}
