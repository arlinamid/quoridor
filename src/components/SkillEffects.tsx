import { motion, AnimatePresence } from 'motion/react';
import React from 'react';

export type SkillEffectType = 
  | 'TELEPORT' | 'HAMMER' | 'SKIP' | 'MOLE' | 'DYNAMITE' 
  | 'SHIELD' | 'WALLS' | 'MAGNET' | 'TRAP' | 'SWAP';

export interface SkillEffectProps {
  type: SkillEffectType;
  position?: { r: number; c: number };
  playerPosition?: { r: number; c: number };
  targetPosition?: { r: number; c: number };
  onComplete?: () => void;
  cellSize?: number;
}

const CELL_SIZE = 44; // Default cell size in pixels
const BOARD_OFFSET = 8; // Offset for board positioning

const posToPixels = (r: number, c: number, cellSize: number) => ({
  x: c * cellSize + cellSize / 2,
  y: r * cellSize + cellSize / 2,
});

// ── Particle Component ────────────────────────────────────────────────────────
interface ParticleProps {
  x: number;
  y: number;
  color: string;
  size: number;
  vx: number;
  vy: number;
  delay?: number;
  duration?: number;
}

function Particle({ x, y, color, size, vx, vy, delay = 0, duration = 0.6 }: ParticleProps) {
  return (
    <motion.div
      initial={{ x, y, opacity: 1, scale: 0 }}
      animate={{
        x: x + vx * 60,
        y: y + vy * 60,
        opacity: 0,
        scale: [0, 1.2, 0.8, 0],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 ${size}px ${color}`,
      }}
    />
  );
}

// ── Teleport Effect ───────────────────────────────────────────────────────────
function TeleportEffect({ position, playerPosition, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    angle: (i / 12) * Math.PI * 2,
    speed: 2 + Math.random() * 2,
  }));

  return (
    <>
      {/* Disappear effect at old position */}
      {playerPosition && (
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeIn" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: posToPixels(playerPosition.r, playerPosition.c, cellSize).x - 20,
            top: posToPixels(playerPosition.r, playerPosition.c, cellSize).y - 20,
            width: 40,
            height: 40,
            background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
          }}
        />
      )}
      
      {/* Appear effect at new position */}
      {position && (
        <>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: posToPixels(position.r, position.c, cellSize).x - 30,
              top: posToPixels(position.r, position.c, cellSize).y - 30,
              width: 60,
              height: 60,
              background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)',
              boxShadow: '0 0 30px #a78bfa',
            }}
          />
          {particles.map((p, i) => {
            const center = posToPixels(position.r, position.c, cellSize);
            return (
              <Particle
                key={i}
                x={center.x}
                y={center.y}
                color="#a78bfa"
                size={6}
                vx={Math.cos(p.angle) * p.speed}
                vy={Math.sin(p.angle) * p.speed}
                delay={0.2 + i * 0.02}
              />
            );
          })}
        </>
      )}
    </>
  );
}

// ── Hammer Effect ─────────────────────────────────────────────────────────────
function HammerEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  return (
    <>
      {/* Hammer swing animation */}
      <motion.div
        initial={{ rotate: -45, x: -30, y: -30, scale: 0.8 }}
        animate={{ rotate: 60, x: 10, y: 10, scale: 1.2 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="absolute pointer-events-none z-20"
        style={{
          left: position ? posToPixels(position.r, position.c, cellSize).x - 20 : 0,
          top: position ? posToPixels(position.r, position.c, cellSize).y - 20 : 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
            borderRadius: '8px',
            boxShadow: '0 0 20px #f97316',
          }}
        />
      </motion.div>
      
      {/* Impact flash */}
      {position && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: posToPixels(position.r, position.c, cellSize).x - 40,
            top: posToPixels(position.r, position.c, cellSize).y - 40,
            width: 80,
            height: 80,
            background: 'radial-gradient(circle, #fef3c7 0%, #f97316 50%, transparent 70%)',
          }}
        />
      )}
      
      {/* Debris particles */}
      {position && Array.from({ length: 8 }, (_, i) => {
        const center = posToPixels(position.r, position.c, cellSize);
        const angle = (i / 8) * Math.PI * 2;
        return (
          <Particle
            key={i}
            x={center.x}
            y={center.y}
            color="#f97316"
            size={8}
            vx={Math.cos(angle) * (3 + Math.random() * 2)}
            vy={Math.sin(angle) * (3 + Math.random() * 2)}
            delay={0.2}
          />
        );
      })}
    </>
  );
}

// ── Skip Effect ───────────────────────────────────────────────────────────────
function SkipEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Clock animation */}
      <motion.svg
        initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        exit={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 30,
          top: center.y - 30,
          width: 60,
          height: 60,
        }}
      >
        <circle cx="30" cy="30" r="28" fill="none" stroke="#38bdf8" strokeWidth="3" />
        <motion.line
          x1="30"
          y1="30"
          x2="30"
          y2="10"
          stroke="#38bdf8"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformOrigin: '30px 30px' }}
        />
        <circle cx="30" cy="30" r="4" fill="#38bdf8" />
      </motion.svg>
      
      {/* Freeze rays */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 1.5, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              left: center.x - 40,
              top: center.y - 2,
              width: 80,
              height: 4,
              background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
              transformOrigin: 'center',
              transform: `rotate(${angle * 180 / Math.PI}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

// ── Mole Effect ───────────────────────────────────────────────────────────────
function MoleEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Underground tunnel effect */}
      <motion.div
        initial={{ scaleY: 0, opacity: 1 }}
        animate={{ scaleY: 1.5, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeIn" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 20,
          top: center.y - 10,
          width: 40,
          height: 20,
          background: 'linear-gradient(to bottom, #a3e635 0%, #65a30d 100%)',
          borderRadius: '50%',
        }}
      />
      
      {/* Dirt particles */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        return (
          <Particle
            key={i}
            x={center.x}
            y={center.y}
            color="#a3e635"
            size={5}
            vx={Math.cos(angle) * speed}
            vy={Math.sin(angle) * speed - 1}
            delay={i * 0.03}
          />
        );
      })}
      
      {/* Emerging effect */}
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.5 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 15,
          top: center.y - 15,
          width: 30,
          height: 30,
          background: 'radial-gradient(circle, #a3e635 0%, transparent 70%)',
        }}
      />
    </>
  );
}

