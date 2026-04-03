export type GameMode = 'pvp' | 'ai' | 'online' | 'treasure-pvp' | 'treasure-ai' | 'treasure-online';
export type View = 'auth' | 'menu' | 'game' | 'leaderboard' | 'tos' | 'privacy' | 'lobby' | 'rules';

export const isOnlineMode = (m: GameMode): boolean => m === 'online' || m === 'treasure-online';
export const isTreasureMode = (m: GameMode): boolean => m.startsWith('treasure');
export const isAIMode = (m: GameMode): boolean => m === 'ai' || m === 'treasure-ai';
