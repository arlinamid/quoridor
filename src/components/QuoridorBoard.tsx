import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { GameState, v2w, isBlocked, getValidMoves, isValidWall, Wall } from '../game/logic';
import { cn } from '../lib/utils';

interface BoardProps {
  state: GameState;
  wallMode: boolean;
  wallOrient: 'h' | 'v';
  onMove: (r: number, c: number) => void;
  onWallPlace: (r: number, c: number, orient: 'h' | 'v') => void;
  animating: boolean;
  disabled: boolean;
}

export function QuoridorBoard({ state, wallMode, wallOrient, onMove, onWallPlace, animating, disabled }: BoardProps) {
  const [hoveredWall, setHoveredWall] = useState<Wall | null>(null);

  const validMoves = useMemo(() => {
    if (wallMode || state.gameOver || disabled || animating) return [];
    return getValidMoves(state, state.turn);
  }, [state, wallMode, disabled, animating]);

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
    if (!wallMode || state.gameOver || animating || disabled) return;
    const wp = v2w(vr, vc, wallOrient);
    if (wp && isValidWall(state, wp.r, wp.c, wp.orient)) {
      setHoveredWall(null);
      onWallPlace(wp.r, wp.c, wp.orient);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (state.gameOver || animating || wallMode || disabled) return;
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
          
          cells.push(
            <div
              key={key}
              className={cn(
                "w-[clamp(28px,6vw,48px)] h-[clamp(28px,6vw,48px)] bg-[#c4956a] rounded-sm relative transition-colors duration-200",
                r === 8 && "shadow-[inset_0_-3px_0_var(--p1-color)]",
                r === 0 && "shadow-[inset_0_3px_0_var(--p2-color)]",
                isValidMove ? "bg-[rgba(76,175,80,0.4)] cursor-pointer" : "hover:bg-[#d4a87a] cursor-pointer"
              )}
              style={{ gridRow: vr + 1, gridColumn: vc + 1 }}
              onClick={() => handleCellClick(r, c)}
            />
          );
        } else {
          // Gap
          let typeClass = "";
          if (!isR && isC) typeClass = "w-[clamp(28px,6vw,48px)] h-[clamp(6px,1.5vw,8px)]";
          else if (isR && !isC) typeClass = "w-[clamp(6px,1.5vw,8px)] h-[clamp(28px,6vw,48px)]";
          else typeClass = "w-[clamp(6px,1.5vw,8px)] h-[clamp(6px,1.5vw,8px)]";

          cells.push(
            <div
              key={key}
              className={cn(
                typeClass,
                "cursor-pointer rounded-sm relative transition-colors duration-150",
                isPlaced && "bg-[#e8b830] shadow-[0_0_8px_rgba(232,184,48,0.4)] z-10",
                isHovered && !isPlaced && (isHoverValid ? "bg-[rgba(240,200,102,0.5)]" : "bg-[rgba(231,76,60,0.4)]")
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
          {state.players.map((p, i) => (
            <motion.div
              key={`pawn-${i}`}
              className={cn(
                "w-[clamp(20px,4.5vw,32px)] h-[clamp(20px,4.5vw,32px)] rounded-full z-20 pointer-events-none",
                i === 0 
                  ? "bg-[radial-gradient(circle_at_35%_35%,#ff6b5b,#e74c3c,#a82315)] shadow-[0_3px_12px_rgba(231,76,60,0.6),0_0_20px_rgba(231,76,60,0.6)]"
                  : "bg-[radial-gradient(circle_at_35%_35%,#4a6a8a,#2c3e50,#1a2a3a)] shadow-[0_3px_12px_rgba(44,62,80,0.6),0_0_20px_rgba(44,62,80,0.6)]"
              )}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{
                gridRow: p.r * 2 + 1,
                gridColumn: p.c * 2 + 1,
                justifySelf: "center",
                alignSelf: "center"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
