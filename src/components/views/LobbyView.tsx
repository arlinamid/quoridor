import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Map, Play, Users, Bot, X } from 'lucide-react';
import { GameMode } from '../../lib/types';
import { Profile } from '../../lib/supabase';
import { cn } from '../../lib/utils';

export const PLAYER_COLORS = ['#e74c3c', '#2c3e50', '#27ae60', '#8e44ad'] as const;
export const PLAYER_LABELS = ['P1', 'P2', 'P3', 'P4'] as const;

interface LobbyViewProps {
  mode: GameMode;
  onlineGameId: string | null;
  onlineRole: number;
  maxPlayers: number;
  onMaxPlayersChange: (n: number) => void;
  waitingGames: any[];
  lobbyUsers: Set<string>;
  sessionUserId: string | undefined;
  hostedGameData: any | null;   // full game row when hosting
  botSlots: number[];
  onToggleBot: (slotIdx: number) => void;
  onBack: () => void;
  onCreateGame: () => void;
  onStartGame: () => void;
  onJoinGame: (id: string, state: any, p1Id: string, slotIndex: 1 | 2 | 3) => void;
}

function useCountdown(fromMs: number, active: boolean) {
  const [remaining, setRemaining] = useState(fromMs);
  useEffect(() => {
    if (!active) return;
    setRemaining(fromMs);
    const start = Date.now();
    const id = setInterval(() => {
      const r = Math.max(0, fromMs - (Date.now() - start));
      setRemaining(r);
    }, 500);
    return () => clearInterval(id);
  }, [active, fromMs]);
  return remaining;
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function LobbyView({
  mode, onlineGameId, onlineRole, maxPlayers, onMaxPlayersChange,
  waitingGames, lobbyUsers, sessionUserId,
  hostedGameData, botSlots, onToggleBot,
  onBack, onCreateGame, onStartGame, onJoinGame,
}: LobbyViewProps) {
  const AUTO_START_MS = 2 * 60 * 1000;
  const isHost = onlineRole === 0 && !!onlineGameId;
  const countdown = useCountdown(AUTO_START_MS, isHost);

  // Count filled slots in hosted game (human players + bots)
  const humanSlots = hostedGameData
    ? [hostedGameData.player1_id, hostedGameData.player2_id, hostedGameData.player3_id, hostedGameData.player4_id].filter(Boolean).length
    : 1; // just host
  const filledSlots = humanSlots + botSlots.length;

  const canStart = filledSlots >= 2;

  // Filter lobby to same mode
  const activeGames = waitingGames.filter(g => {
    const sameTreasure = Boolean(g.state?.treasureMode) === (mode === 'treasure-online');
    return lobbyUsers.has(g.player1_id) && sameTreasure;
  });

  const SlotRow = ({ slotIdx, playerId, label }: { slotIdx: number; playerId?: string; label: string }) => {
    const isBot = botSlots.includes(slotIdx);
    const isEmpty = !playerId && !isBot;
    return (
      <div className="flex items-center gap-3 bg-[#241810] p-3 rounded-lg border border-white/5">
        <div className="w-3 h-3 rounded-full" style={{ background: PLAYER_COLORS[slotIdx] }} />
        <span className="text-xs text-[#a89078] uppercase tracking-wider w-8">{label}</span>
        {playerId ? (
          <span className="text-sm font-bold text-[#f5e6d3] flex-1">● Csatlakozott</span>
        ) : isBot ? (
          <span className="text-sm font-bold text-[#8e44ad] flex-1 flex items-center gap-1"><Bot size={14} /> Bot</span>
        ) : (
          <span className="text-sm text-white/30 italic flex-1">Várakozás...</span>
        )}
        {isHost && slotIdx > 0 && !playerId && (
          isBot ? (
            <button
              onClick={() => onToggleBot(slotIdx)}
              className="text-[10px] text-red-400 border border-red-400/30 rounded px-2 py-1 hover:bg-red-400/10 transition-colors flex items-center gap-1 uppercase tracking-wider"
            >
              <X size={10} /> Eltávolít
            </button>
          ) : (
            <button
              onClick={() => onToggleBot(slotIdx)}
              className="text-[10px] text-[#8e44ad] border border-[#8e44ad]/40 rounded px-2 py-1 hover:bg-[#8e44ad]/10 transition-colors flex items-center gap-1 uppercase tracking-wider"
            >
              <Bot size={10} /> Bot
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <motion.div
      key="lobby"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center w-full max-w-2xl p-6 mt-10"
    >
      <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase">
              Online Játékok
            </h2>
            {mode === 'treasure-online' && (
              <div className="flex items-center gap-1 text-[#e8b830] text-xs mt-1 uppercase tracking-wider">
                <Map size={12} /> Kincskereső mód
              </div>
            )}
          </div>
        </div>

        {/* Hosting: waiting for players */}
        {onlineGameId ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-[#a89078] uppercase tracking-wider">
                {isHost ? 'Saját játék' : 'Csatlakozva'}
              </h3>
              {isHost && (
                <span className={cn("text-sm font-mono font-bold", countdown < 30000 ? "text-red-400 animate-pulse" : "text-[#f0c866]")}>
                  Auto-start: {fmt(countdown)}
                </span>
              )}
            </div>

            {/* Player slots */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: maxPlayers }).map((_, i) => {
                const idField = ['player1_id', 'player2_id', 'player3_id', 'player4_id'][i];
                return (
                  <SlotRow
                    key={i}
                    slotIdx={i}
                    playerId={hostedGameData?.[idField]}
                    label={PLAYER_LABELS[i]}
                  />
                );
              })}
            </div>

            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={cn(
                  "w-full font-bold py-4 px-6 rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                  canStart
                    ? "bg-[#f0c866] text-[#1a0f08] hover:bg-[#f4d488]"
                    : "bg-[#241810] text-white/20 border border-white/10 cursor-not-allowed"
                )}
              >
                <Play size={18} />
                {canStart ? 'Játék Indítása' : `Legalább 2 játékos szükséges (${filledSlots}/${maxPlayers})`}
              </button>
            )}
            {!isHost && (
              <div className="text-center py-4 text-[#a89078] text-sm">
                Várakozás a host indítására...
              </div>
            )}
          </div>
        ) : (
          /* Lobby: create or join */
          <div className="flex flex-col gap-6">
            {/* Player count selector */}
            <div>
              <div className="text-xs text-[#a89078] uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={12} /> Játékosok száma
              </div>
              <div className="flex gap-2">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => onMaxPlayersChange(n)}
                    className={cn(
                      "flex-1 py-2 rounded-md border text-sm font-bold uppercase tracking-wider transition-all",
                      maxPlayers === n
                        ? "bg-[#f0c866] text-[#1a0f08] border-[#f0c866]"
                        : "bg-[#241810] text-[#a89078] border-white/10 hover:border-[#f0c866] hover:text-[#f0c866]"
                    )}
                  >
                    {n} Játékos
                  </button>
                ))}
              </div>
              {maxPlayers >= 3 && (
                <div className="mt-2 text-[10px] text-[#a89078]/70 leading-relaxed">
                  {maxPlayers === 3 && '3 játékos: P1↕ P2↕ P3↔ · 7 fal/fő'}
                  {maxPlayers === 4 && '4 játékos: P1↕ P2↕ P3↔ P4↔ · 5 fal/fő'}
                </div>
              )}
            </div>

            <button
              onClick={onCreateGame}
              className="w-full bg-[#f0c866] text-[#1a0f08] font-bold py-4 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors"
            >
              Új Játék Létrehozása
            </button>

            <div className="h-px bg-white/10 w-full" />

            <div>
              <h3 className="text-sm text-[#a89078] uppercase tracking-wider mb-4">Várakozó Játékosok</h3>
              {activeGames.length === 0 ? (
                <div className="text-center py-8 text-white/40 italic">
                  Jelenleg nincs várakozó játékos ebben a módban.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeGames.map(g => {
                    const filled = [g.player1_id, g.player2_id, g.player3_id, g.player4_id].filter(Boolean).length;
                    const max = g.max_players || 2;
                    const nextSlot = (filled) as 1 | 2 | 3;
                    const isFull = filled >= max;
                    return (
                      <div key={g.id} className="flex justify-between items-center bg-[#241810] p-4 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#1a0f08] border border-[#f0c866]/30 flex items-center justify-center">
                            <User size={14} className="text-[#f0c866]" />
                          </div>
                          <div>
                            <span className="font-bold tracking-wider">{g.player1?.username || 'Ismeretlen'}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              {g.state?.treasureMode && (
                                <span className="flex items-center gap-1 text-[#e8b830] text-[10px] uppercase tracking-wider">
                                  <Map size={10} /> Kincs
                                </span>
                              )}
                              <span className="text-[10px] text-[#a89078]">{filled}/{max} játékos</span>
                            </div>
                          </div>
                        </div>
                        {g.player1_id === sessionUserId ? (
                          <span className="text-xs text-[#a89078] uppercase tracking-wider px-4 py-2">Saját</span>
                        ) : isFull ? (
                          <span className="text-xs text-white/30 uppercase tracking-wider px-4 py-2">Teli</span>
                        ) : (
                          <button
                            onClick={() => onJoinGame(g.id, g.state, g.player1_id, nextSlot)}
                            className="bg-transparent border border-[#f0c866]/50 text-[#f0c866] px-4 py-2 rounded hover:bg-[#f0c866]/10 transition-colors text-sm uppercase tracking-wider"
                          >
                            Csatlakozás
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
