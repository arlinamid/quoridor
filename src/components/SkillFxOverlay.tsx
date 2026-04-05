import React from 'react';
import { motion } from 'motion/react';
import { SkillType } from '../game/logic';

export interface SkillFxState {
  skill: SkillType | 'DIG';
  phase: 'pre' | 'post';
  actorIdx: number;
  actorPos: { r: number; c: number };
  target?: { r: number; c: number };
  /** SWAP: a partner eredeti pozíciója a csere előtt */
  partnerPos?: { r: number; c: number };
  /** MAGNET / SKIP: az érintett ellenfél pozíciók */
  opponents?: Array<{ r: number; c: number }>;
}

export const SKILL_FX_PRE_MS: Record<SkillType | 'DIG', number> = {
  TELEPORT: 500, HAMMER: 380, SKIP: 380, MOLE: 320,
  DYNAMITE: 550, SHIELD: 420, WALLS: 320, MAGNET: 480,
  TRAP: 380, SWAP: 480, DIG: 520,
};

export const SKILL_FX_POST_MS: Record<SkillType | 'DIG', number> = {
  TELEPORT: 420, HAMMER: 480, SKIP: 380, MOLE: 320,
  DYNAMITE: 700, SHIELD: 480, WALLS: 320, MAGNET: 480,
  TRAP: 380, SWAP: 520, DIG: 650,
};

const SKILL_COLORS: Record<SkillType | 'DIG', string> = {
  TELEPORT: '#a78bfa', HAMMER: '#f97316', SKIP: '#38bdf8',
  MOLE: '#a3e635',    DYNAMITE: '#ef4444', SHIELD: '#22d3ee',
  WALLS: '#f0c866',   MAGNET: '#f472b6',  TRAP: '#fb923c',
  SWAP: '#34d399',    DIG: '#f0c866',
};

interface Props {
  fx: SkillFxState;
  cellPx: number;
  gapPx: number;
}

