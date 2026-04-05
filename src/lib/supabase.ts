/// <reference types="vite/client" />
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { profileSelectTable } from './profileAccess';

// We use environment variables for Supabase connection.
// If they are not set, we use a placeholder to prevent crashing,
// and the app will gracefully fallback to local storage for gamification.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const isSupabaseConfigured = supabaseUrl !== 'https://placeholder-project.supabase.co';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type EggWallet = { EGG_BASIC: number; EGG_GOLD: number; EGG_RAINBOW: number };

export type Profile = {
  id: string;
  username: string;
  xp: number;
  wins: number;
  losses: number;
  level: number;
  /** Ha true: nem kér opcionális marketing / promóciós megkeresést (profilban állítható). */
  marketing_opt_out?: boolean;
  collected_items?: import('./types').CollectedItem[];
  skill_loadout?: import('../game/logic').SkillType[] | null;
  owned_skills?: import('../game/logic').SkillType[];
  egg_wallet?: EggWallet;
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

/** User-facing Hungarian message for vendég / anon auth failures (network throws, AuthApiError, trigger 500, etc.). */
export function formatGuestAuthError(err: unknown): string {
  if (err == null) {
    return 'Ismeretlen hiba a bejelentkezés során.';
  }
  const msg =
    err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
      ? (err as { message: string }).message
      : err instanceof Error
        ? err.message
        : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes('database error creating anonymous user') ||
    lower.includes('database error') ||
    lower.includes('internal server error')
  ) {
    return 'A szerver nem tudott vendégfiókot létrehozni (adatbázis hiba). Próbáld újra, vagy jelentkezz be az Email fülön magic linkkel. Ha gyakran előfordul, ellenőrizd a Supabase projekt auth/trigger beállításait.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Hálózati hiba — ellenőrizd az internetkapcsolatot, majd próbáld újra.';
  }
  return msg.trim() || 'Ismeretlen hiba a bejelentkezés során.';
}

function authErrorMessage(err: unknown): string {
  if (err == null) return '';
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function authErrorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return '';
}

/** True when Supabase Auth refused to send email due to rate limits. */
export function isEmailRateLimitError(err: unknown): boolean {
  const msg = authErrorMessage(err).toLowerCase();
  const code = authErrorCode(err).toLowerCase();
  if (code === 'over_email_send_rate_limit' || code === 'too_many_requests') return true;
  if (
    msg.includes('rate limit') ||
    msg.includes('email rate limit') ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('too many requests')
  ) {
    return true;
  }
  if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 429) return true;
  return false;
}

/** Hungarian message for magic link / email megerősítés hibák (rate limit, stb.). */
export function formatEmailAuthError(err: unknown): string {
  if (err == null) return 'Ismeretlen hiba az email küldésekor.';
  if (isEmailRateLimitError(err)) {
    return 'Túl sok megerősítő / belépési emailt kértél rövid időn belül — a Supabase korlátozza a küldést. Várj legalább 30–60 percet, nézd meg a spam mappát, és ne küldesd újra gyorsan többször. Fizetős csomagban vagy egyedi SMTP-val magasabb a limit.';
  }
  const msg = authErrorMessage(err).trim();
  const lower = msg.toLowerCase();
  if (lower.includes('invalid') && lower.includes('email')) {
    return 'Érvénytelen email-cím. Ellenőrizd a formátumot.';
  }
  return msg || 'Ismeretlen hiba az email küldésekor.';
}

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
  const { data, error } = await supabase.rpc('get_username_for_fingerprint', { fp: fingerprint });
  if (error) {
    console.error('Hiba a fingerprint lekérésekor:', error);
    return null;
  }
  return typeof data === 'string' ? data : null;
};

