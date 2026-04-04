import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CollectibleType, CollectedItem, COLLECTIBLE_META } from '../lib/types';

interface EasterEggOverlayProps {
  onCollect: (item: CollectedItem) => void;
}

function rollEgg(): CollectibleType | null {
  const now = new Date();
  const isEvent = now >= new Date('2026-04-04') && now < new Date('2026-04-09');
  const roll = Math.random();
  if (isEvent) {
    // Easter event: higher rates
    if (roll < 0.005) return 'EGG_RAINBOW'; // 0.5%
    if (roll < 0.02)  return 'EGG_GOLD';    // 1.5%
    if (roll < 0.06)  return 'EGG_BASIC';   // 4%
  } else {
    // Normal: very rare
    if (roll < 0.0005) return 'EGG_RAINBOW'; // 0.05%
    if (roll < 0.002)  return 'EGG_GOLD';    // 0.15%
    if (roll < 0.005)  return 'EGG_BASIC';   // 0.3%
  }
  return null;
}

export function useEasterEggSpawner(
  active: boolean,         // true when game view is active and not game-over
  onCollect: (item: CollectedItem) => void
) {
  const [activeEgg, setActiveEgg] = useState<{ type: CollectibleType; x: number; y: number } | null>(null);

  const trySpawn = useCallback(() => {
    if (!active || activeEgg) return;
    const type = rollEgg();
    if (!type) return;
    // Random position on/near board: 10-90% of viewport
    const x = 15 + Math.random() * 70;
    const y = 20 + Math.random() * 55;
    setActiveEgg({ type, x, y });
  }, [active, activeEgg]);

  const collect = useCallback(() => {
    if (!activeEgg) return;
    const item: CollectedItem = { type: activeEgg.type, collectedAt: new Date().toISOString() };
    onCollect(item);
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
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, []);

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
