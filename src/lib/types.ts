export type GameMode =
  | 'pvp'
  | 'ai'
  | 'online'
  | 'treasure-pvp'
  | 'treasure-ai'
  | 'treasure-online'
  | 'battlefield-pvp'
  | 'battlefield-ai'
  | 'battlefield-online';

export type View = 'auth' | 'menu' | 'game' | 'leaderboard' | 'tos' | 'privacy' | 'lobby' | 'rules' | 'store';

export const isOnlineMode = (m: GameMode): boolean => m === 'online' || m === 'treasure-online' || m === 'battlefield-online';
export const isTreasureMode = (m: GameMode): boolean => m.startsWith('treasure');
export const isBattlefieldMode = (m: GameMode): boolean => m.startsWith('battlefield');
/** Kincs, ásás, skillek a táblán — klasszikus kincs + Battlefield. */
export const usesTreasureRules = (m: GameMode): boolean => isTreasureMode(m) || isBattlefieldMode(m);
export const isAIMode = (m: GameMode): boolean => m === 'ai' || m === 'treasure-ai' || m === 'battlefield-ai';

export type CollectibleType = 'EGG_BASIC' | 'EGG_GOLD' | 'EGG_RAINBOW';

export type CollectedItem = {
  type: CollectibleType;
  collectedAt: string; // ISO timestamp
};

export const COLLECTIBLE_META: Record<CollectibleType, { icon: string; label: string; color: string; rarity: string }> = {
  EGG_BASIC:   { icon: '🥚', label: 'Húsvéti Tojás',    color: '#f0c866', rarity: 'Ritka'         },
  EGG_GOLD:    { icon: '🌟', label: 'Arany Tojás',      color: '#fbbf24', rarity: 'Nagyon ritka'   },
  EGG_RAINBOW: { icon: '🌈', label: 'Szivárvány Tojás', color: '#a78bfa', rarity: 'Legendás'       },
};
