import React from 'react';
import { motion } from 'motion/react';
import { Bot } from 'lucide-react';
import { GameState, SkillType } from '../../game/logic';
import { Profile } from '../../lib/supabase';
import { GameMode, isAIMode, isOnlineMode, isTreasureMode } from '../../lib/types';
import { QuoridorBoard } from '../QuoridorBoard';
import { PLAYER_COLORS, PLAYER_LABELS } from './LobbyView';
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
  playerProfiles: Record<number, Profile>;
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
  timeLeft, onlineRole, profile, playerProfiles,
  onToggleWallMode, onToggleWallOrient, onMove, onWallPlace, onSkillTarget,
  onSetTargetingSkill, onExecuteSkill, onDig, onNewGame, onMenu,
}: GameViewProps) {
  const playerCount = gameState.players.length;
  const botPlayers = gameState.botPlayers ?? [];

  const getPlayerName = (pi: number) => {
    if (botPlayers.includes(pi)) return 'Bot';
    if (isAIMode(mode) && pi === 1) return 'Gép (AI)';
    if (isOnlineMode(mode)) {
      if (pi === onlineRole) return profile.username;
      return playerProfiles[pi]?.username || PLAYER_LABELS[pi];
    }
    return `Játékos ${pi + 1}`;
  };

  const canActPlayer = (playerIndex: number) => {
    if (gameState.turn !== playerIndex) return false;
    if (isAIMode(mode) && playerIndex === 1) return false;
    if (isOnlineMode(mode) && (playerIndex !== onlineRole || botPlayers.includes(playerIndex))) return false;
    return true;
  };

  const isLocalTurn = canActPlayer(gameState.turn);

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center w-full max-w-2xl p-4"
    >
      {/* Player cards — dynamic for 2-4 players */}
      <div className="w-full flex items-center gap-2 py-3 flex-wrap justify-center">
        {gameState.players.map((p, pi) => {
          const isActive = gameState.turn === pi;
          const isBot = botPlayers.includes(pi);
          return (
            <div
              key={pi}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg bg-[#241810]/90 backdrop-blur-md border transition-all",
                playerCount <= 2 ? "flex-1" : "min-w-[130px]",
                isActive ? "border-[#f0c866] shadow-[0_0_12px_rgba(240,200,102,0.2)]" : "border-white/5"
              )}
              style={isActive ? { borderColor: PLAYER_COLORS[pi] + '88', boxShadow: `0 0 12px ${PLAYER_COLORS[pi]}33` } : {}}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: PLAYER_COLORS[pi] }} />
              <div className="min-w-0">
                <div className="font-semibold text-xs truncate flex items-center gap-1">
                  {isBot && <Bot size={10} className="text-[#8e44ad] shrink-0" />}
                  {getPlayerName(pi)}
                </div>
                <div className="text-[10px] text-[#a89078]">{PLAYER_LABELS[pi]} · {p.walls} fal</div>
              </div>
            </div>
          );
        })}

        {/* Timer */}
        <div className="font-['Cinzel',serif] text-xs text-[#f0c866] tracking-[2px] text-center shrink-0 flex flex-col items-center gap-0.5 px-2">
          <span className="text-[10px] uppercase">{PLAYER_LABELS[gameState.turn]} köre</span>
          <span className={cn("text-lg font-bold font-mono", timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#f0c866]")}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <QuoridorBoard
        state={gameState}
        wallMode={wallMode}
        wallOrient={wallOrient}
        onMove={onMove}
        onWallPlace={onWallPlace}
        animating={animating}
        disabled={
          (isAIMode(mode) && gameState.turn === 1) ||
          (isOnlineMode(mode) && (gameState.turn !== onlineRole || botPlayers.includes(gameState.turn)))
        }
        targetingSkill={targetingSkill}
        onSkillTarget={onSkillTarget}
      />

      {/* Treasure mode: dig + skills */}
      {isTreasureMode(mode) && (
        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto mt-2">
          {isLocalTurn &&
           gameState.treasures?.some(t => t.r === gameState.players[gameState.turn].r && t.c === gameState.players[gameState.turn].c) && (
            <button
              onClick={onDig}
              className="bg-[#e8b830] text-[#1a0f0a] font-bold px-6 py-2 rounded-md text-sm hover:bg-[#f0c866] transition-all shadow-[0_0_15px_rgba(232,184,48,0.4)]"
            >
              ⛏️ Kincs kiásása (1 kör)
            </button>
          )}

          <div className="flex gap-2 flex-wrap justify-center w-full">
            {gameState.players.map((_, pi) => {
              const canAct = canActPlayer(pi);
              const skills = gameState.players[pi].inventory ?? [];
              if (skills.length === 0) return null;
              return (
                <div key={pi} className="flex flex-col items-center gap-1">
                  <div className="text-[10px] text-[#a89078]">{PLAYER_LABELS[pi]}:</div>
                  <div className="flex gap-1">
                    {skills.map((skill, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (!canAct) return;
                          if (['TELEPORT', 'HAMMER', 'DYNAMITE'].includes(skill)) {
                            onSetTargetingSkill(targetingSkill === skill ? null : skill);
                          } else {
                            onExecuteSkill(skill);
                          }
                        }}
                        disabled={!canAct}
                        className={cn(
                          "text-xs px-2 py-1 rounded border",
                          targetingSkill === skill ? "bg-[#e8b830] text-[#1a0f0a] border-[#e8b830]" : "bg-[#241810] text-[#f0c866] border-[#f0c866]/30",
                          !canAct && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isOnlineMode(mode) && pi !== onlineRole ? '???' : skill}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
