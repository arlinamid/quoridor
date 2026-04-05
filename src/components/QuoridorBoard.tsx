import React, { useState, useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crosshair } from 'lucide-react';
import {
  GameState, v2w, getValidMoves, isValidWall, Wall, SkillType, isValidTrapPlacement, viewerSeesTrapMarker,
  wallFromGapVisual, isGapBetweenPlayerAndValidMove, isTrenchCell,
} from '../game/logic';
import { cn } from '../lib/utils';
import { PLAYER_COLORS } from './views/LobbyView';
import { hu } from '../i18n/hu/ui';
import { SkillFxOverlay, SkillFxState } from './SkillFxOverlay';
import { getPawnSkinMeta, pawnSkinFrameUrl } from '../lib/pawnSkins';

/** Vízszintes / függőleges sáv: résvastagság / cella arány (korábbi 14px / 36px mobil cél). */
const GAP_TO_CELL = 14 / 36;
/** 9 oszlop cella + 8 függőleges rés → teljes szélesség = cella * ennyi. */
const WIDTH_UNITS = 9 + 8 * GAP_TO_CELL;
/** Kép-alapú bábu: átmérő / cella oldal (klasszikus korong: 0.61). */
const SKIN_PAWN_TO_CELL = 0.88;

interface BoardProps {
  state: GameState;
  wallMode: boolean;
  onMove: (r: number, c: number) => void;
  onWallPlace: (r: number, c: number, orient: 'h' | 'v') => void;
  animating: boolean;
  disabled: boolean;
  targetingSkill?: SkillType | null;
  onSkillTarget?: (r: number, c: number) => void;
  /** null: helyi képernyő — mindenki látja a csapda ikonokat; egyébként csak saját/csapat csapdák. */
  boardViewerIndex?: number | null;
  trapHitFlash?: { r: number; c: number } | null;
  /** Kincsmód: saját mezőre koppintás = ásás (ha kincs alattad), ha máshova lépsz, az ásás kimarad. */
  onTreasureDig?: () => void;
  /** Ha false, nincs arany kiemelés (pl. tele a skill-slot), de a koppintás továbbra is jelezhet. */
  treasureDigHighlight?: boolean;
  /** Skill / dig animációs overlay állapota. */
  skillFx?: SkillFxState | null;
  /** Játékosonkénti bábu skin (`pawnSkins` id), null/üres = klasszikus korong. */
  pawnSkinIds?: (string | null | undefined)[] | null;
}