// ── Dynamite Effect ───────────────────────────────────────────────────────────
function DynamiteEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Fuse burning */}
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: [1, 1, 0], scale: [1, 1.2, 0] }}
        transition={{ duration: 0.8, times: [0, 0.7, 1] }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 10,
          top: center.y - 10,
          width: 20,
          height: 20,
          background: 'radial-gradient(circle, #ef4444 0%, #dc2626 50%, transparent 70%)',
          borderRadius: '50%',
          boxShadow: '0 0 15px #ef4444',
        }}
      />
      
      {/* Explosion flash */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 60,
          top: center.y - 60,
          width: 120,
          height: 120,
          background: 'radial-gradient(circle, #fef3c7 0%, #f97316 30%, #ef4444 60%, transparent 80%)',
          borderRadius: '50%',
        }}
      />
      
      {/* Shockwave ring */}
      <motion.div
        initial={{ scale: 0, opacity: 1, borderWidth: 4 }}
        animate={{ scale: 2.5, opacity: 0, borderWidth: 0 }}
        transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
        className="absolute rounded-full pointer-events-none"
        style={{
          left: center.x - 40,
          top: center.y - 40,
          width: 80,
          height: 80,
          borderColor: '#ef4444',
          borderStyle: 'solid',
        }}
      />
      
      {/* Explosion particles */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const speed = 3 + Math.random() * 3;
        return (
          <Particle
            key={i}
            x={center.x}
            y={center.y}
            color={['#ef4444', '#f97316', '#fef3c7'][i % 3]}
            size={10}
            vx={Math.cos(angle) * speed}
            vy={Math.sin(angle) * speed}
            delay={0.6 + i * 0.02}
            duration={0.8}
          />
        );
      })}
    </>
  );
}

// ── Shield Effect ─────────────────────────────────────────────────────────────
function ShieldEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Shield formation */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 35,
          top: center.y - 35,
          width: 70,
          height: 70,
          border: '3px solid #22d3ee',
          borderRadius: '50%',
          boxShadow: '0 0 20px #22d3ee, inset 0 0 20px #22d3ee33',
          background: 'radial-gradient(circle, #22d3ee22 0%, transparent 70%)',
        }}
      />
      
      {/* Orbiting particles */}
      {Array.from({ length: 6 }, (_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="absolute pointer-events-none"
          style={{
            left: center.x,
            top: center.y,
            width: 8,
            height: 8,
            backgroundColor: '#22d3ee',
            borderRadius: '50%',
            boxShadow: '0 0 10px #22d3ee',
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2 + i * 0.2, repeat: Infinity, ease: "linear" }}
            style={{
              width: 60,
              height: 60,
              position: 'absolute',
              left: -30,
              top: -30,
              transformOrigin: 'center',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                backgroundColor: '#22d3ee',
                borderRadius: '50%',
                position: 'absolute',
                left: 0,
                top: 30,
              }}
            />
          </motion.div>
        </motion.div>
      ))}
      
      {/* Pulse glow */}
      <motion.div
        initial={{ scale: 1, opacity: 0.5 }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 40,
          top: center.y - 40,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #22d3ee44 0%, transparent 70%)',
        }}
      />
    </>
  );
}

