import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CollectibleType, COLLECTIBLE_META } from '../lib/types';

function rollEgg(): CollectibleType | null {
  const now = new Date();
  const isEvent = now >= new Date('2026-04-04') && now < new Date('2026-04-09');
  const roll = Math.random();
  if (isEvent) {
    // Easter event: boosted but throttled by useEasterEggSpawner (min gap between rolls)
    if (roll < 0.003) return 'EGG_RAINBOW'; // 0.3%
    if (roll < 0.012) return 'EGG_GOLD';    // 0.9%
    if (roll < 0.045) return 'EGG_BASIC';   // 3.3%
  } else {
    // Normal: very rare
    if (roll < 0.0005) return 'EGG_RAINBOW'; // 0.05%
    if (roll < 0.002)  return 'EGG_GOLD';    // 0.15%
    if (roll < 0.005)  return 'EGG_BASIC';   // 0.3%
  }
  return null;
}

/** Min real time between spawn *attempts* while in-game (turn changes can be very frequent). */
const MIN_MS_BETWEEN_SPAWN_ATTEMPTS = 28_000;

export function useEasterEggSpawner(
  active: boolean,
  onCollect: (eggType: CollectibleType) => void
) {
  const [activeEgg, setActiveEgg] = useState<{ type: CollectibleType; x: number; y: number } | null>(null);
  const lastSpawnAttemptRef = useRef(0);

  useEffect(() => {
    if (!active) lastSpawnAttemptRef.current = 0;
  }, [active]);

  const trySpawn = useCallback(() => {
    if (!active || activeEgg) return;
    const now = Date.now();
    if (now - lastSpawnAttemptRef.current < MIN_MS_BETWEEN_SPAWN_ATTEMPTS) return;
    lastSpawnAttemptRef.current = now;
    const type = rollEgg();
    if (!type) return;
    const x = 15 + Math.random() * 70;
    const y = 20 + Math.random() * 55;
    setActiveEgg({ type, x, y });
  }, [active, activeEgg]);

  const collect = useCallback(() => {
    if (!activeEgg) return;
    onCollect(activeEgg.type);
    setActiveEgg(null);
  }, [activeEgg, onCollect]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!activeEgg) return;
    const t = setTimeout(() => setActiveEgg(null), 8000);
    return () => clearTimeout(t);
  }, [activeEgg]);

  return { activeEgg, trySpawn, collect };
}

interface EasterEggFloaterProps {
  egg: { type: CollectibleType; x: number; y: number };
  onCollect: () => void;
}

export function EasterEggFloater({ egg, onCollect }: EasterEggFloaterProps) {
  const meta = COLLECTIBLE_META[egg.type];
  const [timeLeft, setTimeLeft] = useState(8);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [egg.type]); // reset when egg type changes (new egg spawned)

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={onCollect}
      className="fixed z-40 flex flex-col items-center gap-1 cursor-pointer"
      style={{ left: `${egg.x}%`, top: `${egg.y}%`, transform: 'translate(-50%, -50%)' }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
        className="relative"
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-lg"
          style={{
            background: `radial-gradient(circle, ${meta.color}22 0%, transparent 70%)`,
            border: `2px solid ${meta.color}88`,
            boxShadow: `0 0 20px ${meta.color}55`,
          }}
        >
          {meta.icon}
        </div>
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
          style={{ background: `radial-gradient(circle, ${meta.color}33 0%, transparent 70%)` }}
        />
      </motion.div>
      <div className="bg-[#1a0f08]/90 border border-[#f0c866]/30 rounded-full px-3 py-0.5 text-xs text-[#f0c866] font-bold tracking-wide whitespace-nowrap">
        Kattints! ({timeLeft}s)
      </div>
    </motion.button>
  );
}
