import React from 'react';
import { motion } from 'motion/react';
import { User } from 'lucide-react';

interface AuthViewProps {
  usernameInput: string;
  onUsernameChange: (v: string) => void;
  onGuestLogin: () => void;
  isSupabaseConfigured: boolean;
  onTos: () => void;
  onPrivacy: () => void;
}

export function AuthView({ usernameInput, onUsernameChange, onGuestLogin, isSupabaseConfigured, onTos, onPrivacy }: AuthViewProps) {
  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center w-full max-w-md p-6"
    >
      <div className="text-center mb-10">
        <h1 className="font-['Cinzel',serif] text-5xl font-black tracking-[10px] text-[#f0c866] drop-shadow-[0_0_40px_rgba(240,200,102,0.35)]">
          QUORIDOR
        </h1>
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#f0c866] to-transparent mx-auto my-4" />
        <div className="text-sm text-[#a89078] tracking-[4px] uppercase">Jelentkezz be a játékhoz</div>
      </div>

      <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs text-[#a89078] uppercase tracking-wider">Felhasználónév (opcionális)</label>
          <input
            type="text"
            placeholder="Pl. SakkMester99"
            value={usernameInput}
            onChange={e => onUsernameChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onGuestLogin()}
            maxLength={15}
            className="w-full bg-[#241810] border border-[#f0c866]/30 rounded-lg px-4 py-3 text-[#f5e6d3] focus:outline-none focus:border-[#f0c866] transition-colors"
          />
        </div>

        <button
          onClick={onGuestLogin}
          className="w-full relative overflow-hidden bg-[#241810] border border-[#f0c866]/50 text-[#f0c866] font-bold py-4 px-6 rounded-lg tracking-wider transition-all hover:bg-[#f0c866]/10 hover:border-[#f0c866] hover:shadow-[0_0_20px_rgba(240,200,102,0.2)] flex items-center justify-center gap-3"
        >
          <User size={20} />
          Játssz Vendégként (Anonim)
        </button>

        {!isSupabaseConfigured && (
          <div className="text-xs text-center text-amber-500/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            A Supabase nincs konfigurálva. A játék lokális módban indul.
          </div>
        )}

        <div className="text-center text-xs text-[#a89078] mt-2 flex flex-col gap-2">
          <p>A játék használatával elfogadod a feltételeket.</p>
          <div className="flex justify-center gap-4">
            <button onClick={onTos} className="hover:text-[#f0c866] underline decoration-white/20 underline-offset-4 transition-colors">ÁSZF</button>
            <button onClick={onPrivacy} className="hover:text-[#f0c866] underline decoration-white/20 underline-offset-4 transition-colors">Adatvédelem</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
