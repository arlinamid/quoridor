import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Map } from 'lucide-react';
import { GameMode } from '../../lib/types';

interface LobbyViewProps {
  mode: GameMode;
  onlineGameId: string | null;
  waitingGames: any[];
  lobbyUsers: Set<string>;
  sessionUserId: string | undefined;
  onBack: () => void;
  onCreateGame: () => void;
  onJoinGame: (id: string, state: any, p1Id: string) => void;
}

export function LobbyView({
  mode,
  onlineGameId,
  waitingGames,
  lobbyUsers,
  sessionUserId,
  onBack,
  onCreateGame,
  onJoinGame,
}: LobbyViewProps) {
  const activeSameMode = waitingGames.filter(g => {
    const sameTreasure = Boolean(g.state?.treasureMode) === (mode === 'treasure-online');
    return lobbyUsers.has(g.player1_id) && sameTreasure;
  });

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

        {onlineGameId ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#f0c866]/20 border-t-[#f0c866] rounded-full animate-spin mx-auto mb-6" />
            <h3 className="text-xl font-bold text-[#f0c866] tracking-wider uppercase mb-2">Várakozás az ellenfélre...</h3>
            <p className="text-[#a89078]">A játék automatikusan elindul, amint valaki csatlakozik.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <button
              onClick={onCreateGame}
              className="w-full bg-[#f0c866] text-[#1a0f08] font-bold py-4 px-6 rounded-lg uppercase tracking-wider hover:bg-[#f4d488] transition-colors"
            >
              Új Játék Létrehozása
            </button>

            <div className="h-px bg-white/10 w-full" />

            <div>
              <h3 className="text-sm text-[#a89078] uppercase tracking-wider mb-4">Várakozó Játékosok</h3>
              {activeSameMode.length === 0 ? (
                <div className="text-center py-8 text-white/40 italic">
                  Jelenleg nincs várakozó játékos ebben a módban.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeSameMode.map(g => (
                    <div key={g.id} className="flex justify-between items-center bg-[#241810] p-4 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a0f08] border border-[#f0c866]/30 flex items-center justify-center">
                          <User size={14} className="text-[#f0c866]" />
                        </div>
                        <div>
                          <span className="font-bold tracking-wider">{g.player1?.username || 'Ismeretlen'}</span>
                          {g.state?.treasureMode && (
                            <div className="flex items-center gap-1 text-[#e8b830] text-[10px] mt-0.5 uppercase tracking-wider">
                              <Map size={10} /> Kincskereső
                            </div>
                          )}
                        </div>
                      </div>
                      {g.player1_id === sessionUserId ? (
                        <span className="text-xs text-[#a89078] uppercase tracking-wider px-4 py-2">Saját játék</span>
                      ) : (
                        <button
                          onClick={() => onJoinGame(g.id, g.state, g.player1_id)}
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
  );
}
