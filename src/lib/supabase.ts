/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// We use environment variables for Supabase connection.
// If they are not set, we use a placeholder to prevent crashing,
// and the app will gracefully fallback to local storage for gamification.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder-project.supabase.co';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  xp: number;
  wins: number;
  losses: number;
  level: number;
};

// Local storage fallback for gamification if Supabase is not configured
export const getLocalProfile = (): Profile => {
  const stored = localStorage.getItem('quoridor_profile');
  if (stored) return JSON.parse(stored);
  return { id: 'local', username: 'Vendég', xp: 0, wins: 0, losses: 0, level: 1 };
};

export const saveLocalProfile = (profile: Profile) => {
  localStorage.setItem('quoridor_profile', JSON.stringify(profile));
};

export const calculateLevel = (xp: number) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
};

// --- Supabase Auth & DB Functions ---

export const signInAnonymously = async (username?: string, fingerprint?: string) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva') };
  const options = {
    data: {
      ...(username ? { username } : {}),
      ...(fingerprint ? { fingerprint } : {})
    }
  };
  return await supabase.auth.signInAnonymously({ options: Object.keys(options.data).length > 0 ? options : undefined });
};

/** Send a magic-link email. Works for both new and returning registered users. */
export const signInWithMagicLink = async (email: string) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva') };
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
};

/** Upgrade an anonymous account by linking an email address.
 *  Supabase sends a confirmation link; after clicking it the account becomes permanent. */
export const upgradeAnonymousAccount = async (email: string) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva') };
  return supabase.auth.updateUser({ email });
};

export const getUsernameByFingerprint = async (fingerprint: string) => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('fingerprint', fingerprint)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error('Hiba a fingerprint lekérésekor:', error);
    return null;
  }
  return data?.username;
};

export const getDbProfile = async (userId: string) => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.error('Hiba a profil lekérésekor:', error);
    return null;
  }
  return data as Profile;
};

export const updateDbProfile = async (userId: string, updates: Partial<Profile>) => {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  if (error) console.error('Hiba a profil frissítésekor:', error);
};

export const getLeaderboard = async (limit: number = 10) => {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Hiba a ranglista lekérésekor:', error);
    return [];
  }
  return data as Profile[];
};

// --- Multiplayer Functions ---

export const cancelMyWaitingGames = async (userId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('games').update({ status: 'cancelled' }).eq('player1_id', userId).eq('status', 'waiting');
};

export const createGame = async (userId: string, initialState: any, maxPlayers = 2) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva') };
  return supabase.from('games').insert({
    player1_id: userId,
    state: initialState,
    status: 'waiting',
    max_players: maxPlayers,
  }).select().single();
};

// slotIndex: 1=player2, 2=player3, 3=player4
export const joinGame = async (gameId: string, userId: string, slotIndex: 1 | 2 | 3) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva'), playerIndex: -1 };
  const field = slotIndex === 1 ? 'player2_id' : slotIndex === 2 ? 'player3_id' : 'player4_id';
  const { data, error } = await supabase
    .from('games').update({ [field]: userId }).eq('id', gameId).select().single();
  return { data, error, playerIndex: slotIndex };
};

export const startOnlineGame = async (gameId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('games').update({ status: 'playing' }).eq('id', gameId);
};

export const cancelGame = async (gameId: string) => {
  if (!isSupabaseConfigured) return;
  await supabase.from('games').update({ status: 'cancelled' }).eq('id', gameId);
};

export const getActiveGame = async (userId: string) => {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'playing')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId},player3_id.eq.${userId},player4_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
};

export const updateGameState = async (gameId: string, state: any, status: string = 'playing', winnerId?: string) => {
  if (!isSupabaseConfigured) return;
  const payload: any = { state, status };
  if (winnerId) payload.winner_id = winnerId;
  await supabase.from('games').update(payload).eq('id', gameId);
};

// --- Server-side XP (Edge Function) ---
// Falls back to null on error; App.tsx falls back to direct DB update in that case.
export const awardXp = async (session: { access_token: string }, mode: string, won: boolean): Promise<Partial<Profile> | null> => {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.functions.invoke('award-xp', {
    body: { mode, won },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) {
    console.error('award-xp Edge Function hiba:', error);
    return null;
  }
  return data as Partial<Profile>;
};