function PawnToken({
  playerIndex,
  color,
  skinId,
  pawnCls,
  pawnSkinCls,
  gridRow,
  gridColumn,
}: {
  playerIndex: number;
  color: string;
  skinId: string | null | undefined;
  pawnCls: string;
  pawnSkinCls: string;
  gridRow: number;
  gridColumn: number;
}) {
  const meta = skinId ? getPawnSkinMeta(skinId) : null;
  const [frameIdx, setFrameIdx] = useState(0);

  useEffect(() => {
    if (!meta || meta.frameCount <= 1) return;
    const ms = 1000 / Math.max(0.5, meta.fps);
    const t = window.setInterval(() => {
      setFrameIdx(f => (f + 1) % meta.frameCount);
    }, ms);
    return () => window.clearInterval(t);
  }, [meta?.id, meta?.frameCount, meta?.fps]);

  if (meta) {
    const src = pawnSkinFrameUrl(meta, meta.frameCount <= 1 ? 0 : frameIdx);
    return (
      <motion.div
        key={`pawn-${playerIndex}`}
        className={cn(pawnSkinCls, 'rounded-full z-20 pointer-events-none overflow-hidden border-2 border-solid')}
        layout
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          gridRow,
          gridColumn,
          justifySelf: 'center',
          alignSelf: 'center',
          borderColor: `${color}cc`,
          boxShadow: `0 3px 12px ${color}99, 0 0 16px ${color}44`,
          background: `${color}18`,
        }}
      >
        <img
          src={src}
          alt=""
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`pawn-${playerIndex}`}
      className={cn(pawnCls, 'rounded-full z-20 pointer-events-none')}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        gridRow,
        gridColumn,
        justifySelf: 'center',
        alignSelf: 'center',
        background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color}, ${color}88)`,
        boxShadow: `0 3px 12px ${color}99, 0 0 20px ${color}66`,
      }}
    />
  );
}

export function QuoridorBoard({
  state, wallMode, onMove, onWallPlace, animating, disabled, targetingSkill, onSkillTarget,
  boardViewerIndex = null,
  trapHitFlash = null,
  onTreasureDig,
  treasureDigHighlight = true,
  skillFx = null,
  pawnSkinIds = null,
}: BoardProps) {
  const measureRef = useRef<HTMLDivElement>(null);
  /** Pixelben: teljes 9×9 rács beférjen; c * WIDTH_UNITS ≈ szélesség, ugyanígy magasság. */
  const [cellPx, setCellPx] = useState(26);
  const gapPx = cellPx * GAP_TO_CELL;

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const compute = () => {
      const padFrame = 16;
      const availW = Math.max(0, el.clientWidth - padFrame);
      const top = el.getBoundingClientRect().top;
      const vv = window.visualViewport;
      const vh = vv?.height ?? window.innerHeight;
      const reservedBelow = 200;
      const availH = Math.max(48, vh - top - reservedBelow);
      const wide = window.matchMedia('(min-width: 768px)').matches;
      const cap = wide ? 56 : 40;
      const floor = 20;
      const byW = availW / WIDTH_UNITS;
      const byH = availH / WIDTH_UNITS;
      const c = Math.min(cap, Math.max(floor, Math.min(byW, byH)));
      setCellPx(Math.round(c * 100) / 100);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', compute);
    vv?.addEventListener('scroll', compute);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      vv?.removeEventListener('resize', compute);
      vv?.removeEventListener('scroll', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);

  const cellCls = "w-[length:var(--qc)] h-[length:var(--qc)]";
  const gapHCls = "w-[length:var(--qc)] h-[length:var(--qg)]";
  const gapVCls = "w-[length:var(--qg)] h-[length:var(--qc)]";
  const gapBothCls = "w-[length:var(--qg)] h-[length:var(--qg)]";
  const pawnCls = "w-[length:var(--qp)] h-[length:var(--qp)]";
  const pawnSkinCls = "w-[length:var(--qpsk)] h-[length:var(--qpsk)]";

  const gridCssVars = useMemo(
    () =>
      ({
        '--qc': `${cellPx}px`,
        '--qg': `${gapPx}px`,
        '--qp': `${Math.round(cellPx * 0.61 * 100) / 100}px`,
        '--qpsk': `${Math.round(cellPx * SKIN_PAWN_TO_CELL * 100) / 100}px`,
      }) as React.CSSProperties,
    [cellPx, gapPx]
  );

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
    if (!entering) {
      setHoveredWall(null);
      return;
    }
    if (targetingSkill) return;
    const canWallPreview = wallMode || (state.players[state.turn]?.walls ?? 0) > 0;
    if (!canWallPreview || state.gameOver || animating || disabled) return;
    if (!wallMode && isGapBetweenPlayerAndValidMove(state, vr, vc)) {
      setHoveredWall(null);
      return;
    }
    const wp = wallFromGapVisual(vr, vc, 'h');
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

    if (targetingSkill === 'DYNAMITE') {
      // Saroknál 'h'-t próbál először, majd 'v'-t — nem-saroknál wallFromGapVisual auto-detektál
      const wpDyn = wallFromGapVisual(vr, vc, 'h') ?? wallFromGapVisual(vr, vc, 'v');
      if (wpDyn && onSkillTarget) {
        onSkillTarget(wpDyn.r, wpDyn.c);
      }
      return;
    }

    if (targetingSkill) return;

    const wallsLeft = state.players[state.turn]?.walls ?? 0;
    if (wallsLeft <= 0) return;

    const tryPlace = (w: Wall): boolean => {
      if (!isValidWall(state, w.r, w.c, w.orient)) return false;
      setHoveredWall(null);
      onWallPlace(w.r, w.c, w.orient);
      return true;
    };

    // Mindkét módban: saroknál mindkét irányt megpróbálja (h elsőként), nem-saroknál a geometria dönt.
    const isCorner = vr % 2 === 1 && vc % 2 === 1;
    if (!wallMode && isGapBetweenPlayerAndValidMove(state, vr, vc)) return;

    if (isCorner) {
      for (const o of ['h', 'v'] as const) {
        const w = v2w(vr, vc, o);
        if (w && tryPlace(w)) return;
      }
      return;
    }

    const wp = wallFromGapVisual(vr, vc, 'h'); // nem-saroknál az irány geometriából adódik
    if (wp) tryPlace(wp);
  };

  const handleCellClick = (r: number, c: number) => {
    if (state.gameOver || animating || disabled) return;
    
    if (targetingSkill === 'TELEPORT') {
      if (onSkillTarget) {
        const p = state.players[state.turn];
        const dist = Math.abs(p.r - r) + Math.abs(p.c - c);
        const noPawnHere = !state.players.some((pl, idx) => idx !== state.turn && pl.r === r && pl.c === c);
        if (dist <= 2 && dist > 0 && noPawnHere && !isTrenchCell(state, r, c)) {
          onSkillTarget(r, c);
        }
      }
      return;
    }

    if (targetingSkill === 'TRAP' && state.treasureMode) {
      if (onSkillTarget && isValidTrapPlacement(state, r, c)) {
        onSkillTarget(r, c);
      }
      return;
    }

    if (wallMode) return;

    if (state.treasureMode && onTreasureDig) {
      const p = state.players[state.turn];
      if (
        p.r === r &&
        p.c === c &&
        state.treasures?.some(t => t.r === r && t.c === c)
      ) {
        onTreasureDig();
        return;
      }
    }

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
            const dist = Math.abs(p.r - r) + Math.abs(p.c - c);
            const noPawnHere = !state.players.some((pl, idx) => idx !== state.turn && pl.r === r && pl.c === c);
            if (dist <= 2 && dist > 0 && noPawnHere && !isTrenchCell(state, r, c)) isTeleportTarget = true;
          }

          let isTrapTarget = false;
          if (targetingSkill === 'TRAP' && state.treasureMode && isValidTrapPlacement(state, r, c) && !isTrenchCell(state, r, c)) {
            isTrapTarget = true;
          }

          const isTrench = isTrenchCell(state, r, c);

          const hasTreasure = state.treasureMode && state.treasures?.some(t => t.r === r && t.c === c);
          const isOwnTreasureDig =
            Boolean(
              onTreasureDig &&
                treasureDigHighlight &&
                hasTreasure &&
                !targetingSkill &&
                !wallMode &&
                r === state.players[state.turn].r &&
                c === state.players[state.turn].c
            );
          const hasTrap =
            state.treasureMode &&
            state.traps?.some(t => {
              if (t.r !== r || t.c !== c) return false;
              if (boardViewerIndex === null) return true;
              return viewerSeesTrapMarker(state, boardViewerIndex, t.owner);
            });

          cells.push(
            <div
              key={key}
              title={isOwnTreasureDig ? hu.game.digTapOwnCellHint : undefined}
              className={cn(
                cellCls,
                "touch-manipulation select-none [-webkit-tap-highlight-color:transparent] rounded-sm relative transition-colors duration-200 flex items-center justify-center active:brightness-95",
                isTrench
                  ? "bg-[#1a120c] ring-1 ring-inset ring-black/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.55)] cursor-default pointer-events-auto"
                  : "bg-[#c4956a]",
                r === 8 && !isTrench && "shadow-[inset_0_-3px_0_#e74c3c]",
                r === 0 && !isTrench && "shadow-[inset_0_3px_0_#2c3e50]",
                c === 8 && !isTrench && "shadow-[inset_-3px_0_0_#27ae60]",
                c === 0 && !isTrench && "shadow-[inset_3px_0_0_#8e44ad]",
                isValidMove && !wallMode ? "relative z-[8] bg-[rgba(76,175,80,0.4)] cursor-pointer" :
                isOwnTreasureDig ? "bg-[rgba(232,184,48,0.35)] cursor-pointer ring-2 ring-[#e8b830]/90 ring-offset-1 ring-offset-[#2a1810] shadow-[0_0_14px_rgba(232,184,48,0.45)]" :
                isTrapTarget ? "bg-[rgba(251,146,60,0.45)] cursor-pointer shadow-[0_0_12px_rgba(251,146,60,0.55)]" :
                isTeleportTarget ? "bg-[rgba(232,184,48,0.4)] cursor-pointer shadow-[0_0_10px_rgba(232,184,48,0.6)]" :
                !isTrench ? "hover:bg-[#d4a87a] cursor-pointer" : ""
              )}
              style={{ gridRow: vr + 1, gridColumn: vc + 1 }}
              onClick={() => handleCellClick(r, c)}
            >
              {hasTreasure && (
                <span className="text-[#e8b830] font-bold text-xl drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">?</span>
              )}
              {hasTrap && (
                <span className="text-[#e74c3c] text-lg drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]" title="Csapda (csak a te/csapatod szemszögéből)">⚠</span>
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
                "touch-manipulation select-none [-webkit-tap-highlight-color:transparent] cursor-pointer rounded-sm relative transition-colors duration-150 active:brightness-95",
                wallMode ? "z-[10]" : "z-[1]",
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
    <div
      ref={measureRef}
      className="flex w-full max-w-full min-w-0 justify-center py-2 touch-manipulation select-none [-webkit-tap-highlight-color:transparent]"
    >
      <div className="bg-[#2a1810] p-2 md:p-3 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] relative max-w-full">
        <div
          className="grid grid-cols-[repeat(17,auto)] grid-rows-[repeat(17,auto)] gap-0 relative overscroll-contain mx-auto"
          style={gridCssVars}
        >
          {renderGrid()}

          {/* Pawns */}
          {state.players.map((p, i) => {
            const color = PLAYER_COLORS[i];
            const sid = pawnSkinIds?.[i];
            return (
              <PawnToken
                key={`pawn-${i}`}
                playerIndex={i}
                color={color}
                skinId={sid}
                pawnCls={pawnCls}
                pawnSkinCls={pawnSkinCls}
                gridRow={p.r * 2 + 1}
                gridColumn={p.c * 2 + 1}
              />
            );
          })}

          {trapHitFlash && (
            <motion.div
              key={`trapfx-${trapHitFlash.r}-${trapHitFlash.c}`}
              className={cn(cellCls, "z-[25] pointer-events-none flex items-center justify-center rounded-sm bg-[#e74c3c]/35 border-2 border-[#e74c3c]")}
              initial={{ scale: 0.35, opacity: 0 }}
              animate={{ scale: [1, 1.15, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{
                gridRow: trapHitFlash.r * 2 + 1,
                gridColumn: trapHitFlash.c * 2 + 1,
                justifySelf: 'center',
                alignSelf: 'center',
                boxShadow: '0 0 28px rgba(231,76,60,0.9)',
              }}
            >
              <Crosshair className="w-[55%] h-[55%] text-[#e74c3c] drop-shadow-[0_0_8px_rgba(0,0,0,0.9)]" strokeWidth={2.5} />
            </motion.div>
          )}

          {/* Skill / dig FX overlay — spans the full 17×17 grid as a proper
              grid item so its coordinates are guaranteed to match cell positions.
              position:relative lets children use absolute coords within it. */}
          {skillFx && (
            <div
              style={{
                gridRow: '1 / 18',
                gridColumn: '1 / 18',
                position: 'relative',
                zIndex: 28,
                pointerEvents: 'none',
                overflow: 'visible',
              }}
            >
              <SkillFxOverlay fx={skillFx} cellPx={cellPx} gapPx={gapPx} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
