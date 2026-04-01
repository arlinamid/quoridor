import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThreeBackground } from './components/ThreeBackground';
import { QuoridorBoard } from './components/QuoridorBoard';
import { GameState, initState, mmRoot, Wall } from './game/logic';
import { getLocalProfile, saveLocalProfile, Profile, calculateLevel, supabase, isSupabaseConfigured, signInAnonymously, getDbProfile, updateDbProfile, createGame, joinGame, updateGameState, getUsernameByFingerprint, getLeaderboard } from './lib/supabase';
import { getDeviceFingerprint } from './lib/fingerprint';
import { TOS, PrivacyPolicy } from './components/LegalDocs';
import { Rules } from './components/Rules';
import { Trophy, User, LogOut, Play, Cpu, ArrowLeft, Globe, BookOpen } from 'lucide-react';
import { cn } from './lib/utils';
import { Session } from '@supabase/supabase-js';

type View = 'auth' | 'menu' | 'game' | 'leaderboard' | 'tos' | 'privacy' | 'lobby' | 'rules';
type GameMode = 'pvp' | 'ai' | 'online';

export default function App() {
  const [view, setView] = useState<View>('auth');
  const [mode, setMode] = useState<GameMode>('pvp');
  const [gameState, setGameState] = useState<GameState>(initState());
  const [wallMode, setWallMode] = useState(false);
  const [wallOrient, setWallOrient] = useState<'h' | 'v'>('h');
  const [animating, setAnimating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [profile, setProfile] = useState<Profile>(getLocalProfile());
  const [showWin, setShowWin] = useState(false);
  const [winReason, setWinReason] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(120);
  
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [usernameInput, setUsernameInput] = useState('');
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  const [onlineRole, setOnlineRole] = useState<number>(0);
  const [waitingGames, setWaitingGames] = useState<any[]>([]);
  const [opponent, setOpponent] = useState<Profile | null>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'personal' | 'online'>('personal');
  const [leaderboardData, setLeaderboardData] = useState<Profile[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthLoading(false);
      setView('menu');
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        setView('menu');
      } else {
        setView('auth');
      }
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile(session.user.id);
        setView(prev => (prev === 'auth' ? 'menu' : prev));
      } else {
        setView('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (view === 'auth' && isSupabaseConfigured) {
      const fp = getDeviceFingerprint();
      getUsernameByFingerprint(fp).then(username => {
        if (username && !usernameInput) {
          setUsernameInput(username);
        }
      });
    }
  }, [view, isSupabaseConfigured]);

  useEffect(() => {
    if (view === 'leaderboard' && leaderboardTab === 'online' && isSupabaseConfigured) {
      getLeaderboard().then(data => setLeaderboardData(data));
    }
  }, [view, leaderboardTab, isSupabaseConfigured]);

  const loadProfile = async (userId: string) => {
    const dbProfile = await getDbProfile(userId);
    if (dbProfile) {
      setProfile(dbProfile);
    }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    if (!isSupabaseConfigured) {
      setView('menu');
      setAuthLoading(false);
      return;
    }
    const fp = getDeviceFingerprint();
    const { error } = await signInAnonymously(usernameInput.trim() || undefined, fp);
    if (error) {
      console.error(error);
      alert('Hiba a bejelentkezés során: ' + error.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setProfile(getLocalProfile());
    setView('auth');
  };

  // Sync profile to local storage
  useEffect(() => {
    saveLocalProfile(profile);
  }, [profile]);

  // Online Multiplayer Sync
  useEffect(() => {
    if (mode !== 'online' || !onlineGameId || !isSupabaseConfigured) return;

    const channel = supabase.channel(`game-${onlineGameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${onlineGameId}` }, async (payload) => {
        const newGame = payload.new;
        setGameState(newGame.state);

        if (newGame.status === 'playing' && view === 'lobby') {
          if (newGame.player2_id) {
            const opp = await getDbProfile(newGame.player2_id);
            if (opp) setOpponent(opp);
          }
          setView('game');
        }

        if (newGame.status === 'finished' && !showWin) {
          const winnerIndex = newGame.winner_id === session?.user.id ? onlineRole : (1 - onlineRole);
          handleWin(winnerIndex, true);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mode, onlineGameId, view, showWin, session, onlineRole]);

  // Fetch waiting games for lobby
  useEffect(() => {
    if (view === 'lobby' && isSupabaseConfigured) {
      const fetchGames = async () => {
        const { data } = await supabase.from('games').select('*, player1:profiles!player1_id(username)').eq('status', 'waiting');
        if (data) setWaitingGames(data);
      };
      fetchGames();
      const interval = setInterval(fetchGames, 5000);
      return () => clearInterval(interval);
    }
  }, [view]);

  const handleCreateOnlineGame = async () => {
    if (!session) return;
    setAuthLoading(true);
    const state = initState();
    const { data, error } = await createGame(session.user.id, state);
    setAuthLoading(false);
    if (data) {
      setOnlineGameId(data.id);
      setOnlineRole(0);
      setMode('online');
      setGameState(state);
      setOpponent(null);
    } else if (error) {
      alert('Hiba a játék létrehozásakor: ' + error.message);
    }
  };

  const handleJoinOnlineGame = async (gameId: string, state: any, p1Id: string) => {
    if (!session) return;
    if (p1Id === session.user.id) {
      alert('Nem csatlakozhatsz a saját játékodhoz!');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await joinGame(gameId, session.user.id, state);
    if (data) {
      const opp = await getDbProfile(p1Id);
      if (opp) setOpponent(opp);
      setOnlineGameId(gameId);
      setOnlineRole(1);
      setMode('online');
      setGameState(state);
      setView('game');
    } else if (error) {
      alert('Hiba a csatlakozáskor: ' + error.message);
    }
    setAuthLoading(false);
  };

  const startGame = (selectedMode: GameMode) => {
    if (selectedMode === 'online') {
      setView('lobby');
      setOnlineGameId(null);
      setOpponent(null);
      return;
    }
    setMode(selectedMode);
    setGameState(initState());
    setWallMode(false);
    setWallOrient('h');
    setAnimating(false);
    setShowWin(false);
    setWinReason('');
    setStatusMsg('');
    setTimeLeft(120);
    setView('game');
  };

  const handleWin = useCallback((winnerIndex: number, fromRealtime = false, isTimeout = false) => {
    setShowWin(true);
    setGameState(prev => ({ ...prev, gameOver: true }));
    setWinReason(isTimeout ? 'Időtúllépés miatt!' : '');
    
    setProfile(p => {
      let newP = { ...p };
      if (mode === 'ai') {
        if (winnerIndex === 0) {
          newP = { ...p, wins: p.wins + 1, xp: p.xp + 50, level: calculateLevel(p.xp + 50) };
        } else {
          newP = { ...p, losses: p.losses + 1, xp: p.xp + 10, level: calculateLevel(p.xp + 10) };
        }
      } else if (mode === 'online') {
        if (winnerIndex === onlineRole) {
          newP = { ...p, wins: p.wins + 1, xp: p.xp + 50, level: calculateLevel(p.xp + 50) };
        } else {
          newP = { ...p, losses: p.losses + 1, xp: p.xp + 10, level: calculateLevel(p.xp + 10) };
        }
      } else {
        newP = { ...p, xp: p.xp + 20, level: calculateLevel(p.xp + 20) };
      }

      if (isSupabaseConfigured && session?.user?.id) {
        updateDbProfile(session.user.id, {
          wins: newP.wins,
          losses: newP.losses,
          xp: newP.xp,
          level: newP.level
        });
      }
      return newP;
    });
  }, [mode, session, onlineRole]);

  const executeMove = useCallback((r: number, c: number) => {
    setAnimating(true);
    setGameState(prev => {
      const next = { ...prev, players: [...prev.players], lastMoveTime: Date.now() };
      next.players[prev.turn] = { ...next.players[prev.turn], r, c };
      
      let isWin = false;
      if (r === next.players[prev.turn].goalRow) {
        isWin = true;
      } else {
        next.turn = 1 - prev.turn;
      }

      if (mode === 'online' && onlineGameId) {
        updateGameState(onlineGameId, next, isWin ? 'finished' : 'playing', isWin ? session?.user?.id : undefined);
      }

      if (isWin) {
        setTimeout(() => handleWin(prev.turn), 400);
      }
      return next;
    });
    
    setTimeout(() => {
      setAnimating(false);
    }, 350);
  }, [handleWin, mode, onlineGameId, session]);

  const executeWall = useCallback((r: number, c: number, orient: 'h' | 'v') => {
    setAnimating(true);
    setGameState(prev => {
      const next = { ...prev, players: [...prev.players], walls: [...prev.walls], lastMoveTime: Date.now() };
      next.walls.push({ r, c, orient });
      next.players[prev.turn].walls--;
      next.turn = 1 - prev.turn;

      if (mode === 'online' && onlineGameId) {
        updateGameState(onlineGameId, next, 'playing');
      }

      return next;
    });
    
    setTimeout(() => {
      setAnimating(false);
    }, 350);
  }, [mode, onlineGameId]);

  // AI Turn Handling
  useEffect(() => {
    if (view === 'game' && mode === 'ai' && gameState.turn === 1 && !gameState.gameOver && !animating) {
      setStatusMsg('A gép gondolkodik...');
      const timer = setTimeout(() => {
        const move = mmRoot(gameState, 2);
        setStatusMsg('');
        if (move.type === 'move') {
          executeMove(move.r, move.c);
        } else {
          executeWall(move.r, move.c, move.orient);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [view, mode, gameState, animating, executeMove, executeWall]);

  // Timeout Handling
  useEffect(() => {
    if (view !== 'game' || gameState.gameOver || !gameState.lastMoveTime) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.lastMoveTime!) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0 && !gameState.gameOver) {
        const winnerIndex = 1 - gameState.turn;
        
        if (mode === 'online' && onlineGameId) {
          // Only the player who is waiting (the winner) should send the update to avoid race conditions
          if (onlineRole === winnerIndex) {
            updateGameState(onlineGameId, { ...gameState, gameOver: true }, 'finished', session?.user?.id);
          }
        }
        handleWin(winnerIndex, false, true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [view, gameState, mode, onlineGameId, onlineRole, session, handleWin]);

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
        
        {/* Header / Profile Bar */}
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
              <button 
                onClick={() => setView('leaderboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-[#241810] border border-[#f0c866]/30 hover:bg-[#f0c866]/10 transition-colors text-sm uppercase tracking-wider"
              >
                <Trophy size={16} className="text-[#f0c866]" />
                <span className="hidden sm:inline">Statisztika</span>
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#241810] border border-red-500/30 hover:bg-red-500/10 transition-colors text-sm uppercase tracking-wider text-red-400"
                title="Kijelentkezés"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'auth' && (
            <motion.div 
              key="auth"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center w-full max-w-md p-6"
            >
              <div className="text-center mb-10">
                <h1 className="font-['Cinzel',serif] text-5xl font-black tracking-[10px] text-[#f0c866] drop-shadow-[0_0_40px_rgba(240,200,102,0.35)]">
                  QUORIDOR
                </h1>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#f0c866] to-transparent mx-auto my-4" />
                <div className="text-sm text-[#a89078] tracking-[4px] uppercase">Jelentkezz be a játékhoz</div>
              </div>

              <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-[#a89078] uppercase tracking-wider">Felhasználónév (opcionális)</label>
                  <input
                    type="text"
                    placeholder="Pl. SakkMester99"
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    maxLength={15}
                    className="w-full bg-[#241810] border border-[#f0c866]/30 rounded-lg px-4 py-3 text-[#f5e6d3] focus:outline-none focus:border-[#f0c866] transition-colors"
                  />
                </div>

                <button 
                  onClick={handleGuestLogin}
                  className="w-full relative overflow-hidden bg-[#241810] border border-[#f0c866]/50 text-[#f0c866] font-bold py-4 px-6 rounded-lg tracking-wider transition-all hover:bg-[#f0c866]/10 hover:border-[#f0c866] hover:shadow-[0_0_20px_rgba(240,200,102,0.2)] flex items-center justify-center gap-3"
                >
                  <User size={20} />
                  Játssz Vendégként (Anonim)
                </button>

                {!isSupabaseConfigured && (
                  <div className="text-xs text-center text-amber-500/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
                    A Supabase nincs konfigurálva. A játék lokális módban indul.
                  </div>
                )}

                <div className="text-center text-xs text-[#a89078] mt-4 flex flex-col gap-2">
                  <p>A játék használatával elfogadod a feltételeket.</p>
                  <div className="flex justify-center gap-4">
                    <button onClick={() => setView('tos')} className="hover:text-[#f0c866] underline decoration-white/20 underline-offset-4 transition-colors">ÁSZF</button>
                    <button onClick={() => setView('privacy')} className="hover:text-[#f0c866] underline decoration-white/20 underline-offset-4 transition-colors">Adatvédelem</button>
                  </div>
                </div>
              </div>
            </motion.div>
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
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center w-full max-w-md p-6"
            >
              <div className="text-center mb-12">
                <h1 className="font-['Cinzel',serif] text-5xl md:text-7xl font-black tracking-[12px] text-[#f0c866] drop-shadow-[0_0_40px_rgba(240,200,102,0.35)]">
                  QUORIDOR
                </h1>
                <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#f0c866] to-transparent mx-auto my-4" />
                <div className="text-sm text-[#a89078] tracking-[6px] uppercase">Falsakk &mdash; A Stratégia Játéka</div>
              </div>

              <div className="flex flex-col gap-4 w-full">
                <button 
                  onClick={() => startGame('pvp')}
                  className="group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#f0c866]/35 text-[#f0c866] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#f0c866] hover:shadow-[0_0_40px_rgba(240,200,102,0.2),inset_0_0_30px_rgba(240,200,102,0.05)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f0c866]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3">
                    <User size={18} /> 1 vs 1 <User size={18} />
                  </span>
                </button>
                <button 
                  onClick={() => startGame('ai')}
                  className="group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#f0c866]/35 text-[#f0c866] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#f0c866] hover:shadow-[0_0_40px_rgba(240,200,102,0.2),inset_0_0_30px_rgba(240,200,102,0.05)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f0c866]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3">
                    <User size={18} /> 1 vs Gép <Cpu size={18} />
                  </span>
                </button>
                <button 
                  onClick={() => startGame('online')}
                  className="group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#f0c866]/35 text-[#f0c866] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#f0c866] hover:shadow-[0_0_40px_rgba(240,200,102,0.2),inset_0_0_30px_rgba(240,200,102,0.05)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f0c866]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3">
                    <Globe size={18} /> Online Multiplayer <Globe size={18} />
                  </span>
                </button>
                <button 
                  onClick={() => setView('rules')}
                  className="group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#f0c866]/35 text-[#f0c866] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#f0c866] hover:shadow-[0_0_40px_rgba(240,200,102,0.2),inset_0_0_30px_rgba(240,200,102,0.05)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#f0c866]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center justify-center gap-3">
                    <BookOpen size={18} /> Szabályok <BookOpen size={18} />
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {view === 'lobby' && (
            <motion.div 
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center w-full max-w-2xl p-6 mt-10"
            >
              <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <button onClick={() => setView('menu')} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase">
                    Online Játékok
                  </h2>
                </div>

                {onlineGameId ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-[#f0c866]/20 border-t-[#f0c866] rounded-full animate-spin mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-[#f0c866] tracking-wider uppercase mb-2">Várakozás az ellenfélre...</h3>
                    <p className="text-[#a89078]">A játék automatikusan elindul, amint valaki csatlakozik.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <button 
                      onClick={handleCreateOnlineGame}
                      className="w-full bg-[#f0c866] text-[#1a0f08] font-bold py-4 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors"
                    >
                      Új Játék Létrehozása
                    </button>

                    <div className="h-px bg-white/10 w-full" />

                    <div>
                      <h3 className="text-sm text-[#a89078] uppercase tracking-wider mb-4">Várakozó Játékosok</h3>
                      {waitingGames.length === 0 ? (
                        <div className="text-center py-8 text-white/40 italic">
                          Jelenleg nincs várakozó játékos.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {waitingGames.map(g => (
                            <div key={g.id} className="flex justify-between items-center bg-[#241810] p-4 rounded-lg border border-white/5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1a0f08] border border-[#f0c866]/30 flex items-center justify-center">
                                  <User size={14} className="text-[#f0c866]" />
                                </div>
                                <span className="font-bold tracking-wider">{g.player1?.username || 'Ismeretlen'}</span>
                              </div>
                              {g.player1_id === session?.user.id ? (
                                <span className="text-xs text-[#a89078] uppercase tracking-wider px-4 py-2">Saját játék</span>
                              ) : (
                                <button 
                                  onClick={() => handleJoinOnlineGame(g.id, g.state, g.player1_id)}
                                  className="bg-transparent border border-[#f0c866]/50 text-[#f0c866] px-4 py-2 rounded hover:bg-[#f0c866]/10 transition-colors text-sm uppercase tracking-wider"
                                >
                                  Csatlakozás
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'game' && (
            <motion.div 
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col items-center w-full max-w-2xl p-4"
            >
              <div className="w-full flex justify-between items-center py-4 gap-3">
                <div className={cn(
                  "flex items-center gap-3 p-2 px-4 rounded-lg bg-[#241810]/90 backdrop-blur-md border flex-1 transition-all",
                  gameState.turn === 0 ? "border-[#f0c866] shadow-[0_0_15px_rgba(240,200,102,0.15)]" : "border-white/5"
                )}>
                  <div className="w-4 h-4 rounded-full bg-[#e74c3c]" />
                  <div>
                    <div className="font-semibold text-sm">
                      {mode === 'online' ? (onlineRole === 0 ? profile.username : opponent?.username || 'Játékos 1') : 'Játékos 1'}
                    </div>
                    <div className="text-xs text-[#a89078]">Falak: {gameState.players[0].walls}</div>
                  </div>
                </div>
                
                <div className="font-['Cinzel',serif] text-xs text-[#f0c866] tracking-[2px] text-center shrink-0 flex flex-col items-center gap-1">
                  <span>{gameState.turn === 0 ? '1. JÁTÉKOS' : '2. JÁTÉKOS'}</span>
                  <span className={cn(
                    "text-lg font-bold font-mono",
                    timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#f0c866]"
                  )}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className={cn(
                  "flex items-center gap-3 p-2 px-4 rounded-lg bg-[#241810]/90 backdrop-blur-md border flex-1 transition-all flex-row-reverse text-right",
                  gameState.turn === 1 ? "border-[#f0c866] shadow-[0_0_15px_rgba(240,200,102,0.15)]" : "border-white/5"
                )}>
                  <div className="w-4 h-4 rounded-full bg-[#2c3e50]" />
                  <div>
                    <div className="font-semibold text-sm">
                      {mode === 'ai' ? 'Gép (AI)' : (mode === 'online' ? (onlineRole === 1 ? profile.username : opponent?.username || 'Játékos 2') : 'Játékos 2')}
                    </div>
                    <div className="text-xs text-[#a89078]">Falak: {gameState.players[1].walls}</div>
                  </div>
                </div>
              </div>

              <QuoridorBoard 
                state={gameState}
                wallMode={wallMode}
                wallOrient={wallOrient}
                onMove={executeMove}
                onWallPlace={executeWall}
                animating={animating}
                disabled={(mode === 'ai' && gameState.turn === 1) || (mode === 'online' && gameState.turn !== onlineRole)}
              />

              <div className="flex flex-wrap justify-center gap-3 py-4 w-full">
                <button 
                  onClick={() => setWallMode(!wallMode)}
                  className={cn(
                    "bg-[#241810]/90 border px-5 py-2 rounded-md text-sm transition-all",
                    wallMode ? "border-[#e8b830] text-[#e8b830] bg-[#e8b830]/10" : "border-white/10 text-[#a89078] hover:border-[#f0c866] hover:text-[#f0c866]"
                  )}
                >
                  Fal lerakása
                </button>
                {wallMode && (
                  <button 
                    onClick={() => setWallOrient(o => o === 'h' ? 'v' : 'h')}
                    className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
                  >
                    {wallOrient === 'h' ? '↔ Vízszintes' : '↕ Függőleges'}
                  </button>
                )}
                <button 
                  onClick={() => startGame(mode)}
                  className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
                >
                  Új játék
                </button>
                <button 
                  onClick={() => setView('menu')}
                  className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
                >
                  Menü
                </button>
              </div>
              
              <div className="h-6 text-sm text-[#f0c866] animate-pulse text-center">
                {statusMsg}
              </div>
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div 
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center w-full max-w-md p-6 mt-10"
            >
              <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <button onClick={() => setView('menu')} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase">
                    Statisztika
                  </h2>
                </div>

                <div className="flex w-full mb-6 border-b border-white/10">
                  <button 
                    onClick={() => setLeaderboardTab('personal')}
                    className={cn(
                      "flex-1 pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                      leaderboardTab === 'personal' ? "border-[#f0c866] text-[#f0c866]" : "border-transparent text-[#a89078] hover:text-white"
                    )}
                  >
                    Saját Profil
                  </button>
                  <button 
                    onClick={() => setLeaderboardTab('online')}
                    className={cn(
                      "flex-1 pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                      leaderboardTab === 'online' ? "border-[#f0c866] text-[#f0c866]" : "border-transparent text-[#a89078] hover:text-white"
                    )}
                  >
                    Ranglista
                  </button>
                </div>

                {leaderboardTab === 'personal' ? (
                  <>
                    <div className="flex flex-col items-center mb-8">
                      <div className="w-24 h-24 rounded-full bg-[#241810] border-2 border-[#f0c866] flex items-center justify-center mb-4 relative">
                        <User className="text-[#f0c866]" size={40} />
                        <div className="absolute -bottom-3 bg-[#f0c866] text-[#1a0f08] text-xs font-bold px-3 py-1 rounded-full border-2 border-[#1a0f08]">
                          Lvl {profile.level}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold uppercase tracking-wider">{profile.username}</h3>
                      <p className="text-[#a89078] text-sm mt-1">{profile.xp} XP</p>
                      
                      {/* XP Bar */}
                      <div className="w-full h-2 bg-[#241810] rounded-full mt-4 overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-[#f0c866]/50 to-[#f0c866]" 
                          style={{ width: `${(profile.xp % 100)}%` }}
                        />
                      </div>
                      <div className="w-full flex justify-between text-[10px] text-[#a89078] mt-1 uppercase tracking-wider">
                        <span>Lvl {profile.level}</span>
                        <span>Lvl {profile.level + 1}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                        <div className="text-3xl font-light text-[#4caf50] mb-1">{profile.wins}</div>
                        <div className="text-xs text-[#a89078] uppercase tracking-wider">Győzelem</div>
                      </div>
                      <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                        <div className="text-3xl font-light text-[#e74c3c] mb-1">{profile.losses}</div>
                        <div className="text-xs text-[#a89078] uppercase tracking-wider">Vereség</div>
                      </div>
                    </div>
                    
                    <div className="mt-8 text-center text-xs text-[#a89078]/60">
                      {isSupabaseConfigured 
                        ? "A statisztikák a Supabase felhőben szinkronizálva vannak." 
                        : "A statisztikák jelenleg lokálisan mentődnek. A Supabase adatbázis kapcsolat előkészítve."}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {!isSupabaseConfigured ? (
                      <div className="text-center text-[#a89078] py-8">
                        A ranglista használatához Supabase kapcsolat szükséges.
                      </div>
                    ) : leaderboardData.length === 0 ? (
                      <div className="text-center text-[#a89078] py-8">
                        Betöltés...
                      </div>
                    ) : (
                      leaderboardData.map((p, index) => (
                        <div key={p.id} className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          p.id === profile.id 
                            ? "bg-[#f0c866]/10 border-[#f0c866]/50" 
                            : "bg-[#241810] border-white/5"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              index === 0 ? "bg-yellow-500 text-black" :
                              index === 1 ? "bg-gray-300 text-black" :
                              index === 2 ? "bg-amber-700 text-white" :
                              "bg-[#1a0f08] text-[#a89078] border border-white/10"
                            )}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold uppercase tracking-wider text-sm">{p.username}</div>
                              <div className="text-[#a89078] text-xs">Lvl {p.level}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[#f0c866] font-bold">{p.xp} XP</div>
                            <div className="text-[10px] text-[#a89078] uppercase">{p.wins}W - {p.losses}L</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Win Overlay */}
        <AnimatePresence>
          {showWin && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#1a0f08] border border-[#f0c866]/40 p-10 rounded-2xl text-center max-w-sm w-full shadow-[0_0_50px_rgba(240,200,102,0.15)]"
              >
                <Trophy className="w-20 h-20 text-[#f0c866] mx-auto mb-6 drop-shadow-[0_0_15px_rgba(240,200,102,0.5)]" />
                <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866] tracking-widest mb-2">
                  {mode === 'online' 
                    ? (gameState.turn === onlineRole ? 'Nyertél!' : 'Vesztettél!')
                    : (gameState.turn === 0 ? 'Játékos 1' : (mode === 'ai' ? 'Gép (AI)' : 'Játékos 2')) + ' Nyert!'}
                </h2>
                {winReason && <p className="text-red-400 font-bold mb-2 uppercase tracking-wider">{winReason}</p>}
                <p className="text-[#a89078] mb-8">
                  {mode === 'ai' && gameState.turn === 0 ? '+50 XP megszerve!' : ''}
                  {mode === 'ai' && gameState.turn === 1 ? '+10 XP a részvételért.' : ''}
                  {mode === 'pvp' ? '+20 XP megszerve!' : ''}
                  {mode === 'online' && gameState.turn === onlineRole ? '+50 XP megszerve!' : ''}
                  {mode === 'online' && gameState.turn !== onlineRole ? '+10 XP a részvételért.' : ''}
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => startGame(mode)}
                    className="bg-[#f0c866] text-[#1a0f08] font-bold py-3 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors"
                  >
                    Újra
                  </button>
                  <button 
                    onClick={() => setView('menu')}
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
