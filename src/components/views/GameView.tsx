import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EasterEggFloater } from '../EasterEggOverlay';
import { CollectibleType } from '../../lib/types';
import {
  Bot, Zap, Hammer, SkipForward, Pickaxe, Flame,
  Shield, Plus, Magnet, Crosshair, ArrowLeftRight, Lock,
} from 'lucide-react';
import { GameState, SkillType, isTeamGameState, maxTreasureInventorySlots } from '../../game/logic';
import { Profile } from '../../lib/supabase';
import { GameMode, isAIMode, isOnlineMode, isTreasureMode } from '../../lib/types';
import { QuoridorBoard } from '../QuoridorBoard';
import { PLAYER_COLORS, PLAYER_LABELS } from './LobbyView';
import { cn } from '../../lib/utils';
import { hu } from '../../i18n/hu/ui';

// ── Skill meta (szöveg: hu.skills) ───────────────────────────────────────────

const SKILL_ICON_COLOR: Record<SkillType, { icon: React.ReactNode; color: string }> = {
  TELEPORT:  { icon: <Zap size={16} />,            color: '#a78bfa' },
  HAMMER:    { icon: <Hammer size={16} />,          color: '#f97316' },
  SKIP:      { icon: <SkipForward size={16} />,     color: '#38bdf8' },
  MOLE:      { icon: <Pickaxe size={16} />,         color: '#a3e635' },
  DYNAMITE:  { icon: <Flame size={16} />,           color: '#ef4444' },
  SHIELD:    { icon: <Shield size={16} />,          color: '#22d3ee' },
  WALLS:     { icon: <Plus size={16} />,            color: '#f0c866' },
  MAGNET:    { icon: <Magnet size={16} />,          color: '#f472b6' },
  TRAP:      { icon: <Crosshair size={16} />,       color: '#fb923c' },
  SWAP:      { icon: <ArrowLeftRight size={16} />,  color: '#34d399' },
};

const SKILL_META: Record<SkillType, { icon: React.ReactNode; label: string; desc: string; color: string }> =
  (Object.keys(SKILL_ICON_COLOR) as SkillType[]).reduce((acc, k) => {
    const ic = SKILL_ICON_COLOR[k];
    const t = hu.skills[k];
    acc[k] = { icon: ic.icon, color: ic.color, label: t.label, desc: t.desc };
    return acc;
  }, {} as Record<SkillType, { icon: React.ReactNode; label: string; desc: string; color: string }>);

// ── Skill button with tooltip ────────────────────────────────────────────────

interface SkillButtonProps {
  skill: SkillType;
  canAct: boolean;
  hidden: boolean;
  active: boolean;
  onClick: () => void;
}

