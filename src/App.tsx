import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ThreeBackground } from './components/ThreeBackground';
import { GameState, initState, mmRoot, greedyBotMove, SkillType, cloneS, applySkill, advanceTurn, hasWon } from './game/logic';
import {
  getLocalProfile, saveLocalProfile, Profile, calculateLevel,
  supabase, isSupabaseConfigured, signInAnonymously, getDbProfile, updateDbProfile,
  createGame, joinGame, startOnlineGame, cancelGame, getActiveGame, updateGameState, getUsernameByFingerprint, getLeaderboard, awardXp,
} from './lib/supabase';
import { getDeviceFingerprint } from './lib/fingerprint';
import { TOS, PrivacyPolicy } from './components/LegalDocs';
import { Rules } from './components/Rules';
import { Trophy, User, LogOut } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { GameMode, View, isOnlineMode, isTreasureMode, isAIMode } from './lib/types';
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
  const [showWin, setShowWin] = useState(false);
  const [winReason, setWinReason] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [profile, setProfile] = useState<Profile>(getLocalProfile());

  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlineRole, setOnlineRole] = useState(0);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [hostedGameData, setHostedGameData] = useState<any | null>(null);
  const [botSlots, setBotSlots] = useState<number[]>([]);
  const [rejoinCandidate, setRejoinCandidate] = useState<any | null>(null);
  const [waitingGames, setWaitingGames] = useState<any[]>([]);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [lobbyUsers, setLobbyUsers] = useState<Set<string>>(new Set());

  const [leaderboardTab, setLeaderboardTab] = useState<'personal' | 'online'>('personal');
  const [leaderboardData, setLeaderboardData] = useState<Profile[]>([]);

  const gameStateRef = useRef(gameState);
  const viewRef = useRef(view);
  const showWinRef = useRef(showWin);
  const hostedGameDataRef = useRef(hostedGameData);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => { showWinRef.current = showWin; }, [showWin]);
  useEffect(() => { hostedGameDataRef.current = hostedGameData; }, [hostedGameData]);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); setView('menu'); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) { loadProfile(session.user.id); checkActiveGame(session.user.id); setView('menu'); }
      else setView('auth');
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) { loadProfile(session.user.id); checkActiveGame(session.user.id); setView(prev => prev === 'auth' ? 'menu' : prev); }
      else setView('auth');
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
    const dbProfile = await getDbProfile(userId);
    if (dbProfile) setProfile(dbProfile);
  };

  const checkActiveGame = async (userId: string) => {
    const game = await getActiveGame(userId);
    if (game) setRejoinCandidate(game);
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    if (!isSupabaseConfigured) { setView('menu'); setAuthLoading(false); return; }
    const { error } = await signInAnonymously(usernameInput.trim() || undefined, getDeviceFingerprint());
    if (error) alert('Hiba a bejelentkezés során: ' + error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setProfile(getLocalProfile());
    setShowWin(false);
    setView('auth');
  };

  const handleWin = useCallback((winnerIndex: number, _fromRealtime = false, reason = '') => {
    setShowWin(true);
    setGameState(prev => ({ ...prev, gameOver: true }));
    setWinReason(reason);
    setProfile(p => {
      const won = isOnlineMode(mode) ? winnerIndex === onlineRole : winnerIndex === 0;
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
        }).catch(() => {
          updateDbProfile(session!.user.id, { wins: newP.wins, losses: newP.losses, xp: newP.xp, level: newP.level });
        });
      }
      return newP;
    });
  }, [mode, session, onlineRole]);

  useEffect(() => {
    if (!isOnlineMode(mode) || !onlineGameId || !isSupabaseConfigured || !session) return;
    const channel = supabase.channel(`game-${onlineGameId}`, { config: { presence: { key: session.user.id } } });
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${onlineGameId}` }, async (payload) => {
        const g = payload.new;
        // Always update hosted game data so slot UI stays current
        setHostedGameData(g);
        if (g.status === 'playing' && viewRef.current === 'lobby') {
          // Load first available opponent profile
          const opponentIds = [g.player2_id, g.player3_id, g.player4_id].filter(Boolean);
          if (opponentIds.length > 0) {
            const opp = await getDbProfile(opponentIds[0]);
            if (opp) setOpponent(opp);
          }
          setGameState(g.state);
          setView('game');
        } else if (g.status === 'playing' || g.status === 'waiting') {
          // Non-lobby update: just sync state
          if (g.state && viewRef.current === 'game') setGameState(g.state);
        }
        if (g.status === 'finished' && !showWinRef.current) {
          const isWinner = g.winner_id === session.user.id;
          handleWin(isWinner ? onlineRole : (onlineRole === 0 ? 1 : 0), true);
        }
        if (g.status === 'abandoned' && !showWinRef.current) {
          setGameState(prev => ({ ...prev, gameOver: true }));
          setWinReason('Játék lezárva — inaktivitás miatt.');
          setShowWin(true);
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== session.user.id && disconnectTimerRef.current) {
          clearTimeout(disconnectTimerRef.current);
          disconnectTimerRef.current = null;
          setStatusMsg('Ellenfél visszacsatlakozott!');
          setTimeout(() => setStatusMsg(''), 2500);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
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
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() }); });
    return () => { supabase.removeChannel(channel); };
  }, [mode, onlineGameId, session, onlineRole, handleWin]);

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
      if (!g) return;
      const humanFilled = [g.player1_id, g.player2_id, g.player3_id, g.player4_id].filter(Boolean).length;
      const totalFilled = humanFilled + botSlots.length;
      if (totalFilled >= 2) await handleStartOnlineGame();
    }, AUTO_START_MS);
    return () => clearTimeout(timer);
  }, [onlineGameId, onlineRole]);

  // Bot AI effect: host drives bot players in online multiplayer
  useEffect(() => {
    if (view !== 'game' || !isOnlineMode(mode) || onlineRole !== 0 || gameState.gameOver || animating) return;
    const botPi = gameState.turn;
    if (!gameState.botPlayers?.includes(botPi)) return;
    setStatusMsg('Bot gondolkodik...');
    const timer = setTimeout(() => {
      const move = greedyBotMove(gameState, botPi);
      setStatusMsg('');
      if (move.type === 'move') executeMove(move.r, move.c);
      else executeWall(move.r, move.c, move.orient);
    }, 600);
    return () => clearTimeout(timer);
  }, [view, mode, gameState, animating, onlineRole]);

  useEffect(() => {
    if (view !== 'game' || !isAIMode(mode) || gameState.turn !== 1 || gameState.gameOver || animating) return;
    setStatusMsg('A gép gondolkodik...');
    const depth = aiDifficulty === 'easy' ? 1 : aiDifficulty === 'medium' ? 2 : 3;
    const timer = setTimeout(() => {
      const move = mmRoot(gameState, depth);
      setStatusMsg('');
      if (move.type === 'move') executeMove(move.r, move.c);
      else executeWall(move.r, move.c, move.orient);
    }, 500);
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

  useEffect(() => {
    if (view !== 'game' || gameState.gameOver || !gameState.lastMoveTime) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, 120 - Math.floor((Date.now() - gameState.lastMoveTime!) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !gameState.gameOver) {
        const winner = 1 - gameState.turn;
        if (isOnlineMode(mode) && onlineGameId && onlineRole === winner) {
          updateGameState(onlineGameId, { ...gameState, gameOver: true }, 'finished', session?.user?.id);
        }
        handleWin(winner, false, 'Időtúllépés miatt!');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [view, gameState, mode, onlineGameId, onlineRole, session, handleWin]);

  const startGame = useCallback((selectedMode: GameMode, difficulty?: 'easy' | 'medium' | 'hard') => {
    if (isOnlineMode(selectedMode) && onlineGameId) {
      alert('Már bent vagy egy online játékban! Előbb lépj ki belőle.');
      return;
    }
    setShowWin(false); setWinReason(''); setStatusMsg(''); setTargetingSkill(null);
    if (difficulty) setAiDifficulty(difficulty);
    if (isOnlineMode(selectedMode)) {
      setMode(selectedMode); setView('lobby'); setOnlineGameId(null); setOpponent(null); setBotSlots([]); setHostedGameData(null); return;
    }
    setMode(selectedMode);
    setGameState(initState(isTreasureMode(selectedMode)));
    setWallMode(false); setWallOrient('h'); setAnimating(false); setTimeLeft(120);
    setView('game');
  }, []);

  const executeMove = useCallback((r: number, c: number) => {
    setAnimating(true);
    setGameState(prev => {
      const next = cloneS(prev);
      next.lastMoveTime = Date.now();
      next.players[prev.turn].r = r;
      next.players[prev.turn].c = c;
      const trapIdx = next.traps?.findIndex(t => t.r === r && t.c === c && t.owner !== prev.turn);
      if (trapIdx !== undefined && trapIdx !== -1) {
        next.traps!.splice(trapIdx, 1);
        next.players[prev.turn].r = prev.turn === 0 ? 0 : 8;
        next.players[prev.turn].c = 4;
        setStatusMsg('Csapdába léptél! Vissza a startvonalra.');
      }
      const isWin = hasWon(next.players[prev.turn]);
      if (!isWin) advanceTurn(next);
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, isWin ? 'finished' : 'playing', isWin ? session?.user?.id : undefined);
      if (isWin) setTimeout(() => handleWin(prev.turn), 400);
      return next;
    });
    setTimeout(() => setAnimating(false), 350);
  }, [handleWin, mode, onlineGameId, session]);

  const executeWall = useCallback((r: number, c: number, orient: 'h' | 'v') => {
    setAnimating(true);
    setGameState(prev => {
      const next = cloneS(prev);
      next.lastMoveTime = Date.now();
      next.walls.push({ r, c, orient });
      next.players[prev.turn].walls--;
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
      advanceTurn(next);
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, 'playing');
      return next;
    });
    setTimeout(() => setAnimating(false), 350);
  }, [mode, onlineGameId]);

  const executeSkill = useCallback((skill: SkillType, target?: { r: number; c: number }) => {
    setAnimating(true);
    setGameState(prev => {
      const next = applySkill(prev, skill, target);
      if (skill === 'TELEPORT' || skill === 'SWAP') {
        const p = next.players[prev.turn];
        const ti = next.traps?.findIndex(t => t.r === p.r && t.c === p.c && t.owner !== prev.turn);
        if (ti !== undefined && ti !== -1) { next.traps!.splice(ti, 1); p.r = prev.turn === 0 ? 0 : 8; p.c = 4; setStatusMsg('Csapdába léptél!'); }
      }
      if (skill === 'SWAP' || skill === 'MAGNET') {
        const o = next.players[1 - prev.turn];
        const oi = next.traps?.findIndex(t => t.r === o.r && t.c === o.c && t.owner !== (1 - prev.turn));
        if (oi !== undefined && oi !== -1) { next.traps!.splice(oi, 1); o.r = (1 - prev.turn) === 0 ? 0 : 8; o.c = 4; setStatusMsg('Az ellenfél csapdába lépett!'); }
      }
      const winnerIdx = next.players.findIndex((p) => hasWon(p));
      const isWin = winnerIdx !== -1;
      if (!isWin) advanceTurn(next);
      if (isOnlineMode(mode) && onlineGameId) updateGameState(onlineGameId, next, isWin ? 'finished' : 'playing', isWin ? session?.user?.id : undefined);
      if (isWin) setTimeout(() => handleWin(winnerIdx), 400);
      return next;
    });
    setTargetingSkill(null);
    setTimeout(() => setAnimating(false), 350);
  }, [handleWin, mode, onlineGameId, session]);

  const handleCreateOnlineGame = async () => {
    if (!session) return;
    setAuthLoading(true);
    const state = initState(mode === 'treasure-online', maxPlayers);
    const { data, error } = await createGame(session.user.id, state, maxPlayers);
    setAuthLoading(false);
    if (data) {
      setOnlineGameId(data.id);
      setOnlineRole(0);
      setGameState(state);
      setOpponent(null);
      setHostedGameData(data);
    } else if (error) alert('Hiba a játék létrehozásakor: ' + error.message);
  };

  const handleJoinOnlineGame = async (gameId: string, state: any, p1Id: string, slotIndex: 1 | 2 | 3) => {
    if (!session) return;
    if (p1Id === session.user.id) { alert('Nem csatlakozhatsz a saját játékodhoz!'); return; }
    setAuthLoading(true);
    const { data, error } = await joinGame(gameId, session.user.id, slotIndex);
    if (data) {
      const opp = await getDbProfile(p1Id);
      if (opp) setOpponent(opp);
      setOnlineGameId(gameId);
      setOnlineRole(slotIndex);
      setGameState(state);
      setHostedGameData(data);
      // Stay in lobby; subscription will move to game when host starts
    } else if (error) alert('Hiba a csatlakozáskor: ' + error.message);
    setAuthLoading(false);
  };

  const handleStartOnlineGame = async () => {
    if (!onlineGameId || onlineRole !== 0) return;
    const stateWithBots = { ...gameState, botPlayers: botSlots.length > 0 ? botSlots : undefined };
    await updateGameState(onlineGameId, stateWithBots, 'playing');
  };

  const handleLeaveOnlineGame = useCallback(async () => {
    if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
    if (onlineGameId && onlineRole === 0) await cancelGame(onlineGameId);
    setOnlineGameId(null); setHostedGameData(null); setBotSlots([]); setView('menu');
  }, [onlineGameId, onlineRole]);

  const handleRejoinGame = useCallback((game: any) => {
    if (!session) return;
    const myRole = game.player1_id === session.user.id ? 0
      : game.player2_id === session.user.id ? 1
      : game.player3_id === session.user.id ? 2
      : 3;
    setMode(game.state?.treasureMode ? 'treasure-online' : 'online');
    setOnlineGameId(game.id);
    setOnlineRole(myRole);
    setGameState(game.state);
    setRejoinCandidate(null);
    setView('game');
  }, [session]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d0704] flex items-center justify-center text-[#f0c866] font-['Cinzel',serif] text-2xl tracking-widest">
        Betöltés...
      </div>
    );
  }

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
            <AuthView key="auth" usernameInput={usernameInput} onUsernameChange={setUsernameInput} onGuestLogin={handleGuestLogin} isSupabaseConfigured={isSupabaseConfigured} onTos={() => setView('tos')} onPrivacy={() => setView('privacy')} />
          )}
          {view === 'rules' && (
            <motion.div key="rules" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12 flex justify-center">
              <Rules onBack={() => setView('menu')} />
            </motion.div>
          )}
          {view === 'tos' && (
            <motion.div key="tos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12">
              <TOS onBack={() => setView('auth')} />
            </motion.div>
          )}
          {view === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full max-w-3xl p-6 py-12">
              <PrivacyPolicy onBack={() => setView('auth')} />
            </motion.div>
          )}
          {view === 'menu' && (
            <MenuView key="menu" onStartGame={startGame} onRules={() => setView('rules')} />
          )}
          {view === 'lobby' && (
            <LobbyView key="lobby" mode={mode} onlineGameId={onlineGameId} onlineRole={onlineRole} maxPlayers={maxPlayers} onMaxPlayersChange={setMaxPlayers} waitingGames={waitingGames} lobbyUsers={lobbyUsers} sessionUserId={session?.user.id} hostedGameData={hostedGameData} botSlots={botSlots} onToggleBot={idx => setBotSlots(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])} onBack={handleLeaveOnlineGame} onCreateGame={handleCreateOnlineGame} onStartGame={handleStartOnlineGame} onJoinGame={handleJoinOnlineGame} />
          )}
          {view === 'game' && (
            <GameView key="game" gameState={gameState} mode={mode} wallMode={wallMode} wallOrient={wallOrient} animating={animating} statusMsg={statusMsg} targetingSkill={targetingSkill} timeLeft={timeLeft} onlineRole={onlineRole} profile={profile} opponent={opponent} onToggleWallMode={() => setWallMode(w => !w)} onToggleWallOrient={() => setWallOrient(o => o === 'h' ? 'v' : 'h')} onMove={executeMove} onWallPlace={executeWall} onSkillTarget={(r, c) => executeSkill(targetingSkill!, { r, c })} onSetTargetingSkill={setTargetingSkill} onExecuteSkill={executeSkill} onDig={executeDig} onNewGame={() => startGame(mode)} onMenu={() => { setShowWin(false); if (isOnlineMode(mode) && onlineGameId) handleLeaveOnlineGame(); else setView('menu'); }} />
          )}
          {view === 'leaderboard' && (
            <LeaderboardView key="leaderboard" profile={profile} leaderboardData={leaderboardData} tab={leaderboardTab} onTabChange={setLeaderboardTab} onBack={() => setView('menu')} isSupabaseConfigured={isSupabaseConfigured} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showWin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-[#1a0f08] border border-[#f0c866]/40 p-10 rounded-2xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(240,200,102,0.15)]">
                <Trophy className="w-20 h-20 text-[#f0c866] mx-auto mb-6 drop-shadow-[0_0_15px_rgba(240,200,102,0.5)]" />
                <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866] tracking-widest mb-2">
                  {isOnlineMode(mode)
                    ? (gameState.turn === onlineRole ? 'Nyertél!' : 'Vesztettél!')
                    : (gameState.turn === 0 ? 'Játékos 1' : (isAIMode(mode) ? 'Gép (AI)' : 'Játékos 2')) + ' Nyert!'}
                </h2>
                {winReason && <p className="text-red-400 font-bold mb-2 uppercase tracking-wider">{winReason}</p>}
                <p className="text-[#a89078] mb-8">
                  {isAIMode(mode) && (gameState.turn === 0 ? '+50 XP megszerve!' : '+10 XP a részvételért.')}
                  {(mode === 'pvp' || mode === 'treasure-pvp') && '+20 XP megszerve!'}
                  {isOnlineMode(mode) && (gameState.turn === onlineRole ? '+50 XP megszerve!' : '+10 XP a részvételért.')}
                </p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => startGame(mode)} className="bg-[#f0c866] text-[#1a0f08] font-bold py-3 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors">Újra</button>
                  <button onClick={() => { setShowWin(false); setView('menu'); }} className="bg-transparent border border-[#f0c866]/30 text-[#f0c866] font-bold py-3 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f0c866]/10 transition-colors">Menü</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