/** @param viewerUserId — session user id; must equal userId to load full profile (else peers use profiles_peer). */
export const getDbProfile = async (userId: string, viewerUserId: string | null) => {
  if (!isSupabaseConfigured) return null;
  const table = profileSelectTable(userId, viewerUserId);
  const { data, error } = await supabase.from(table).select('*').eq('id', userId).single();
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
    .from('profiles_peer')
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

// slotIndex: 1=player2, 2=player3, 3=player4 — server uses auth.uid() only (see join_online_game RPC)
export const joinGame = async (gameId: string, _userId: string, slotIndex: 1 | 2 | 3) => {
  if (!isSupabaseConfigured) return { data: null, error: new Error('Supabase nincs konfigurálva'), playerIndex: -1 };
  const { data, error } = await supabase.rpc('join_online_game', {
    p_game_id: gameId,
    p_slot: slotIndex,
  });
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error, playerIndex: slotIndex };
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

export const updateGameState = async (
  gameId: string,
  state: any,
  status: string = 'playing',
  winnerId?: string,
  patch?: { max_players?: number }
): Promise<{ error: PostgrestError | null }> => {
  if (!isSupabaseConfigured) return { error: null };
  const payload: any = { state, status };
  if (winnerId) payload.winner_id = winnerId;
  if (patch?.max_players !== undefined) payload.max_players = patch.max_players;
  const { error } = await supabase.from('games').update(payload).eq('id', gameId);
  return { error };
};

/** Ha a sor még `playing`, beállítja `finished` + winner — így a getActiveGame nem ad vissza „folyó” meccset, ha egy kliens nem küldte el a teljes state frissítést. */
export const ensureGameMarkedFinished = async (gameId: string, winnerUserId?: string | null) => {
  if (!isSupabaseConfigured) return;
  await supabase
    .from('games')
    .update({ status: 'finished', winner_id: winnerUserId ?? null })
    .eq('id', gameId)
    .eq('status', 'playing');
};

// ── Egg wallet + owned skills helpers ───────────────────────────────────────

const LOCAL_WALLET_KEY  = 'quoridor_egg_wallet';
const LOCAL_OWNED_KEY   = 'quoridor_owned_skills';
const LOCAL_HISTORY_KEY = 'quoridor_collected_history';
const LOCAL_LOADOUT_KEY = 'quoridor_skill_loadout';

export const getLocalEggWallet = (): EggWallet => {
  const s = localStorage.getItem(LOCAL_WALLET_KEY);
  return s ? JSON.parse(s) : { EGG_BASIC: 0, EGG_GOLD: 0, EGG_RAINBOW: 0 };
};
export const getLocalOwnedSkills = (): import('../game/logic').SkillType[] => {
  const s = localStorage.getItem(LOCAL_OWNED_KEY);
  return s ? JSON.parse(s) : [];
};
export const getLocalCollectedItems = (): import('./types').CollectedItem[] => {
  const s = localStorage.getItem(LOCAL_HISTORY_KEY);
  return s ? JSON.parse(s) : [];
};
export const getLocalSkillLoadout = (): import('../game/logic').SkillType[] | null => {
  const s = localStorage.getItem(LOCAL_LOADOUT_KEY);
  return s ? JSON.parse(s) : null;
};

/**
 * Collect an Easter egg: adds to wallet balance + history log.
 * Returns updated profile fields so App.tsx can do a single setProfile().
 *
 * Throws a typed error string when the server rejects the request:
 *   'rate_limited'  — collected another egg within the last 25 seconds
 *   'daily_limit'   — reached the 8-egg daily cap
 *   'invalid'       — unknown egg type (should never happen client-side)
 *   'unauthorized'  — user ID mismatch (tampering attempt)
 */
export const collectEasterEgg = async (
  userId: string | null,
  eggType: import('./types').CollectibleType
): Promise<{ egg_wallet: EggWallet; collected_items: import('./types').CollectedItem[] }> => {
  const newItem: import('./types').CollectedItem = { type: eggType, collectedAt: new Date().toISOString() };

  if (!isSupabaseConfigured || !userId) {
    // localStorage fallback — apply a basic client-side rate limit (25 s)
    const history = getLocalCollectedItems();
    const lastTs = history.length > 0
      ? new Date(history[history.length - 1].collectedAt).getTime()
      : 0;
    if (Date.now() - lastTs < 25_000) throw new Error('rate_limited');

    const wallet = getLocalEggWallet();
    wallet[eggType] = (wallet[eggType] ?? 0) + 1;
    localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallet));
    history.push(newItem);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(history));
    return { egg_wallet: wallet, collected_items: history };
  }

  // Server: atomic update via RPC with full anti-cheat validation
  const { data: status, error } = await supabase.rpc('add_egg_to_wallet', {
    p_user_id: userId,
    p_egg_type: eggType,
  });

  if (error) throw new Error(error.message);
  // status is the TEXT return value of the new RPC
  if (status && status !== 'ok') throw new Error(status as string);

  // Re-fetch updated profile fields (source of truth is always the server)
  const { data } = await supabase
    .from('profiles')
    .select('egg_wallet, collected_items')
    .eq('id', userId)
    .single();
  return {
    egg_wallet: data?.egg_wallet ?? { EGG_BASIC: 0, EGG_GOLD: 0, EGG_RAINBOW: 0 },
    collected_items: data?.collected_items ?? [],
  };
};

