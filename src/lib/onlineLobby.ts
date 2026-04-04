/**
 * Online lobby helpers: count only slots within the lobby cap that have a human or a bot.
 * Prevents 3-pawn boards when only 2 participants joined (no ghost P3).
 */

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