// ── Walls Effect ──────────────────────────────────────────────────────────────
function WallsEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Golden particles converging */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const distance = 80;
        return (
          <motion.div
            key={i}
            initial={{
              x: center.x + Math.cos(angle) * distance,
              y: center.y + Math.sin(angle) * distance,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              x: center.x,
              y: center.y,
              opacity: 0,
              scale: 1,
            }}
            transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              width: 10,
              height: 10,
              backgroundColor: '#f0c866',
              borderRadius: '50%',
              boxShadow: '0 0 10px #f0c866',
            }}
          />
        );
      })}
      
      {/* Wall rising animation */}
      <motion.div
        initial={{ scaleY: 0, opacity: 0, y: 20 }}
        animate={{ scaleY: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 25,
          top: center.y - 25,
          width: 50,
          height: 50,
          background: 'linear-gradient(135deg, #f0c866 0%, #d4a843 100%)',
          borderRadius: '4px',
          boxShadow: '0 0 20px #f0c866, inset 0 0 10px #fef3c7',
        }}
      />
    </>
  );
}

// ── Magnet Effect ─────────────────────────────────────────────────────────────
function MagnetEffect({ position, playerPosition, targetPosition, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!playerPosition) return null;
  const center = posToPixels(playerPosition.r, playerPosition.c, cellSize);
  
  return (
    <>
      {/* Magnetic field expansion */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 60,
          top: center.y - 60,
          width: 120,
          height: 120,
          border: '3px dashed #f472b6',
          borderRadius: '50%',
          boxShadow: '0 0 30px #f472b6',
        }}
      />
      
      {/* Magnetic spark particles */}
      {Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <motion.div
            key={i}
            initial={{
              x: center.x + Math.cos(angle) * 50,
              y: center.y + Math.sin(angle) * 50,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              x: center.x + Math.cos(angle) * 20,
              y: center.y + Math.sin(angle) * 20,
              opacity: 0,
              scale: 1.5,
            }}
            transition={{ duration: 0.5, delay: i * 0.02, ease: "easeOut" }}
            className="absolute pointer-events-none"
            style={{
              width: 6,
              height: 6,
              backgroundColor: '#f472b6',
              borderRadius: '50%',
              boxShadow: '0 0 8px #f472b6',
            }}
          />
        );
      })}
      
      {/* Pulsing core */}
      <motion.div
        initial={{ scale: 1, opacity: 0.6 }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 20,
          top: center.y - 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #f472b6 0%, transparent 70%)',
          boxShadow: '0 0 30px #f472b6',
        }}
      />
    </>
  );
}

// ── Trap Effect ───────────────────────────────────────────────────────────────
function TrapEffect({ position, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!position) return null;
  const center = posToPixels(position.r, position.c, cellSize);
  
  return (
    <>
      {/* Stealthy placement */}
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -90 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 18,
          top: center.y - 18,
          width: 36,
          height: 36,
        }}
      >
        <svg viewBox="0 0 36 36" fill="none">
          <motion.path
            d="M18 4 L22 14 L32 14 L24 22 L28 32 L18 26 L8 32 L12 22 L4 14 L14 14 Z"
            fill="#fb923c"
            stroke="#c2410c"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </svg>
      </motion.div>
      
      {/* Subtle glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute pointer-events-none"
        style={{
          left: center.x - 25,
          top: center.y - 25,
          width: 50,
          height: 50,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fb923c44 0%, transparent 70%)',
        }}
      />
      
      {/* Settling dirt particles */}
      {Array.from({ length: 6 }, (_, i) => (
        <Particle
          key={i}
          x={center.x + (Math.random() - 0.5) * 30}
          y={center.y + (Math.random() - 0.5) * 30}
          color="#fb923c"
          size={4}
          vx={(Math.random() - 0.5) * 0.5}
          vy={Math.random() * 0.5 + 0.5}
          delay={i * 0.05}
        />
      ))}
    </>
  );
}

