import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

const DISMISS_KEY = 'quoridor_easter_warning_dismissed_2026';

export function SessionWarning() {
  const now = new Date();
  const start = new Date('2026-04-04T00:00:00');
  const end   = new Date('2026-04-09T00:00:00'); // up to and including April 8
  const isActive = now >= start && now < end;
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  if (!isActive || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-4xl px-4 pt-3"
      >
        <div className="relative bg-gradient-to-r from-[#1a0f08] via-[#241810] to-[#1a0f08] border border-[#f0c866]/50 rounded-xl px-5 py-3 flex items-center gap-3 shadow-[0_0_24px_rgba(240,200,102,0.15)]">
          <span className="text-2xl">🥚</span>
          <div className="flex-1 min-w-0">
            <span className="text-[#f0c866] font-bold text-sm tracking-wide">Húsvéti Esemény aktív!</span>
            <span className="text-[#c8b090] text-sm ml-2">
              Ritka Easter egg-ek jelennek meg a pályán. (2026. április 4–8.)
            </span>
          </div>
          <button
            onClick={dismiss}
            className="text-[#a89078] hover:text-[#f0c866] transition-colors shrink-0 p-1 rounded"
            title="Bezárás"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