function SkillButton({ skill, canAct, hidden, active, onClick }: SkillButtonProps) {
  const [showTip, setShowTip] = useState(false);
  const meta = SKILL_META[skill];

  return (
    <div className="relative" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
      <button
        onClick={onClick}
        disabled={!canAct}
        aria-label={hidden ? hu.game.skillUnknownTitle : meta.label}
        className={cn(
          'flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-xl border-2 transition-all duration-150',
          'text-[10px] font-bold uppercase tracking-wide leading-none select-none',
          hidden
            ? 'border-white/10 bg-[#1a0f08] text-white/20 cursor-default'
            : active
              ? 'scale-105 shadow-lg'
              : canAct
                ? 'bg-[#241810] hover:brightness-125 hover:scale-105 cursor-pointer'
                : 'bg-[#1a0f08] opacity-40 cursor-not-allowed',
        )}
        style={
          hidden ? {} :
          active
            ? { borderColor: meta.color, background: meta.color + '28', color: meta.color, boxShadow: `0 0 14px ${meta.color}55` }
            : { borderColor: meta.color + '55', color: meta.color }
        }
      >
        {hidden ? <Lock size={16} className="opacity-40" /> : meta.icon}
        <span>{hidden ? hu.game.skillHiddenPlaceholder : meta.label}</span>
      </button>

      {/* Tooltip */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div
              className="bg-[#0d0704] border rounded-lg px-3 py-2 shadow-2xl text-center whitespace-nowrap"
              style={{ borderColor: hidden ? '#ffffff22' : meta.color + '66' }}
            >
              {!hidden && (
                <div className="font-bold text-xs mb-0.5" style={{ color: meta.color }}>
                  {meta.label}
                </div>
              )}
              <div className="text-[11px] text-[#c8b090] max-w-[180px] whitespace-normal leading-snug">
                {hidden ? hu.game.skillUnknownDesc : meta.desc}
              </div>
              {/* Arrow */}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: `5px solid ${hidden ? '#ffffff22' : meta.color + '66'}`,
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main GameView ────────────────────────────────────────────────────────────

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
  /** null = helyi megosztott képernyő: mindenki látja a saját csapdáit jelölő ikont; szám = csak az adott szemszög (online / gép ellen). */
  boardViewerIndex: number | null;
  trapHitFlash: { r: number; c: number } | null;
  onDig: () => void;
  onNewGame: () => void;
  onMenu: () => void;
  easterEgg?: { type: CollectibleType; x: number; y: number } | null;
  onEasterEggCollect?: () => void;
}

export function GameView({
  gameState, mode, wallMode, wallOrient, animating, statusMsg, targetingSkill,
  timeLeft, onlineRole, profile, playerProfiles,
  onToggleWallMode, onToggleWallOrient, onMove, onWallPlace, onSkillTarget,
  onSetTargetingSkill, onExecuteSkill, onDig, onNewGame, onMenu,
  boardViewerIndex, trapHitFlash,
  easterEgg, onEasterEggCollect,
}: GameViewProps) {
  const playerCount = gameState.players.length;
  const botPlayers = gameState.botPlayers ?? [];
  const teamPlay = isTeamGameState(gameState);
  const teamLetter = (pi: number) => {
    if (!teamPlay || !gameState.teams) return null;
    const t = gameState.teams[pi];
    return t === 0 ? 'A' : t === 1 ? 'B' : null;
  };

  const getPlayerName = (pi: number) => {
    if (botPlayers.includes(pi)) return hu.common.bot;
    if (isAIMode(mode) && pi === 1) return hu.game.playerAi;
    if (isOnlineMode(mode)) {
      if (pi === onlineRole) return profile.username;
      return playerProfiles[pi]?.username || PLAYER_LABELS[pi];
    }
    return hu.game.playerHuman(pi + 1);
  };

  const canActPlayer = (playerIndex: number) => {
    if (gameState.turn !== playerIndex) return false;
    if (isAIMode(mode) && playerIndex === 1) return false;
    if (isOnlineMode(mode) && (playerIndex !== onlineRole || botPlayers.includes(playerIndex))) return false;
    return true;
  };

  const isLocalTurn = canActPlayer(gameState.turn);
  const treasureInvCap = maxTreasureInventorySlots(profile.level ?? 1);
  const turnInvLen = gameState.players[gameState.turn]?.inventory?.length ?? 0;
  const canDigTreasure = turnInvLen < treasureInvCap;
  const onTreasureCell =
    Boolean(
      gameState.treasures?.some(
        t =>
          t.r === gameState.players[gameState.turn].r &&
          t.c === gameState.players[gameState.turn].c
      )
    );

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex-1 flex flex-col items-center w-full min-w-0 max-w-2xl px-3 pt-2 pb-3 md:p-4"
    >
      {/* Player cards */}
      <div className="w-full flex items-center gap-2 py-2 md:py-3 flex-wrap justify-center shrink-0">
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
                <div className="text-[10px] text-[#a89078]">
                  {PLAYER_LABELS[pi]}
                  {teamLetter(pi) && (
                    <span
                      className={cn(
                        ' font-bold',
                        teamLetter(pi) === 'A' ? 'text-cyan-400/95' : 'text-rose-400/95',
                      )}
                    >
                      {hu.game.teamChip(teamLetter(pi)!)}
                    </span>
                  )}
                  {' · '}{hu.game.wallsCount(p.walls)}
                </div>
              </div>
            </div>
          );
        })}

        {/* Timer */}
        <div className="font-['Cinzel',serif] text-xs text-[#f0c866] tracking-[2px] text-center shrink-0 flex flex-col items-center gap-0.5 px-2">
          <span className="text-[10px] uppercase">{hu.game.turnOf(PLAYER_LABELS[gameState.turn])}</span>
          <span className={cn("text-lg font-bold font-mono", timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-[#f0c866]")}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="w-full min-w-0 flex justify-center shrink-0">
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
          boardViewerIndex={boardViewerIndex}
          trapHitFlash={trapHitFlash}
          onTreasureDig={isTreasureMode(mode) && isLocalTurn ? onDig : undefined}
          treasureDigHighlight={canDigTreasure && onTreasureCell}
        />
      </div>

      {/* Treasure mode: skills */}
      {isTreasureMode(mode) && (
        <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto mt-3">
          {/* Skill rows per player */}
          <div className="flex flex-col gap-2 w-full">
            {gameState.players.map((pl, pi) => {
              const skills = pl.inventory ?? [];
              if (skills.length === 0) return null;
              const canAct = canActPlayer(pi);
              const isHidden = isOnlineMode(mode) && pi !== onlineRole;
              return (
                <div key={pi} className="flex items-center gap-3">
                  {/* Player label */}
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider w-6 text-center shrink-0"
                    style={{ color: PLAYER_COLORS[pi] }}
                  >
                    {PLAYER_LABELS[pi]}
                  </div>
                  {/* Skill buttons */}
                  <div className="flex gap-2">
                    {skills.map((skill, idx) => (
                      <SkillButton
                        key={idx}
                        skill={skill}
                        canAct={canAct}
                        hidden={isHidden}
                        active={targetingSkill === skill}
                        onClick={() => {
                          if (!canAct || isHidden) return;
                          if (['TELEPORT', 'HAMMER', 'DYNAMITE', 'TRAP'].includes(skill)) {
                            onSetTargetingSkill(targetingSkill === skill ? null : skill);
                          } else {
                            onExecuteSkill(skill);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 py-3 md:py-4 w-full shrink-0">
        <button
          onClick={onToggleWallMode}
          className={cn(
            "bg-[#241810]/90 border px-5 py-2 rounded-md text-sm transition-all",
            wallMode ? "border-[#e8b830] text-[#e8b830] bg-[#e8b830]/10" : "border-white/10 text-[#a89078] hover:border-[#f0c866] hover:text-[#f0c866]"
          )}
        >
          {hu.game.wallModeOn}
        </button>
        {wallMode && (
          <button
            onClick={onToggleWallOrient}
            className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
          >
            {wallOrient === 'h' ? hu.game.wallOrientH : hu.game.wallOrientV}
          </button>
        )}
        <button
          onClick={onNewGame}
          className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
        >
          {hu.game.newGame}
        </button>
        <button
          onClick={onMenu}
          className="bg-[#241810]/90 border border-white/10 text-[#a89078] px-5 py-2 rounded-md text-sm hover:border-[#f0c866] hover:text-[#f0c866] transition-all"
        >
          {hu.game.menu}
        </button>
      </div>

      <div className="h-6 text-sm text-[#f0c866] animate-pulse text-center">{statusMsg}</div>

      <AnimatePresence>
        {easterEgg && onEasterEggCollect && (
          <EasterEggFloater egg={easterEgg} onCollect={onEasterEggCollect} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