// ── Swap Effect ───────────────────────────────────────────────────────────────
function SwapEffect({ position, playerPosition, targetPosition, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  if (!playerPosition || !targetPosition) return null;
  const pos1 = posToPixels(playerPosition.r, playerPosition.c, cellSize);
  const pos2 = posToPixels(targetPosition.r, targetPosition.c, cellSize);
  const midX = (pos1.x + pos2.x) / 2;
  const midY = (pos1.y + pos2.y) / 2;
  
  return (
    <>
      {/* Portal circles */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="absolute rounded-full pointer-events-none"
        style={{
          left: pos1.x - 30,
          top: pos1.y - 30,
          width: 60,
          height: 60,
          border: '3px solid #34d399',
          boxShadow: '0 0 20px #34d399',
        }}
      />
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1.2, opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="absolute rounded-full pointer-events-none"
        style={{
          left: pos2.x - 30,
          top: pos2.y - 30,
          width: 60,
          height: 60,
          border: '3px solid #34d399',
          boxShadow: '0 0 20px #34d399',
        }}
      />
      
      {/* Arc motion indicators */}
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute pointer-events-none"
        style={{
          left: Math.min(pos1.x, pos2.x) - 40,
          top: Math.min(pos1.y, pos2.y) - 40,
          width: Math.abs(pos2.x - pos1.x) + 80,
          height: Math.abs(pos2.y - pos1.y) + 80,
        }}
      >
        <motion.path
          d={`M ${pos1.x - (Math.min(pos1.x, pos2.x) - 40)} ${pos1.y - (Math.min(pos1.y, pos2.y) - 40)} Q ${midX - (Math.min(pos1.x, pos2.x) - 40)} ${midY - 40 - (Math.min(pos1.y, pos2.y) - 40)} ${pos2.x - (Math.min(pos1.x, pos2.x) - 40)} ${pos2.y - (Math.min(pos1.y, pos2.y) - 40)}`}
          fill="none"
          stroke="#34d399"
          strokeWidth="2"
          strokeDasharray="5,5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.svg>
      
      {/* Swap particles */}
      {Array.from({ length: 8 }, (_, i) => {
        const t = i / 8;
        return (
          <motion.div
            key={i}
            initial={{ x: pos1.x, y: pos1.y, opacity: 1, scale: 0 }}
            animate={{
              x: pos2.x,
              y: pos2.y,
              opacity: 0,
              scale: 1,
            }}
            transition={{ duration: 0.5, delay: i * 0.03, ease: "easeInOut" }}
            className="absolute pointer-events-none"
            style={{
              width: 8,
              height: 8,
              backgroundColor: '#34d399',
              borderRadius: '50%',
              boxShadow: '0 0 10px #34d399',
            }}
          />
        );
      })}
    </>
  );
}

// ── Main Skill Effects Container ──────────────────────────────────────────────
export function SkillEffects({ type, position, playerPosition, targetPosition, onComplete, cellSize = CELL_SIZE }: SkillEffectProps) {
  const renderEffect = () => {
    switch (type) {
      case 'TELEPORT':
        return <TeleportEffect position={position} playerPosition={playerPosition} onComplete={onComplete} cellSize={cellSize} />;
      case 'HAMMER':
        return <HammerEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'SKIP':
        return <SkipEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'MOLE':
        return <MoleEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'DYNAMITE':
        return <DynamiteEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'SHIELD':
        return <ShieldEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'WALLS':
        return <WallsEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'MAGNET':
        return <MagnetEffect position={position} playerPosition={playerPosition} targetPosition={targetPosition} onComplete={onComplete} cellSize={cellSize} />;
      case 'TRAP':
        return <TrapEffect position={position} onComplete={onComplete} cellSize={cellSize} />;
      case 'SWAP':
        return <SwapEffect position={position} playerPosition={playerPosition} targetPosition={targetPosition} onComplete={onComplete} cellSize={cellSize} />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 pointer-events-none z-50"
        onAnimationComplete={onComplete}
      >
        {renderEffect()}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Screen Shake Component ────────────────────────────────────────────────────
export interface ScreenShakeProps {
  intensity?: 'light' | 'medium' | 'heavy';
  duration?: number;
}

export function ScreenShake({ intensity = 'medium', duration = 0.3 }: ScreenShakeProps) {
  const shakeValues = {
    light: { x: [-2, 2, -2, 2, 0], y: [-1, 1, -1, 1, 0] },
    medium: { x: [-4, 4, -4, 4, -2, 2, 0], y: [-2, 2, -2, 2, -1, 1, 0] },
    heavy: { x: [-8, 8, -8, 8, -4, 4, -2, 2, 0], y: [-4, 4, -4, 4, -2, 2, -1, 1, 0] },
  };

  return (
    <motion.div
      initial={{ x: 0, y: 0 }}
      animate={shakeValues[intensity]}
      transition={{ duration, times: Array.from({ length: shakeValues[intensity].x.length }, (_, i) => i / (shakeValues[intensity].x.length - 1)) }}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}
