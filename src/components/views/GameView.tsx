import React from 'react';
import { motion } from 'motion/react';
import { GameState, SkillType } from '../../game/logic';
import { Profile } from '../../lib/supabase';
import { GameMode, isAIMode, isOnlineMode, isTreasureMode } from '../../lib/types';
import { QuoridorBoard } from '../QuoridorBoard';
import { cn } from '../../lib/utils';

interface GameViewProps {
  gameState: GameState;
  mode: GameMode;
  wallMode: boolean;
  wallOrient: 'h' | 'v';
  animating: boolean;
  statusMsg: string;
  targetingSkill: SkillType | null;
  timeLeft: number;
  onlineRole: number;
  profile: Profile;
  opponent: Profile | null;
  onToggleWallMode: () => void;
  onToggleWallOrient: () => void;
  onMove: (r: number, c: number) => void;
  onWallPlace: (r: number, c: number, orient: 'h' | 'v') => void;
  onSkillTarget: (r: number, c: number) => void;
  onSetTargetingSkill: (s: SkillType | null) => void;
  onExecuteSkill: (skill: SkillType) => void;
  onDig: () => void;
  onNewGame: () => void;
  onMenu: () => void;
}

export function GameView({
  gameState, mode, wallMode, wallOrient, animating, statusMsg, targetingSkill,
  timeLeft, onlineRole, profile, opponent,
  onToggleWallMode, onToggleWallOrient, onMove, onWallPlace, onSkillTarget,
  onSetTargetingSkill, onExecuteSkill, onDig, onNewGame, onMenu,
}: GameViewProps) {
  const p1Name = isOnlineMode(mode) ? (onlineRole === 0 ? profile.username : opponent?.username || 'Játékos 1') : 'Játékos 1';
  const p2Name = isAIMode(mode) ? 'Gép (AI)' : isOnlineMode(mode) ? (onlineRole === 1 ? profile.username : opponent?.username || 'Játékos 2') : 'Játékos 2';

  const canActPlayer = (playerIndex: number) => {
    if (gameState.turn !== playerIndex) return false;
    if (isAIMode(mode) && playerIndex === 1) return false;
    if (isOnlineMode(mode) && playerIndex !== onlineRole) return false;
    return true;
  };

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center w-full max-w-2xl p-4"
    >
      {/* Player bars + timer */}
      <div className="w-full flex justify-between items-center py-4 gap-3">
        <div className={cn(
          "flex items-center gap-3 p-2 px-4 rounded-lg bg-[#241810]/90 backdrop-blur-md border flex-1 transition-all",
          gameState.turn === 0 ? "border-[#f0c866] shadow-[0_0_15px_rgba(240,200,102,0.15)]" : "border-white/5"
        )}>
          <div className="w-4 h-4 rounded-full bg-[#e74c3c]" />
          <div>
            <div className="font-semibold text-sm">{p1Name}</div>
            <div className="text-xs text-[#a89078]">Falak: {gameState.players[0].walls}</div>
          </div>
        </div>

        <div className="font-['Cinzel',serif] text-xs text-[#f0c866] tracking-[2px] text-center shrink-0 flex flex-col items-center gap-1">
          <span>{gameState.turn === 0 ? '1. JÁTÉKOS' : '2. JÁTÉKOS'}</span>
          <span className={cn("text-lg font-bold font-mono", timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#f0c866]")}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>

        <div className={cn(
          "flex items-center gap-3 p-2 px-4 rounded-lg bg-[#241810]/90 backdrop-blur-md border flex-1 transition-all flex-row-reverse text-right",
          gameState.turn === 1 ? "border-[#f0c866] shadow-[0_0_15px_rgba(240,200,102,0.15)]" : "border-white/5"
        )}>
          <div className="w-4 h-4 rounded-full bg-[#2c3e50]" />
          <div>
            <div className="font-semibold text-sm">{p2Name}</div>
            <div className="text-xs text-[#a89078]">Falak: {gameState.players[1].walls}</div>
          </div>
        </div>
      </div>

      <QuoridorBoard
        state={gameState}
        wallMode={wallMode}
        wallOrient={wallOrient}
        onMove={onMove}
        onWallPlace={onWallPlace}
        animating={animating}
        disabled={(isAIMode(mode) && gameState.turn === 1) || (isOnlineMode(mode) && gameState.turn !== onlineRole)}
        targetingSkill={targetingSkill}
        onSkillTarget={onSkillTarget}
      />

      {/* Treasure mode: dig + skills */}
      {isTreasureMode(mode) && (
        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto mt-2">
          {canActPlayer(gameState.turn) &&
           gameState.treasures?.some(t => t.r === gameState.players[gameState.turn].r && t.c === gameState.players[gameState.turn].c) && (
            <button
              onClick={onDig}
              className="bg-[#e8b830] text-[#1a0f0a] font-bold px-6 py-2 rounded-md text-sm hover:bg-[#f0c866] transition-all shadow-[0_0_15px_rgba(232,184,48,0.4)]"
            >
              ⛏️ Kincs kiásása (1 kör)
            </button>
          )}

          <div className="flex gap-4 w-full justify-between px-4">
            {[0, 1].map(pi => (
              <div key={pi} className={cn("flex flex-col", pi === 1 && "items-end")}>
                <div className="text-xs text-[#a89078] mb-1">P{pi + 1} Képességek:</div>
                <div className="flex gap-1">
                  {gameState.players[pi].inventory?.map((skill, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!canActPlayer(pi)) return;
                        if (['TELEPORT', 'HAMMER', 'DYNAMITE'].includes(skill)) {
                          onSetTargetingSkill(targetingSkill === skill ? null : skill);
                        } else {
                          onExecuteSkill(skill);
                        }
                      }}
                      disabled={!canActPlayer(pi)}
                      className={cn(
                        "text-xs px-2 py-1 rounded border",
                        targetingSkill === skill ? "bg-[#e8b830] text-[#1a0f0a] border-[#e8b830]" : "bg-[#241810] text-[#f0c866] border-[#f0c866]/30",
                        !canActPlayer(pi) && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isOnlineMode(mode) && onlineRole !== pi ? '???' : skill}
                    </button>
                  ))}
                  {(!gameState.players[pi].inventory || gameState.players[pi].inventory.length === 0) && (
                    <span className="text-xs text-white/20">-</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3 py-4 w-full">
        <button
          onClick={onToggleWallMode}
          className={cn(
            "bg-[#241810]/90 border px-5 py-2 rounded-md text-sm transition-all",
            wallMode ? "border-[#e8b830] text-[#e8b830] bg-[#e8b830]/10" : "border-white/10 text-[#a89078] hover:border-[#f0c866] hover:text-[#f0c866]"
          )}
        >
          Fal lerakása
        </button>
        {wallMode && (
          <button
            onClick={onToggleWallOrient}
            className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
          >
            {wallOrient === 'h' ? '↔ Vízszintes' : '↕ Függőleges'}
          </button>
        )}
        <button
          onClick={onNewGame}
          className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
        >
          Új játék
        </button>
        <button
          onClick={onMenu}
          className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
        >
          Menü
        </button>
      </div>

      <div className="h-6 text-sm text-[#f0c866] animate-pulse text-center">{statusMsg}</div>
    </motion.div>
  );
}