export function SkillFxOverlay({ fx, cellPx: rawCellPx, gapPx: rawGapPx }: Props) {
  const px = Math.max(4, Number.isFinite(rawCellPx) && rawCellPx > 0 ? rawCellPx : 26);
  const gpx = Number.isFinite(rawGapPx) && rawGapPx >= 0 ? rawGapPx : px * (14 / 36);
  const step = px + gpx;
  const color = SKILL_COLORS[fx.skill];
  const boardSize = 9 * px + 8 * gpx;

  // Pixel center of board cell (r, c) within the grid coordinate system
  const cxOf = (c: number) => c * step + px / 2;
  const cyOf = (r: number) => r * step + px / 2;

  const { actorPos: ap, target: tp, partnerPos: pp, opponents: ops } = fx;
  const ar = ap.r, ac = ap.c;

  // ── Primitives ────────────────────────────────────────────────────────────

  /** Expanding ring from the top-left corner of a cell */
  const ring = (r: number, c: number, idx: number, maxScale = 2.5, col = color) => (
    <motion.div
      key={`ring-${r}-${c}-${idx}-${fx.phase}`}
      style={{
        position: 'absolute',
        left: c * step,
        top: r * step,
        width: px,
        height: px,
        borderRadius: '50%',
        border: `${Math.max(1.5, px * 0.055)}px solid ${col}`,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0.35, opacity: 0.9 }}
      animate={{ scale: maxScale, opacity: 0 }}
      transition={{ duration: 0.48, delay: idx * 0.13, ease: 'easeOut' }}
    />
  );

  /** Radial glow blob at a cell */
  const glow = (r: number, c: number, key: string, maxScale = 1.8, col = color) => (
    <motion.div
      key={key}
      style={{
        position: 'absolute',
        left: c * step,
        top: r * step,
        width: px,
        height: px,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${col}bb 0%, ${col}22 60%, transparent 100%)`,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0.35, opacity: 0 }}
      animate={{ scale: [0.35, maxScale, maxScale * 0.65], opacity: [0, 1, 0] }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );

  /** Particle burst from center of a cell */
  const sparks = (r: number, c: number, count: number, dist = 1.0, col = color, phase = fx.phase) =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const sz = Math.max(3, px * 0.15);
      return (
        <motion.div
          key={`spark-${r}-${c}-${i}-${phase}`}
          style={{
            position: 'absolute',
            left: cxOf(c) - sz / 2,
            top: cyOf(r) - sz / 2,
            width: sz,
            height: sz,
            borderRadius: '50%',
            background: col,
            boxShadow: `0 0 ${px * 0.28}px ${col}`,
            pointerEvents: 'none',
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(angle) * px * dist,
            y: Math.sin(angle) * px * dist,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.55, delay: i * 0.025, ease: 'easeOut' }}
        />
      );
    });

  /** SVG overlay for path-based effects */
  const svgLayer = (children: React.ReactNode) => (
    <svg
      key="svg-layer"
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
      width={boardSize}
      height={boardSize}
    >
      {children}
    </svg>
  );

  /** Animated quadratic-bezier arc between two cells */
  const arc = (r1: number, c1: number, r2: number, c2: number, dashed = false, key = 'arc') => {
    const x1 = cxOf(c1), y1 = cyOf(r1);
    const x2 = cxOf(c2), y2 = cyOf(r2);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - px * 1.4;
    return (
      <motion.path
        key={key}
        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
        stroke={color}
        strokeWidth={Math.max(1.5, px * 0.055)}
        fill="none"
        strokeDasharray={dashed ? '7 4' : undefined}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      />
    );
  };

  /** Animated straight line between two cells */
  const line = (r1: number, c1: number, r2: number, c2: number, key = 'line') => (
    <motion.path
      key={key}
      d={`M ${cxOf(c1)} ${cyOf(r1)} L ${cxOf(c2)} ${cyOf(r2)}`}
      stroke={color}
      strokeWidth={Math.max(1.5, px * 0.05)}
      fill="none"
      strokeDasharray="5 3"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: [0, 0.85, 0.5] }}
      transition={{ duration: 0.42, ease: 'easeOut' }}
    />
  );

  // ── Per-skill pre-effects ──────────────────────────────────────────────────

  const renderPre = () => {
    switch (fx.skill) {
      case 'TELEPORT':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.1)}
            {ring(ar, ac, 0)}
            {ring(ar, ac, 1)}
            {tp && svgLayer(
              <>
                {arc(ar, ac, tp.r, tp.c, true, 'tp-arc')}
                <g transform={`translate(${cxOf(tp.c)} ${cyOf(tp.r)})`}>
                  <motion.g
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1, 0] }}
                    transition={{ duration: 0.42, delay: 0.15, ease: 'easeOut' }}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={Math.max(2, px * 0.44)}
                      fill="none"
                      stroke={color}
                      strokeWidth={Math.max(1.5, px * 0.055)}
                    />
                  </motion.g>
                </g>
              </>
            )}
          </>
        );

      case 'HAMMER':
        return tp ? (
          <>
            {glow(tp.r, tp.c, 'g-target', 1.9)}
            {ring(tp.r, tp.c, 0, 1.8)}
            {ring(tp.r, tp.c, 1, 1.8)}
          </>
        ) : null;

      case 'SKIP':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.3)}
            {ring(ar, ac, 0, 2.6)}
            {ring(ar, ac, 1, 2.6)}
            {ring(ar, ac, 2, 2.6)}
          </>
        );

      case 'MOLE':
        return (
          <>
            {glow(ar, ac, 'g-actor', 1.8)}
            {sparks(ar, ac, 5, 0.55)}
          </>
        );

      case 'DYNAMITE':
        return tp ? (
          <>
            {glow(tp.r, tp.c, 'g-target', 1.6)}
            {sparks(tp.r, tp.c, 6, 0.6, '#f97316')}
          </>
        ) : null;

      case 'SHIELD':
        return (
          <>
            {glow(ar, ac, 'g-actor', 1.9)}
            {svgLayer(
              <>
                <g transform={`translate(${cxOf(ac)} ${cyOf(ar)})`}>
                  <motion.g
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1] }}
                    transition={{ duration: 0.42, ease: 'easeOut' }}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={Math.max(2, px * 0.82)}
                      stroke={color}
                      strokeWidth={Math.max(2, px * 0.07)}
                      fill="none"
                    />
                  </motion.g>
                </g>
                <g transform={`translate(${cxOf(ac)} ${cyOf(ar)})`}>
                  <motion.g
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1], opacity: [0, 0.8, 0] }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <circle
                      cx={0}
                      cy={0}
                      r={Math.max(2, px * 1.12)}
                      stroke={`${color}55`}
                      strokeWidth={Math.max(1, px * 0.04)}
                      fill="none"
                      strokeDasharray="4 3"
                    />
                  </motion.g>
                </g>
              </>
            )}
          </>
        );

      case 'WALLS':
        return (
          <>
            {glow(ar, ac, 'g-actor', 1.7)}
            {Array.from({ length: 3 }, (_, i) => (
              <motion.div
                key={`wplus-${i}`}
                style={{
                  position: 'absolute',
                  left: cxOf(ac) - px * 0.13 + (i - 1) * px * 0.3,
                  top: cyOf(ar),
                  fontSize: Math.max(10, px * 0.38),
                  color,
                  fontWeight: 'bold',
                  textShadow: `0 0 8px ${color}`,
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: -px * 0.8, opacity: 0 }}
                transition={{ duration: 0.42, delay: i * 0.07, ease: 'easeOut' }}
              >
                +
              </motion.div>
            ))}
          </>
        );

      case 'MAGNET':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.3)}
            {ops && ops.length > 0 && svgLayer(
              ops.map((opp, i) => line(ar, ac, opp.r, opp.c, `mag-ln-${i}`))
            )}
          </>
        );

      case 'TRAP':
        return tp ? (
          <>
            {glow(tp.r, tp.c, 'g-target', 1.7)}
            {ring(tp.r, tp.c, 0, 1.7)}
            {ring(tp.r, tp.c, 1, 1.7)}
          </>
        ) : null;

      case 'SWAP':
        return (
          <>
            {glow(ar, ac, 'g-actor', 1.9)}
            {pp && (
              <>
                {glow(pp.r, pp.c, 'g-partner', 1.9)}
                {svgLayer(arc(ar, ac, pp.r, pp.c, false, 'swap-arc'))}
              </>
            )}
          </>
        );

      case 'DIG':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.1)}
            {ring(ar, ac, 0, 2.3)}
            {ring(ar, ac, 1, 2.3)}
            {sparks(ar, ac, 6, 0.7, '#e8b830')}
          </>
        );

      default:
        return null;
    }
  };

  // ── Per-skill post-effects ────────────────────────────────────────────────

  const renderPost = () => {
    switch (fx.skill) {
      case 'TELEPORT':
        return (
          <>
            {ring(ar, ac, 0, 2.8)}
            {tp && (
              <>
                {glow(tp.r, tp.c, 'g-dest', 2.6)}
                {ring(tp.r, tp.c, 0, 3.0)}
                {ring(tp.r, tp.c, 1, 3.0)}
                {sparks(tp.r, tp.c, 7, 0.75)}
              </>
            )}
          </>
        );

      case 'HAMMER':
        return tp ? (
          <>
            {glow(tp.r, tp.c, 'g-target', 2.7)}
            {sparks(tp.r, tp.c, 9, 1.1)}
          </>
        ) : null;

      case 'SKIP':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.1)}
            {ring(ar, ac, 0, 3.1)}
            {ring(ar, ac, 1, 3.1)}
          </>
        );

      case 'MOLE':
        return (
          <>
            {glow(ar, ac, 'g-actor', 1.6)}
            {ring(ar, ac, 0, 1.9)}
          </>
        );

      case 'DYNAMITE':
        return tp ? (
          <>
            {glow(tp.r, tp.c, 'g-target', 3.2)}
            {sparks(tp.r, tp.c, 12, 1.5, '#f97316')}
            {([1.3, 2.1, 3.0] as const).map((s, i) => (
              <motion.div
                key={`blast-${i}`}
                style={{
                  position: 'absolute',
                  left: tp.c * step,
                  top: tp.r * step,
                  width: px,
                  height: px,
                  borderRadius: '50%',
                  border: `${Math.max(2, px * 0.07)}px solid ${i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#fbbf24'}`,
                  pointerEvents: 'none',
                }}
                initial={{ scale: 0.2, opacity: 1 }}
                animate={{ scale: s * 2.8, opacity: 0 }}
                transition={{ duration: 0.72, delay: i * 0.1, ease: 'easeOut' }}
              />
            ))}
          </>
        ) : null;

      case 'SHIELD':
        return (
          <>
            {ring(ar, ac, 0, 2.1)}
            {ring(ar, ac, 1, 2.1)}
            {svgLayer(
              <motion.circle
                cx={cxOf(ac)}
                cy={cyOf(ar)}
                r={Math.max(2, px * 0.82)}
                stroke={color}
                strokeWidth={Math.max(2, px * 0.07)}
                fill={`${color}15`}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.55, 0] }}
                transition={{ duration: 0.55 }}
              />
            )}
          </>
        );

      case 'WALLS':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.3)}
            {ring(ar, ac, 0, 2.1)}
            {ring(ar, ac, 1, 2.1)}
          </>
        );

      case 'MAGNET':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.7)}
            {ops && ops.map((opp, i) => (
              <React.Fragment key={`mag-post-${i}`}>
                {ring(opp.r, opp.c, 0, 1.6, color)}
              </React.Fragment>
            ))}
          </>
        );

      case 'TRAP':
        return tp ? glow(tp.r, tp.c, 'g-target', 1.6) : null;

      case 'SWAP':
        return (
          <>
            {glow(ar, ac, 'g-actor', 2.7)}
            {sparks(ar, ac, 6, 0.85)}
            {pp && (
              <>
                {glow(pp.r, pp.c, 'g-partner', 2.7)}
                {sparks(pp.r, pp.c, 6, 0.85)}
              </>
            )}
          </>
        );

      case 'DIG':
        return (
          <>
            {glow(ar, ac, 'g-actor', 3.2)}
            {ring(ar, ac, 0, 3.3)}
            {ring(ar, ac, 1, 3.3)}
            {ring(ar, ac, 2, 3.3)}
            {sparks(ar, ac, 9, 1.25, '#e8b830')}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 28,
        overflow: 'visible',
      }}
    >
      {fx.phase === 'pre' ? renderPre() : renderPost()}
    </div>
  );
}
