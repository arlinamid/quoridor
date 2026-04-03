import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { GameState, v2w, isBlocked, getValidMoves, isValidWall, Wall, SkillType } from '../game/logic';
import { cn } from '../lib/utils';
import { PLAYER_COLORS } from './views/LobbyView';

interface BoardProps {
  state: GameState;
  wallMode: boolean;
  wallOrient: 'h' | 'v';
  onMove: (r: number, c: number) => void;
  onWallPlace: (r: number, c: number, orient: 'h' | 'v') => void;
  animating: boolean;
  disabled: boolean;
  targetingSkill?: SkillType | null;
  onSkillTarget?: (r: number, c: number) => void;
}

export function QuoridorBoard({ state, wallMode, wallOrient, onMove, onWallPlace, animating, disabled, targetingSkill, onSkillTarget }: BoardProps) {
  const n = state.playerCount ?? state.players.length;
  // Larger cells for 3-4 player games so the board stays readable
  const cellCls = n >= 3
    ? "w-[clamp(36px,7.5vw,64px)] h-[clamp(36px,7.5vw,64px)]"
    : "w-[clamp(28px,6vw,48px)] h-[clamp(28px,6vw,48px)]";
  const gapHCls = n >= 3
    ? "w-[clamp(36px,7.5vw,64px)] h-[clamp(7px,1.8vw,10px)]"
    : "w-[clamp(28px,6vw,48px)] h-[clamp(6px,1.5vw,8px)]";
  const gapVCls = n >= 3
    ? "w-[clamp(7px,1.8vw,10px)] h-[clamp(36px,7.5vw,64px)]"
    : "w-[clamp(6px,1.5vw,8px)] h-[clamp(28px,6vw,48px)]";
  const gapBothCls = n >= 3
    ? "w-[clamp(7px,1.8vw,10px)] h-[clamp(7px,1.8vw,10px)]"
    : "w-[clamp(6px,1.5vw,8px)] h-[clamp(6px,1.5vw,8px)]";
  const pawnCls = n >= 3
    ? "w-[clamp(26px,5.5vw,44px)] h-[clamp(26px,5.5vw,44px)]"
    : "w-[clamp(20px,4.5vw,32px)] h-[clamp(20px,4.5vw,32px)]";
  const [hoveredWall, setHoveredWall] = useState<Wall | null>(null);

  const validMoves = useMemo(() => {
    if (wallMode || state.gameOver || disabled || animating || targetingSkill) return [];
    return getValidMoves(state, state.turn);
  }, [state, wallMode, disabled, animating, targetingSkill]);

  const getWallVisualCells = (wr: number, wc: number, o: 'h' | 'v') => {
    if (o === 'h') return [{ vr: 2 * (wr + 1) - 1, vc: 2 * wc }, { vr: 2 * (wr + 1) - 1, vc: 2 * wc + 1 }, { vr: 2 * (wr + 1) - 1, vc: 2 * wc + 2 }];
    return [{ vr: 2 * wr, vc: 2 * (wc + 1) - 1 }, { vr: 2 * wr + 1, vc: 2 * (wc + 1) - 1 }, { vr: 2 * wr + 2, vc: 2 * (wc + 1) - 1 }];
  };

  const placedWallCells = useMemo(() => {
    const cells = new Set<string>();
    state.walls.forEach(w => {
      getWallVisualCells(w.r, w.c, w.orient).forEach(({ vr, vc }) => cells.add(`${vr},${vc}`));
    });
    return cells;
  }, [state.walls]);

  const hoverWallCells = useMemo(() => {
    const cells = new Set<string>();
    if (hoveredWall) {
      getWallVisualCells(hoveredWall.r, hoveredWall.c, hoveredWall.orient).forEach(({ vr, vc }) => cells.add(`${vr},${vc}`));
    }
    return cells;
  }, [hoveredWall]);

  const isHoverValid = hoveredWall ? isValidWall(state, hoveredWall.r, hoveredWall.c, hoveredWall.orient) : false;

  const handleGapHover = (vr: number, vc: number, entering: boolean) => {
    if (!wallMode || state.gameOver || animating || disabled) return;
    if (!entering) {
      setHoveredWall(null);
      return;
    }
    const wp = v2w(vr, vc, wallOrient);
    if (wp) setHoveredWall(wp);
  };

  const handleGapClick = (vr: number, vc: number) => {
    if (state.gameOver || animating || disabled) return;
    
    if (targetingSkill === 'HAMMER') {
      // Find the wall that occupies this visual cell
      const key = `${vr},${vc}`;
      const wall = state.walls.find(w => {
        const cells = getWallVisualCells(w.r, w.c, w.orient);
        return cells.some(c => `${c.vr},${c.vc}` === key);
      });
      if (wall && onSkillTarget) {
        onSkillTarget(wall.r, wall.c);
      }
      return;
    }

    const wp = v2w(vr, vc, wallOrient);
    
    if (targetingSkill === 'DYNAMITE') {
      if (wp && onSkillTarget) {
        onSkillTarget(wp.r, wp.c);
      }
      return;
    }

    if (!wallMode) return;
    if (wp && isValidWall(state, wp.r, wp.c, wp.orient)) {
      setHoveredWall(null);
      onWallPlace(wp.r, wp.c, wp.orient);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (state.gameOver || animating || disabled) return;
    
    if (targetingSkill === 'TELEPORT') {
      if (onSkillTarget) {
        // Check distance <= 2 and empty cell
        const p = state.players[state.turn];
        const o = state.players[1 - state.turn];
        const dist = Math.abs(p.r - r) + Math.abs(p.c - c);
        const isEmpty = !(r === o.r && c === o.c);
        if (dist <= 2 && dist > 0 && isEmpty) {
          onSkillTarget(r, c);
        }
      }
      return;
    }

    if (wallMode) return;
    if (validMoves.find(m => m.r === r && m.c === c)) {
      onMove(r, c);
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let vr = 0; vr < 17; vr++) {
      for (let vc = 0; vc < 17; vc++) {
        const isR = vr % 2 === 0;
        const isC = vc % 2 === 0;
        const key = `${vr},${vc}`;
        const isPlaced = placedWallCells.has(key);
        const isHovered = hoverWallCells.has(key);

        if (isR && isC) {
          const r = vr / 2;
          const c = vc / 2;
          const isValidMove = validMoves.some(m => m.r === r && m.c === c);

          let isTeleportTarget = false;
          if (targetingSkill === 'TELEPORT') {
            const p = state.players[state.turn];
            const o = state.players[1 - state.turn];
            const dist = Math.abs(p.r - r) + Math.abs(p.c - c);
            const isEmpty = !(r === o.r && c === o.c);
            if (dist <= 2 && dist > 0 && isEmpty) isTeleportTarget = true;
          }

          const hasTreasure = state.treasureMode && state.treasures?.some(t => t.r === r && t.c === c);
          const hasTrap = state.treasureMode && state.traps?.some(t => t.r === r && t.c === c);

          cells.push(
            <div
              key={key}
              className={cn(
                cellCls, "bg-[#c4956a] rounded-sm relative transition-colors duration-200 flex items-center justify-center",
                r === 8 && "shadow-[inset_0_-3px_0_#e74c3c]",
                r === 0 && "shadow-[inset_0_3px_0_#2c3e50]",
                c === 8 && "shadow-[inset_-3px_0_0_#27ae60]",
                c === 0 && "shadow-[inset_3px_0_0_#8e44ad]",
                isValidMove ? "bg-[rgba(76,175,80,0.4)] cursor-pointer" : 
                isTeleportTarget ? "bg-[rgba(232,184,48,0.4)] cursor-pointer shadow-[0_0_10px_rgba(232,184,48,0.6)]" : "hover:bg-[#d4a87a] cursor-pointer"
              )}
              style={{ gridRow: vr + 1, gridColumn: vc + 1 }}
              onClick={() => handleCellClick(r, c)}
            >
              {hasTreasure && (
                <span className="text-[#e8b830] font-bold text-xl drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">?</span>
              )}
              {hasTrap && (
                <span className="text-[#e74c3c] text-xl drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">⚠️</span>
              )}
            </div>
          );
        } else {
          // Gap
          let typeClass = "";
          if (!isR && isC) typeClass = gapHCls;
          else if (isR && !isC) typeClass = gapVCls;
          else typeClass = gapBothCls;

          let isTarget = false;
          if (targetingSkill === 'HAMMER' && isPlaced) isTarget = true;
          if (targetingSkill === 'DYNAMITE' && !isR && !isC) isTarget = true;

          cells.push(
            <div
              key={key}
              className={cn(
                typeClass,
                "cursor-pointer rounded-sm relative transition-colors duration-150",
                isPlaced && !isTarget && "bg-[#e8b830] shadow-[0_0_8px_rgba(232,184,48,0.4)] z-10",
                isTarget && "bg-[#e74c3c] shadow-[0_0_12px_rgba(231,76,60,0.8)] z-10",
                isHovered && !isPlaced && !isTarget && (isHoverValid ? "bg-[rgba(240,200,102,0.5)]" : "bg-[rgba(231,76,60,0.4)]")
              )}
              style={{ gridRow: vr + 1, gridColumn: vc + 1 }}
              onMouseEnter={() => handleGapHover(vr, vc, true)}
              onMouseLeave={() => handleGapHover(vr, vc, false)}
              onClick={() => handleGapClick(vr, vc)}
            />
          );
        }
      }
    }
    return cells;
  };

  return (
    <div className="flex justify-center py-2">
      <div className="bg-[#2a1810] p-3 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] relative">
        <div className="grid grid-cols-[repeat(17,auto)] grid-rows-[repeat(17,auto)] gap-0 relative">
          {renderGrid()}
          
          {/* Pawns */}
          {state.players.map((p, i) => {
            const color = PLAYER_COLORS[i];
            return (
              <motion.div
                key={`pawn-${i}`}
                className={cn(pawnCls, "rounded-full z-20 pointer-events-none")}
                layout
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                  gridRow: p.r * 2 + 1,
                  gridColumn: p.c * 2 + 1,
                  justifySelf: "center",
                  alignSelf: "center",
                  background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}, ${color}88)`,
                  boxShadow: `0 3px 12px ${color}99, 0 0 20px ${color}66`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
