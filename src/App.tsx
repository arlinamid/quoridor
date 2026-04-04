import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ThreeBackground } from './components/ThreeBackground';
import {
  GameState, initState, mmRoot, evHard, greedyBotMove, SkillType, cloneS, applySkill, advanceTurn, hasWon, consumeActiveMole,
  teamsForOnlineLayout, viewerSharesWin, trapAffectsVictim, type OnlineTeamLayoutId,
} from './game/logic';
import {
  getLocalProfile, saveLocalProfile, Profile, calculateLevel,
  supabase, isSupabaseConfigured, signInAnonymously, formatGuestAuthError, getDbProfile, updateDbProfile,
  createGame, joinGame, cancelGame, cancelMyWaitingGames, getActiveGame, updateGameState, ensureGameMarkedFinished, getUsernameByFingerprint, getLeaderboard, awardXp, signInWithMagicLink, upgradeAnonymousAccount,
} from './lib/supabase';
import { getDeviceFingerprint } from './lib/fingerprint';
import { TOS, PrivacyPolicy } from './components/LegalDocs';
import { Rules } from './components/Rules';
import { StoreView } from './components/views/StoreView';
import { SessionWarning } from './components/SessionWarning';
import { useEasterEggSpawner } from './components/EasterEggOverlay';
import { CollectibleType } from './lib/types';
import { saveSkillLoadout, collectEasterEgg, purchaseSkill, getLocalSkillLoadout } from './lib/supabase';
import { Trophy, User, LogOut } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { GameMode, View, isOnlineMode, isTreasureMode, isAIMode } from './lib/types';
import { countFilledOnlineSlots, filterBotSlotsForPlayerCount } from './lib/onlineLobby';
import { AuthView } from './components/views/AuthView';
import { MenuView } from './components/views/MenuView';
import { LobbyView } from './components/views/LobbyView';
import { LeaderboardView } from './components/views/LeaderboardView';
import { GameView } from './components/views/GameView';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [mode, setMode] = useState<GameMode>('pvp');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [gameState, setGameState] = useState<GameState>(initState());
  const [wallMode, setWallMode] = useState(false);
  const [wallOrient, setWallOrient] = useState<'h' | 'v'>('h');
  const [animating, setAnimating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [targetingSkill, setTargetingSkill] = useState<SkillType | null>(null);
  const [trapHitFlash, setTrapHitFlash] = useState<{ r: number; c: number } | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [winReason, setWinReason] = useState('');
  const [winnerIdx, setWinnerIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [guestSigningIn, setGuestSigningIn] = useState(false);
  const [guestAuthError, setGuestAuthError] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [profile, setProfile] = useState<Profile>(getLocalProfile());
  /** Honnan nyitották az ÁSZF / adatvédelmi képernyőt (Vissza ide visz). */
  const [legalReturnView, setLegalReturnView] = useState<'auth' | 'leaderboard'>('auth');

  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlineRole, setOnlineRole] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [hostedGameData, setHostedGameData] = useState<any | null>(null);
  const [botSlots, setBotSlots] = useState<number[]>([]);
  const [rejoinCandidate, setRejoinCandidate] = useState<any | null>(null);
  const [waitingGames, setWaitingGames] = useState<any[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Record<number, Profile>>({});
  const [lobbySlotNames, setLobbySlotNames] = useState<Record<number, string>>({});
  const [lobbyUsers, setLobbyUsers] = useState<Set<string>>(new Set());
  const [onlineTeamLayout, setOnlineTeamLayout] = useState<OnlineTeamLayoutId>('ffa');
  const onlineTeamLayoutRef = useRef<OnlineTeamLayoutId>('ffa');

  const [leaderboardTab, setLeaderboardTab] = useState<'personal' | 'online'>('personal');
  const [leaderboardData, setLeaderboardData] = useState<Profile[]>([]);

  const [skillLoadout, setSkillLoadout] = useState<SkillType[]>(() => {
    // Will be overridden by profile once loaded
    return getLocalSkillLoadout() ?? [];
  });

  const gameStateRef = useRef(gameState);
  const viewRef = useRef(view);
  const showWinRef = useRef(showWin);
  const hostedGameDataRef = useRef(hostedGameData);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const connectedUserIdsRef = useRef(connectedUserIds);
  const modeRef = useRef(mode);
  const onlineGameIdRef = useRef(onlineGameId);
  const onlineRoleRef = useRef(onlineRole);
  const sessionRef = useRef(session);
  const botSlotsRef = useRef(botSlots);
  const skillLoadoutRef = useRef(skillLoadout);
  // handleWinRef populated after handleWin is defined (see below)
  const handleWinRef = useRef<(idx: number, fromRt?: boolean, reason?: string, snap?: GameState) => void>(() => {});
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  useEffect(() => {
    if (!trapHitFlash) return;
    const t = setTimeout(() => setTrapHitFlash(null), 700);
    return () => clearTimeout(t);
  }, [trapHitFlash]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { showWinRef.current = showWin; }, [showWin]);
  useEffect(() => { hostedGameDataRef.current = hostedGameData; }, [hostedGameData]);
  useEffect(() => { connectedUserIdsRef.current = connectedUserIds; }, [connectedUserIds]);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { onlineGameIdRef.current = onlineGameId; }, [onlineGameId]);
  useEffect(() => { onlineRoleRef.current = onlineRole; }, [onlineRole]);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { botSlotsRef.current = botSlots; }, [botSlots]);
  useEffect(() => { skillLoadoutRef.current = skillLoadout; }, [skillLoadout]);
  useEffect(() => { onlineTeamLayoutRef.current = onlineTeamLayout; }, [onlineTeamLayout]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); setView('menu'); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { loadProfile(session.user.id); checkActiveGame(session.user.id); setView('menu'); }
      else setView('auth');
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        checkActiveGame(session.user.id);
        setView(prev => prev === 'auth' ? 'menu' : prev);
        // Magic link confirmation or email upgrade completed in this browser
        if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
          setStatusMsg(event === 'USER_UPDATED' ? '✓ Email megerősítve — fiók véglegesítve!' : '');
          setTimeout(() => setStatusMsg(''), 4000);
        }
      } else {
        setView('auth');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'auth' && isSupabaseConfigured) {
      getUsernameByFingerprint(getDeviceFingerprint()).then(u => { if (u && !usernameInput) setUsernameInput(u); });
    }
  }, [view]);

  useEffect(() => {
    if (view === 'leaderboard' && leaderboardTab === 'online' && isSupabaseConfigured) {
      getLeaderboard().then(data => setLeaderboardData(data));
    }
  }, [view, leaderboardTab]);

  useEffect(() => { saveLocalProfile(profile); }, [profile]);

  const loadProfile = async (userId: string) => {
    const dbProfile = await getDbProfile(userId, userId);
    if (dbProfile) {
      setProfile(dbProfile);
      if (dbProfile.skill_loadout) setSkillLoadout(dbProfile.skill_loadout);
    }
  };

  const handleMarketingOptOutChange = useCallback(async (marketingOptOut: boolean) => {
    setProfile(p => ({ ...p, marketing_opt_out: marketingOptOut }));
    if (isSupabaseConfigured && session?.user?.id) {
      await updateDbProfile(session.user.id, { marketing_opt_out: marketingOptOut });
    }
  }, [isSupabaseConfigured, session?.user?.id]);

  const loadPlayerProfiles = async (gameRow: any, myUserId: string) => {
    const ids: (string | null)[] = [gameRow.player1_id, gameRow.player2_id, gameRow.player3_id, gameRow.player4_id];
    const map: Record<number, Profile> = {};
    await Promise.all(ids.map(async (uid, idx) => {
      if (!uid || uid === myUserId) return;
      const p = await getDbProfile(uid, myUserId);
      if (p) map[idx] = p;
    }));
    setPlayerProfiles(map);
  };

  // Fetch usernames for all filled human slots → shown in lobby slot rows
  useEffect(() => {
    if (!hostedGameData || !session) return;
    const ids: (string | null)[] = [
      hostedGameData.player1_id, hostedGameData.player2_id,
      hostedGameData.player3_id, hostedGameData.player4_id,
    ];
    const map: Record<number, string> = {};
    Promise.all(ids.map(async (uid, idx) => {
      if (!uid) return;
      if (uid === session.user.id) {
        map[idx] = profile.username;
        return;
      }
      const p = await getDbProfile(uid, session.user.id);
      if (p) map[idx] = p.username;
    })).then(() => setLobbySlotNames(map));
  }, [hostedGameData, session, profile.username]);

  const checkActiveGame = async (userId: string) => {
    const game = await getActiveGame(userId);
    if (game) setRejoinCandidate(game);
  };

  /** Online meccs vége / kilépés: ne maradjon `onlineGameId`, különben az „Újra” és a menü blokkol, és a rejoin szalag tévesen aktív játékot mutat. */
  const resetOnlineSessionAfterMatch = useCallback(() => {
    setOnlineGameId(null);
    setHostedGameData(null);
    setBotSlots([]);
    setRejoinCandidate(null);
  }, []);

  const syncLobbyPendingTeamLayout = useCallback(async (layout: OnlineTeamLayoutId) => {
    const gid = onlineGameIdRef.current;
    const row = hostedGameDataRef.current;
    if (!gid || !row || row.status !== 'waiting' || !isSupabaseConfigured) return;
    const base = row.state && typeof row.state === 'object' ? row.state : {};
    const nextState = { ...base, pendingTeamLayout: layout };
    const { error } = await supabase.from('games').update({ state: nextState }).eq('id', gid);
    if (!error) setHostedGameData((prev: any) => (prev?.id === gid ? { ...prev, state: nextState } : prev));
  }, []);

  const handleOnlineTeamLayoutChange = useCallback(
    async (layout: OnlineTeamLayoutId) => {
      setOnlineTeamLayout(layout);
      await syncLobbyPendingTeamLayout(layout);
    },
    [syncLobbyPendingTeamLayout]
  );

  const handleMaxPlayersChange = useCallback(
    (n: number) => {
      setMaxPlayers(n);
      setOnlineTeamLayout((prev) => {
        let next: OnlineTeamLayoutId = prev;
        if (n === 2) next = 'ffa';
        else if (n === 3 && prev === '4_2v2') next = 'ffa';
        else if (n === 4 && (prev === '3_1v2' || prev === '3_2v1')) next = 'ffa';
        if (onlineGameIdRef.current && onlineRoleRef.current === 0) {
          setTimeout(() => void syncLobbyPendingTeamLayout(next), 0);
        }
        return next;
      });
    },
    [syncLobbyPendingTeamLayout]
  );

  const handleGuestLogin = async () => {
    setGuestAuthError('');
    if (!isSupabaseConfigured) { setView('menu'); return; }
    setGuestSigningIn(true);
    try {
      const { error } = await signInAnonymously(usernameInput.trim() || undefined, getDeviceFingerprint());
      if (error) setGuestAuthError(formatGuestAuthError(error));
    } catch (e) {
      setGuestAuthError(formatGuestAuthError(e));
    } finally {
      setGuestSigningIn(false);
    }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setProfile(getLocalProfile());
    setShowWin(false);
    setView('auth');
  };

  const handleWin = useCallback((winnerIndex: number, _fromRealtime = false, reason = '', snapState?: GameState) => {
    setShowWin(true);
    setWinnerIdx(winnerIndex);
    setGameState(prev => ({ ...prev, gameOver: true }));
    setWinReason(reason);

    const gs = snapState ?? gameStateRef.current;
    const n = gs.players?.length ?? 2;

    if (isOnlineMode(mode)) {
      const gid = onlineGameIdRef.current;
      if (gid && isSupabaseConfigured) {
        const row = hostedGameDataRef.current;
        const slots = row ? [row.player1_id, row.player2_id, row.player3_id, row.player4_id] : [];
        const wuid = winnerIndex >= 0 && winnerIndex < slots.length ? slots[winnerIndex] : null;
        const winnerUuid = typeof wuid === 'string' ? wuid : null;
        void ensureGameMarkedFinished(gid, winnerUuid);
      }
      resetOnlineSessionAfterMatch();
    }

    setProfile(p => {
      const won = isOnlineMode(mode)
        ? viewerSharesWin(gs.teams, winnerIndex, onlineRole, n)
        : winnerIndex === 0;
      let newP = { ...p };
      if (isAIMode(mode) || isOnlineMode(mode)) {
        newP = won
          ? { ...p, wins: p.wins + 1, xp: p.xp + 50, level: calculateLevel(p.xp + 50) }
          : { ...p, losses: p.losses + 1, xp: p.xp + 10, level: calculateLevel(p.xp + 10) };
      } else {
        newP = { ...p, xp: p.xp + 20, level: calculateLevel(p.xp + 20) };
      }
      if (isSupabaseConfigured && session?.user?.id) {
        awardXp(session, mode, isOnlineMode(mode) ? won : winnerIndex === 0).then(result => {
          if (result) setProfile(prev => ({ ...prev, ...result }));
        }).catch(async () => {
          const refreshed = await getDbProfile(session!.user.id, session!.user.id);
          if (refreshed) setProfile(prev => ({ ...prev, ...refreshed }));
        });
      }
      return newP;
    });
  }, [mode, session, onlineRole, resetOnlineSessionAfterMatch]);
  useEffect(() => { handleWinRef.current = handleWin; }, [handleWin]);

  useEffect(() => {
    if (!isOnlineMode(mode) || !onlineGameId || !isSupabaseConfigured || !session) return;
    const channel = supabase.channel(`game-${onlineGameId}`, { config: { presence: { key: session.user.id } } });
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${onlineGameId}` }, async (payload) => {
        const g = payload.new;
        // Always update hosted game data so slot UI stays current
        setHostedGameData(g);
        if (g.status === 'playing' && viewRef.current === 'lobby') {
          if (session) await loadPlayerProfiles(g, session.user.id);
          // Apply own skill loadout to own player slot when the game starts
          const gs = { ...g.state };
          const myRole = onlineRoleRef.current;
          const myLoadout = skillLoadoutRef.current;
          if (myLoadout.length > 0 && gs.players?.[myRole]) {
            gs.players = gs.players.map((p: any, i: number) =>
              i === myRole ? { ...p, inventory: [...myLoadout].slice(0, 3) } : p
            );
          }
          if (typeof g.max_players === 'number' && g.max_players >= 2) setMaxPlayers(g.max_players);
          setGameState(gs);
          setView('game');
        } else if (g.status === 'playing' || g.status === 'waiting') {
          // Non-lobby update: just sync state
          if (g.state && viewRef.current === 'game') setGameState(g.state);
        }
        if (g.status === 'finished' && !showWinRef.current) {
          // Find winner slot by matching winner_id against all player slots
          const slots = [g.player1_id, g.player2_id, g.player3_id, g.player4_id];
          const winSlot = slots.findIndex((uid: string | null) => uid === g.winner_id);
          const snap = g.state && typeof g.state === 'object' ? (g.state as GameState) : undefined;
          handleWin(winSlot !== -1 ? winSlot : onlineRole, true, '', snap);
        }
        if (g.status === 'abandoned') {
          resetOnlineSessionAfterMatch();
          if (!showWinRef.current) {
            setGameState(prev => ({ ...prev, gameOver: true }));
            setWinReason('Játék lezárva — inaktivitás miatt.');
            setShowWin(true);
          }
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setConnectedUserIds(prev => new Set([...prev, key]));
        if (key !== session.user.id && disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          setStatusMsg('Ellenfél visszacsatlakozott!');
          setTimeout(() => setStatusMsg(''), 2500);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setConnectedUserIds(prev => { const next = new Set(prev); next.delete(key); return next; });
        if (key !== session.user.id && viewRef.current === 'game') {
          setStatusMsg('Ellenfél kapcsolata megszakadt — 2 perc várakozás...');
          disconnectTimerRef.current = setTimeout(() => {
            disconnectTimerRef.current = null;
            if (!channel.presenceState()[key] && viewRef.current === 'game' && !showWinRef.current && !gameStateRef.current.gameOver) {
              updateGameState(onlineGameId, { ...gameStateRef.current, gameOver: true }, 'finished', session.user.id);
              handleWin(onlineRole, false, 'Ellenfél kilépett!');
            }
          }, 2 * 60 * 1000);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
          // Seed connected set from current presence state
          setConnectedUserIds(new Set(Object.keys(channel.presenceState())));
        }
      });
    return () => {
      if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
      supabase.removeChannel(channel);
    };
  }, [mode, onlineGameId, session, onlineRole, handleWin, resetOnlineSessionAfterMatch]);

  useEffect(() => {
    if (view !== 'lobby' || !isSupabaseConfigured || !session) return;
    const channel = supabase.channel('lobby', { config: { presence: { key: session.user.id } } });
    channel
      .on('presence', { event: 'sync' }, () => setLobbyUsers(new Set(Object.keys(channel.presenceState()))))
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() }); });
    const fetchGames = async () => {
      const { data } = await supabase.from('games').select('*, player1:profiles!player1_id(username)').eq('status', 'waiting');
      if (data) setWaitingGames(data);
    };
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [view, session]);

  // Auto-start timer: host only, fires after 2 minutes if >= 2 slots filled (humans + bots)
  useEffect(() => {
    if (!onlineGameId || onlineRole !== 0) return;
    const AUTO_START_MS = 2 * 60 * 1000;
    const timer = setTimeout(async () => {
      const g = hostedGameDataRef.current;
      if (!g || g.status !== 'waiting') return;
      const lobbyCap = Math.min(4, Math.max(2, g.max_players ?? 2));
      const n = countFilledOnlineSlots(g, lobbyCap, botSlotsRef.current);
      if (n < 2) return;
      const treasure = Boolean(g.state?.treasureMode);
      const loadout =
        skillLoadoutRef.current.length > 0 ? [...skillLoadoutRef.current].slice(0, 3) : undefined;
      const layout = (g.state?.pendingTeamLayout as OnlineTeamLayoutId) ?? onlineTeamLayoutRef.current;
      const teams = teamsForOnlineLayout(layout, n);
      let newState = initState(treasure, n, loadout, teams);
      const bots = filterBotSlotsForPlayerCount(botSlotsRef.current, n);
      if (bots.length > 0) newState = { ...newState, botPlayers: bots };
      setGameState(newState);
      setMaxPlayers(n);
      await updateGameState(onlineGameIdRef.current!, newState, 'playing', undefined, { max_players: n });
    }, AUTO_START_MS);
    return () => clearTimeout(timer);
  }, [onlineGameId, onlineRole]);

  // Bot AI effect: lowest-indexed *connected* human drives bots.
  // When host (role 0) disconnects, role 1 takes over automatically.
  useEffect(() => {
    if (view !== 'game' || !isOnlineMode(mode) || gameState.gameOver || animating) return;
    const botPi = gameState.turn;
    if (!gameState.botPlayers?.includes(botPi)) return;
    const n = gameState.players.length;
    const botSet = new Set(gameState.botPlayers ?? []);
    const humanRoles = Array.from({ length: n }, (_, i) => i).filter(i => !botSet.has(i));
    // Build role→userId mapping from the game row so we can check presence
    const g = hostedGameDataRef.current;
    const roleToUserId: Record<number, string> = {};
    if (g) {
      [g.player1_id, g.player2_id, g.player3_id, g.player4_id].forEach((uid: string | null, i: number) => {
        if (uid) roleToUserId[i] = uid;
      });
    }
    const connected = connectedUserIdsRef.current;
    const connectedHumanRoles = humanRoles.filter(r => roleToUserId[r] && connected.has(roleToUserId[r]));
    // Fall back to all human roles if presence info not yet available
    const effectiveRoles = connectedHumanRoles.length > 0 ? connectedHumanRoles : humanRoles;
    const controllerRole = effectiveRoles.length > 0 ? Math.min(...effectiveRoles) : 0;
    if (onlineRole !== controllerRole) return;
    setStatusMsg('Bot gondolkodik...');
    const timer = setTimeout(() => {
      const move = greedyBotMove(gameState, botPi);
      setStatusMsg('');
      if (move.type === 'move') executeMove(move.r, move.c);
      else executeWall(move.r, move.c, move.orient);
    }, 600);
    return () => clearTimeout(timer);
  }, [view, mode, gameState, animating, onlineRole, connectedUserIds]);

  useEffect(() => {
    if (view !== 'game' || !isAIMode(mode) || gameState.turn !== 1 || gameState.gameOver || animating) return;
    setStatusMsg('A gép gondolkodik...');
    const hard = aiDifficulty === 'hard';
    const medium = aiDifficulty === 'medium';
    const depth =
      aiDifficulty === 'easy' ? 2 :
      aiDifficulty === 'medium' ? 4 :
      5;
    const thinkMs = hard ? 750 : medium ? 650 : 500;
    const timer = setTimeout(() => {
      const move = hard
        ? mmRoot(gameState, depth, { evalFn: evHard, maxWallCandidates: 44 })
        : medium
          ? mmRoot(gameState, depth, { evalFn: evHard, maxWallCandidates: 52 })
          : mmRoot(gameState, depth);
      setStatusMsg('');
      if (move.type === 'move') executeMove(move.r, move.c);
      else executeWall(move.r, move.c, move.orient);
    }, thinkMs);
    return () => clearTimeout(timer);
  }, [view, mode, gameState, animating, aiDifficulty]);

  // Heartbeat: keep the game alive in the DB every 30 s while in an active online game
  useEffect(() => {
    if (view !== 'game' || !isOnlineMode(mode) || !onlineGameId || !session || gameState.gameOver) return;
    const send = () => fetch('/api/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: onlineGameId, userId: session.user.id }),
    }).catch(() => {});
    send();
    const id = setInterval(send, 30_000);
    return () => clearInterval(id);
  }, [view, mode, onlineGameId, session, gameState.gameOver]);

  // Single interval per game session — reads live state via refs, no stale closures.
  // Recreated only when switching view (enter/leave game screen).
  useEffect(() => {
    if (view !== 'game') return;
    setTimeLeft(120);
    const interval = setInterval(() => {
      const gs = gameStateRef.current;
      if (!gs.lastMoveTime || gs.gameOver || showWinRef.current) {
        if (!gs.lastMoveTime) setTimeLeft(120);
        return;
      }
      const remaining = Math.max(0, 120 - Math.floor((Date.now() - gs.lastMoveTime) / 1000));
      setTimeLeft(remaining);
      if (remaining > 0) return;

      const currentMode = modeRef.current;
      const currentGameId = onlineGameIdRef.current;
      const currentRole = onlineRoleRef.current;
      const currentSession = sessionRef.current;
      const n = gs.players.length;

      if (n <= 2) {
        // 2-player: timed-out player loses
        const winner = 1 - gs.turn;
        if (isOnlineMode(currentMode) && currentGameId && currentRole === winner) {
          updateGameState(currentGameId, { ...gs, gameOver: true }, 'finished', currentSession?.user?.id);
        }
        handleWinRef.current(winner, false, 'Időtúllépés miatt!');
      } else {
        // 3-4 player: skip timed-out player's turn, reset clock
        if (isOnlineMode(currentMode) && currentGameId && currentRole === gs.turn) {
          setGameState(prev => {
            if (prev.gameOver || showWinRef.current) return prev;
            const next = cloneS(prev);
            next.lastMoveTime = Date.now();
            advanceTurn(next);
            updateGameState(currentGameId!, next, 'playing');
            return next;
          });
          setStatusMsg(`P${gs.turn + 1} időtúllépés — kör kihagyva!`);
          setTimeout(() => setStatusMsg(''), 2500);
        } else if (!isOnlineMode(currentMode)) {
          setGameState(prev => {
            if (prev.gameOver || showWinRef.current) return prev;
            const next = cloneS(prev);
            next.lastMoveTime = Date.now();
            advanceTurn(next);
            return next;
          });
          setStatusMsg(`P${gs.turn + 1} időtúllépés — kör kihagyva!`);
          setTimeout(() => setStatusMsg(''), 2500);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [view]); // deps: view only — everything else via refs

  const handleEasterEggCollect = useCallback(async (eggType: CollectibleType) => {
    try {
      const { egg_wallet, collected_items } = await collectEasterEgg(
        session?.user?.id ?? null,
        eggType
      );
      setProfile(p => ({ ...p, egg_wallet, collected_items }));
      const label = eggType === 'EGG_RAINBOW' ? '🌈 Szivárvány Tojás' : eggType === 'EGG_GOLD' ? '🌟 Arany Tojás' : '🥚 Húsvéti Tojás';
      setStatusMsg(`${label} gyűjtve! Egyenleg: ${egg_wallet[eggType]} db`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.error('Easter egg gyűjtési hiba:', e);
    }
  }, [session]);

  const handlePurchaseSkill = useCallback(async (
    skill: SkillType,
    eggType: CollectibleType,
    cost: number
  ): Promise<'ok' | 'insufficient' | 'already_owned' | 'error'> => {
    const res = await purchaseSkill(session?.user?.id ?? null, skill, eggType, cost);
    if (res.result === 'ok') {
      setProfile(p => ({
        ...p,
        ...(res.egg_wallet  ? { egg_wallet: res.egg_wallet }   : {}),
        ...(res.owned_skills ? { owned_skills: res.owned_skills } : {}),
      }));
    }
    return res.result;
  }, [session]);

  const { activeEgg, trySpawn, collect } = useEasterEggSpawner(
    view === 'game' && !gameState.gameOver,
    handleEasterEggCollect
  );

  useEffect(() => {
    if (view === 'game' && !gameState.gameOver) {
      trySpawn();
    }
  }, [gameState.turn, view]);

  const handleSaveLoadout = useCallback(async (loadout: SkillType[]) => {
    setSkillLoadout(loadout);
    await saveSkillLoadout(session?.user?.id ?? null, loadout);
    if (session?.user?.id) {
      setProfile(p => ({ ...p, skill_loadout: loadout }));
    }
  }, [session]);

  const startGame = useCallback((selectedMode: GameMode, difficulty?: 'easy' | 'medium' | 'hard') => {
    if (isOnlineMode(selectedMode) && onlineGameId) {
      alert('Már bent vagy egy online játékban! Előbb lépj ki belőle.');
      return;
    }
    setShowWin(false); setWinReason(''); setStatusMsg(''); setTargetingSkill(null); setTrapHitFlash(null);
    if (difficulty) setAiDifficulty(difficulty);
    if (isOnlineMode(selectedMode)) {
      setMode(selectedMode);
      setView('lobby');
      setOnlineGameId(null);
      setPlayerProfiles({});
      setBotSlots([]);
      setHostedGameData(null);
      setOnlineTeamLayout('ffa');
      return;
    }
    setMode(selectedMode);
    // Use current loadout from ref to avoid stale closure
    const currentLoadout = skillLoadoutRef.current;
    setGameState(initState(isTreasureMode(selectedMode), 2, currentLoadout.length > 0 ? currentLoadout : undefined));
    setWallMode(false); setWallOrient('h'); setAnimating(false); setTimeLeft(120);
    setView('game');
  }, [onlineGameId]);

  // Start positions indexed by player slot — used for trap teleport-back
  const PLAYER_START = [
    { r: 0, c: 4 }, // P0
    { r: 8, c: 4 }, // P1
    { r: 4, c: 0 }, // P2
    { r: 4, c: 8 }, // P3
  ] as const;

  const executeMove = useCallback((r: number, c: number) => {
    setAnimating(true);
    setGameState(prev => {
      const next = cloneS(prev);
      next.lastMoveTime = Date.now();
      next.players[prev.turn].r = r;
      next.players[prev.turn].c = c;
      const trapIdx = next.traps?.findIndex(t => t.r === r && t.c === c && trapAffectsVictim(next, t.owner, prev.turn));
      if (trapIdx !== undefined && trapIdx !== -1) {
        next.traps!.splice(trapIdx, 1);
        const sp = PLAYER_START[prev.turn] ?? PLAYER_START[0];
        next.players[prev.turn].r = sp.r;
        next.players[prev.turn].c = sp.c;
        setStatusMsg('Csapdába léptél! Vissza a startvonalra.');
        queueMicrotask(() => setTrapHitFlash({ r, c }));
      }
      const isWin = hasWon(next.players[prev.turn]);
      if (!isWin) {
        consumeActiveMole(next.players[prev.turn]);
        advanceTurn(next);
      }
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, isWin ? 'finished' : 'playing', isWin ? session?.user?.id : undefined);
      if (isWin) setTimeout(() => handleWinRef.current(prev.turn, false, '', next), 400);
      return next;
    });
    setTimeout(() => setAnimating(false), 350);
  }, [mode, onlineGameId, session]);

  const executeWall = useCallback((r: number, c: number, orient: 'h' | 'v') => {
    setAnimating(true);
    setGameState(prev => {
      const next = cloneS(prev);
      next.lastMoveTime = Date.now();
      next.walls.push({ r, c, orient });
      next.players[prev.turn].walls--;
      consumeActiveMole(next.players[prev.turn]);
      advanceTurn(next);
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, 'playing');
      return next;
    });
    setTimeout(() => setAnimating(false), 350);
  }, [mode, onlineGameId]);

  const executeDig = useCallback(() => {
    setAnimating(true);
    setGameState(prev => {
      const next = cloneS(prev);
      const p = next.players[next.turn];
      const tIdx = next.treasures?.findIndex(t => t.r === p.r && t.c === p.c);
      if (tIdx !== undefined && tIdx !== -1) {
        next.treasures!.splice(tIdx, 1);
        const SKILLS: SkillType[] = ['TELEPORT', 'HAMMER', 'SKIP', 'MOLE', 'DYNAMITE', 'SHIELD', 'WALLS', 'MAGNET', 'TRAP', 'SWAP'];
        const found = SKILLS[Math.floor(Math.random() * SKILLS.length)];
        if (!p.inventory) p.inventory = [];
        if (p.inventory.length < 2) { p.inventory.push(found); setStatusMsg(`Találtál: ${found}`); }
        else setStatusMsg(`Találtál (${found}), de tele az inventory!`);
      }
      consumeActiveMole(next.players[prev.turn]);
      advanceTurn(next);
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, 'playing');
      return next;
    });
    setTimeout(() => setAnimating(false), 350);
  }, [mode, onlineGameId]);

  const executeSkill = useCallback((skill: SkillType, target?: { r: number; c: number }) => {
    let skillApplyFailed = false;
    setAnimating(true);
    setGameState(prev => {
      const res = applySkill(prev, skill, target);
      if (res.applied === false) {
        skillApplyFailed = true;
        return prev;
      }
      const next = res.state;
      if (skill === 'TELEPORT' || skill === 'SWAP' || skill === 'MAGNET') {
        for (let pi = 0; pi < next.players.length; pi++) {
          const pawn = next.players[pi];
          const ti = next.traps?.findIndex(t => t.r === pawn.r && t.c === pawn.c && trapAffectsVictim(next, t.owner, pi));
          if (ti !== undefined && ti !== -1) {
            const hitR = pawn.r;
            const hitC = pawn.c;
            next.traps!.splice(ti, 1);
            const sp = PLAYER_START[pi] ?? PLAYER_START[0];
            pawn.r = sp.r;
            pawn.c = sp.c;
            setStatusMsg(pi === prev.turn ? 'Csapdába léptél!' : 'Játékos csapdába lépett — startmező.');
            queueMicrotask(() => setTrapHitFlash({ r: hitR, c: hitC }));
          }
        }
      }
      const winnerIdx = next.players.findIndex((p) => hasWon(p));
      const isWin = winnerIdx !== -1;
      if (!isWin) {
        if (skill !== 'MOLE') consumeActiveMole(next.players[prev.turn]);
        advanceTurn(next);
      }
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, isWin ? 'finished' : 'playing', isWin ? session?.user?.id : undefined);
      if (isWin) setTimeout(() => handleWinRef.current(winnerIdx, false, '', next), 400);
      return next;
    });
    if (skillApplyFailed) {
      setAnimating(false);
      if (skill === 'TRAP') setStatusMsg('Oda nem helyezhetsz csapdát (foglalt mező vagy már van ott csapda).');
      return;
    }
    setTargetingSkill(null);
    setTimeout(() => setAnimating(false), 350);
  }, [mode, onlineGameId, session]);

  const handleCreateOnlineGame = async () => {
    if (!session) return;
    setAuthLoading(true);
    // Cancel any stale waiting games before creating a new one
    await cancelMyWaitingGames(session.user.id);
    const state: GameState = { ...initState(mode === 'treasure-online', maxPlayers), pendingTeamLayout: 'ffa' };
    const { data, error } = await createGame(session.user.id, state, maxPlayers);
    setAuthLoading(false);
    if (data) {
      setOnlineGameId(data.id);
      setOnlineRole(0);
      setGameState(state);
      setHostedGameData(data);
    } else if (error) alert('Hiba a játék létrehozásakor: ' + error.message);
  };

  const handleJoinOnlineGame = async (gameId: string, state: any, p1Id: string, slotIndex: 1 | 2 | 3) => {
    if (!session) return;
    if (p1Id === session.user.id) { alert('Nem csatlakozhatsz a saját játékodhoz!'); return; }
    setAuthLoading(true);
    const { data, error } = await joinGame(gameId, session.user.id, slotIndex);
    if (data) {
      setOnlineGameId(gameId);
      setOnlineRole(slotIndex);
      setGameState(state);
      setHostedGameData(data);
      const pl = data.state?.pendingTeamLayout as OnlineTeamLayoutId | undefined;
      if (pl) setOnlineTeamLayout(pl);
      // Stay in lobby; subscription will move to game when host starts
    } else if (error) alert('Hiba a csatlakozáskor: ' + error.message);
    setAuthLoading(false);
  };

  const handleStartOnlineGame = async () => {
    if (!onlineGameId || onlineRole !== 0) return;
    const g = hostedGameData;
    const lobbyCap = Math.min(4, Math.max(2, g?.max_players ?? maxPlayers));
    const n = countFilledOnlineSlots(g, lobbyCap, botSlots);
    if (n < 2) return;
    const treasure = Boolean(g?.state?.treasureMode ?? mode === 'treasure-online');
    const loadout =
      skillLoadoutRef.current.length > 0 ? [...skillLoadoutRef.current].slice(0, 3) : undefined;
    const layout = (g?.state?.pendingTeamLayout as OnlineTeamLayoutId) ?? onlineTeamLayout;
    const teams = teamsForOnlineLayout(layout, n);
    let newState = initState(treasure, n, loadout, teams);
    const bots = filterBotSlotsForPlayerCount(botSlots, n);
    if (bots.length > 0) newState = { ...newState, botPlayers: bots };
    setGameState(newState);
    setMaxPlayers(n);
    await updateGameState(onlineGameId, newState, 'playing', undefined, { max_players: n });
  };

  const handleLeaveOnlineGame = useCallback(async () => {
    if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
    // Only cancel (remove from DB) when leaving the lobby; in-game leave lets
    // remaining players continue with bots driven by the new lowest-role human.
    if (onlineGameId && onlineRole === 0 && viewRef.current === 'lobby') await cancelGame(onlineGameId);
    setOnlineGameId(null); setHostedGameData(null); setBotSlots([]); setOnlineTeamLayout('ffa'); setView('menu');
  }, [onlineGameId, onlineRole]);

  const handleRejoinGame = useCallback(async (game: any) => {
    if (!session) return;
    const myRole = game.player1_id === session.user.id ? 0
      : game.player2_id === session.user.id ? 1
      : game.player3_id === session.user.id ? 2
      : 3;
    setMode(game.state?.treasureMode ? 'treasure-online' : 'online');
    setOnlineGameId(game.id);
    setOnlineRole(myRole);
    setGameState(game.state);
    setMaxPlayers(game.max_players ?? game.state?.playerCount ?? game.state?.players?.length ?? 2);
    setRejoinCandidate(null);
    await loadPlayerProfiles(game, session.user.id);
    setView('game');
  }, [session]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0704] flex items-center justify-center text-[#f0c866] font-['Cinzel',serif] text-2xl tracking-widest">
        Betöltés...
      </div>
    );
  }

  const teamModeOnlineWin =
    showWin &&
    isOnlineMode(mode) &&
    Array.isArray(gameState.teams) &&
    gameState.teams.length === gameState.players.length &&
    gameState.players.length >= 3;
  const iWonOnline = isOnlineMode(mode) && viewerSharesWin(gameState.teams, winnerIdx, onlineRole, gameState.players.length);

  return (
    <div className="min-h-screen text-[#f5e6d3] font-['Outfit',sans-serif] overflow-hidden flex flex-col items-center">
      <ThreeBackground />
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center">

        {view !== 'auth' && view !== 'tos' && view !== 'privacy' && (
          <div className="w-full max-w-4xl p-4 flex justify-between items-center bg-[#1a0f08]/80 backdrop-blur-md border-b border-[#f0c866]/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#241810] border border-[#f0c866]/40 flex items-center justify-center">
                <User className="text-[#f0c866]" size={20} />
              </div>
              <div>
                <div className="font-bold text-sm tracking-widest uppercase">{profile.username}</div>
                <div className="text-xs text-[#a89078]">Lvl {profile.level} • {profile.xp} XP</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setView('leaderboard')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#241810] border border-[#f0c866]/30 hover:bg-[#f0c866]/10 transition-colors text-sm uppercase tracking-wider">
                <Trophy size={16} className="text-[#f0c866]" />
                <span className="hidden sm:inline">Statisztika</span>
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#241810] border border-red-500/30 hover:bg-red-500/10 transition-colors text-sm uppercase tracking-wider text-red-400" title="Kijelentkezés">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        <SessionWarning />

        {/* Rejoin banner — shown on menu when an active game is detected */}
        {view === 'menu' && rejoinCandidate && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-2xl px-4 pt-4"
          >
            <div className="bg-[#1a0f08] border border-[#f0c866]/50 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(240,200,102,0.1)]">
              <div className="flex-1">
                <div className="font-bold text-[#f0c866] text-sm">Aktív játék található!</div>
                <div className="text-xs text-[#a89078] mt-0.5">2 percen belül visszaléphetsz a folyamatban lévő meccsre.</div>
              </div>
              <button
                onClick={() => handleRejoinGame(rejoinCandidate)}
                className="bg-[#f0c866] text-[#1a0f08] font-bold px-4 py-2 rounded-lg text-sm uppercase tracking-wider hover:bg-[#f4d488] transition-colors shrink-0"
              >
                Visszalépés
              </button>
              <button onClick={() => setRejoinCandidate(null)} className="text-[#a89078] hover:text-white transition-colors text-xs uppercase tracking-wider shrink-0">
                Elvet
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <AuthView
              key="auth"
              usernameInput={usernameInput}
              onUsernameChange={v => { setUsernameInput(v); setGuestAuthError(''); }}
              onGuestLogin={handleGuestLogin}
              guestSigningIn={guestSigningIn}
              guestAuthError={guestAuthError}
              onMagicLink={email => signInWithMagicLink(email)}
              isSupabaseConfigured={isSupabaseConfigured}
              onTos={() => { setLegalReturnView('auth'); setView('tos'); }}
              onPrivacy={() => { setLegalReturnView('auth'); setView('privacy'); }}
              onAuthTabChange={() => setGuestAuthError('')}
            />
          )}
          {view === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12 flex justify-center">
              <Rules onBack={() => setView('menu')} />
            </motion.div>
          )}
          {view === 'tos' && (
            <motion.div key="tos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12">
              <TOS onBack={() => setView(legalReturnView)} />
            </motion.div>
          )}
          {view === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12">
              <PrivacyPolicy onBack={() => setView(legalReturnView)} />
            </motion.div>
          )}
          {view === 'menu' && (
            <MenuView key="menu" onStartGame={startGame} onRules={() => setView('rules')} onStore={() => setView('store')} />
          )}
          {view === 'lobby' && (
            <LobbyView key="lobby" mode={mode} onlineGameId={onlineGameId} onlineRole={onlineRole} maxPlayers={maxPlayers} onMaxPlayersChange={handleMaxPlayersChange} teamLayout={onlineTeamLayout} onTeamLayoutChange={handleOnlineTeamLayoutChange} waitingGames={waitingGames} lobbyUsers={lobbyUsers} sessionUserId={session?.user.id} hostedGameData={hostedGameData} botSlots={botSlots} slotNames={lobbySlotNames} onToggleBot={idx => setBotSlots(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])} onBack={handleLeaveOnlineGame} onCreateGame={handleCreateOnlineGame} onStartGame={handleStartOnlineGame} onJoinGame={handleJoinOnlineGame} />
          )}
          {view === 'game' && (
            <GameView
              key="game"
              gameState={gameState}
              mode={mode}
              wallMode={wallMode}
              wallOrient={wallOrient}
              animating={animating}
              statusMsg={statusMsg}
              targetingSkill={targetingSkill}
              timeLeft={timeLeft}
              onlineRole={onlineRole}
              profile={profile}
              playerProfiles={playerProfiles}
              boardViewerIndex={isOnlineMode(mode) ? onlineRole : isAIMode(mode) ? 0 : null}
              trapHitFlash={trapHitFlash}
              onToggleWallMode={() => setWallMode(w => !w)}
              onToggleWallOrient={() => setWallOrient(o => o === 'h' ? 'v' : 'h')}
              onMove={executeMove}
              onWallPlace={executeWall}
              onSkillTarget={(r, c) => executeSkill(targetingSkill!, { r, c })}
              onSetTargetingSkill={setTargetingSkill}
              onExecuteSkill={executeSkill}
              onDig={executeDig}
              onNewGame={() => startGame(mode)}
              onMenu={() => {
                setShowWin(false);
                if (isOnlineMode(mode) && onlineGameId) handleLeaveOnlineGame();
                else setView('menu');
              }}
              easterEgg={activeEgg}
              onEasterEggCollect={collect}
            />
          )}
          {view === 'leaderboard' && (
            <LeaderboardView
              key="leaderboard"
              profile={profile}
              leaderboardData={leaderboardData}
              tab={leaderboardTab}
              onTabChange={setLeaderboardTab}
              onBack={() => setView('menu')}
              isSupabaseConfigured={isSupabaseConfigured}
              isAnonymous={session?.user?.is_anonymous ?? true}
              userEmail={session?.user?.email}
              onUsernameUpdate={async (username) => {
                await updateDbProfile(session!.user.id, { username });
                setProfile(p => ({ ...p, username }));
              }}
              onUpgradeAccount={email => upgradeAnonymousAccount(email)}
              onMarketingOptOutChange={handleMarketingOptOutChange}
              onOpenTos={() => { setLegalReturnView('leaderboard'); setView('tos'); }}
              onOpenPrivacy={() => { setLegalReturnView('leaderboard'); setView('privacy'); }}
            />
          )}
          {view === 'store' && (
            <StoreView
              key="store"
              profile={profile}
              onBack={() => setView('menu')}
              onSaveLoadout={handleSaveLoadout}
              onPurchaseSkill={handlePurchaseSkill}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0f08] border border-[#f0c866]/40 p-10 rounded-2xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(240,200,102,0.15)]">
                <Trophy className="w-20 h-20 text-[#f0c866] mx-auto mb-6 drop-shadow-[0_0_15px_rgba(240,200,102,0.5)]" />
                <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866] tracking-widest mb-2">
                  {isOnlineMode(mode)
                    ? teamModeOnlineWin
                      ? (iWonOnline ? 'A csapatod győzött!' : 'A másik csapat győzött!')
                      : (iWonOnline ? 'Nyertél!' : 'Vesztettél!')
                    : (`Játékos ${winnerIdx + 1}` + (winnerIdx === 1 && isAIMode(mode) ? ' (Gép)' : '')) + ' Nyert!'}
                </h2>
                {winReason && <p className="text-red-400 font-bold mb-2 uppercase tracking-wider">{winReason}</p>}
                <p className="text-[#a89078] mb-8">
                  {isAIMode(mode) && (winnerIdx === 0 ? '+50 XP megszerve!' : '+10 XP a részvételért.')}
                  {(mode === 'pvp' || mode === 'treasure-pvp') && '+20 XP megszerve!'}
                  {isOnlineMode(mode) && (iWonOnline ? '+50 XP megszerve!' : '+10 XP a részvételért.')}
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => startGame(mode)} className="bg-[#f0c866] text-[#1a0f08] font-bold py-3 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors">Újra</button>
                  <button
                    onClick={() => {
                      setShowWin(false);
                      if (isOnlineMode(mode)) resetOnlineSessionAfterMatch();
                      setView('menu');
                    }}
                    className="bg-transparent border border-[#f0c866]/30 text-[#f0c866] font-bold py-3 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f0c866]/10 transition-colors"
                  >
                    Menü
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