/** Purchase a skill using Easter eggs. Returns 'ok' | 'insufficient' | 'already_owned' | 'error'. */
export const purchaseSkill = async (
  userId: string | null,
  skill: import('../game/logic').SkillType,
  eggType: import('./types').CollectibleType,
  cost: number
): Promise<{ result: 'ok' | 'insufficient' | 'already_owned' | 'error'; egg_wallet?: EggWallet; owned_skills?: import('../game/logic').SkillType[] }> => {

  if (!isSupabaseConfigured || !userId) {
    // localStorage fallback
    const wallet = getLocalEggWallet();
    const owned  = getLocalOwnedSkills();
    if (owned.includes(skill)) return { result: 'already_owned' };
    if ((wallet[eggType] ?? 0) < cost) return { result: 'insufficient' };
    wallet[eggType] -= cost;
    owned.push(skill);
    localStorage.setItem(LOCAL_WALLET_KEY, JSON.stringify(wallet));
    localStorage.setItem(LOCAL_OWNED_KEY, JSON.stringify(owned));
    return { result: 'ok', egg_wallet: wallet, owned_skills: owned };
  }

  const { data, error } = await supabase.rpc('purchase_skill_with_eggs', {
    p_user_id: userId,
    p_skill: skill,
    p_egg_type: eggType,
    p_egg_cost: cost,
  });
  if (error) { console.error('purchase_skill_with_eggs error:', error); return { result: 'error' }; }
  if (data !== 'ok') return { result: data as 'insufficient' | 'already_owned' };

  // Re-fetch updated wallet + owned_skills
  const { data: profile } = await supabase
    .from('profiles')
    .select('egg_wallet, owned_skills')
    .eq('id', userId)
    .single();
  return {
    result: 'ok',
    egg_wallet: profile?.egg_wallet,
    owned_skills: profile?.owned_skills ?? [],
  };
};

/**
 * Kincsmódban: a megvásárolt skill egyszer használatos — felhasználáskor törlődik az owned_skills-ból
 * és a skill_loadoutból is (újra vásárolható). Ha a skill nincs owned-ban (csak ásással került be), nem módosít profilt.
 */
export const persistConsumedPurchasedSkill = async (
  userId: string | null,
  skill: import('../game/logic').SkillType,
  owned: import('../game/logic').SkillType[] | undefined,
  loadout: import('../game/logic').SkillType[] | undefined
): Promise<{ owned_skills: import('../game/logic').SkillType[]; skill_loadout: import('../game/logic').SkillType[] } | null> => {
  const o = owned ?? [];
  if (!o.includes(skill)) return null;
  const nextOwned = o.filter(s => s !== skill);
  const nextLoadout = (loadout ?? []).filter(s => s !== skill);

  if (!isSupabaseConfigured || !userId) {
    localStorage.setItem(LOCAL_OWNED_KEY, JSON.stringify(nextOwned));
    localStorage.setItem(LOCAL_LOADOUT_KEY, JSON.stringify(nextLoadout));
    return { owned_skills: nextOwned, skill_loadout: nextLoadout };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      owned_skills: nextOwned,
      skill_loadout: nextLoadout.length > 0 ? nextLoadout : null,
    })
    .eq('id', userId);
  if (error) {
    console.error('consume owned skill persist error:', error);
    return null;
  }
  return { owned_skills: nextOwned, skill_loadout: nextLoadout };
};

/** Save the user's skill loadout (up to 2 skills, or 3 for Gamepass). */
export const saveSkillLoadout = async (userId: string | null, loadout: import('../game/logic').SkillType[]) => {
  if (!isSupabaseConfigured || !userId) {
    localStorage.setItem(LOCAL_LOADOUT_KEY, JSON.stringify(loadout));
    return;
  }
  await supabase.from('profiles').update({ skill_loadout: loadout }).eq('id', userId);
};

// --- Server-side XP (SECURITY DEFINER RPC) ---
// Ugyanaz a JWT mint a többi PostgREST hívás — nem kell Edge Function (gateway 401 elkerülése).
// Hiba esetén null — App.tsx getDbProfile-lal szinkronizál.
export const awardXp = async (mode: string, won: boolean): Promise<Partial<Profile> | null> => {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc('award_match_xp', { p_mode: mode, p_won: won });
  if (error) {
    console.error('award_match_xp RPC hiba:', error);
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  return {
    xp: Number(o.xp),
    wins: Number(o.wins),
    losses: Number(o.losses),
    level: Number(o.level),
  };
};
