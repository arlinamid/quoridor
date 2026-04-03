import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User } from 'lucide-react';
import { Profile } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface LeaderboardViewProps {
  profile: Profile;
  leaderboardData: Profile[];
  tab: 'personal' | 'online';
  onTabChange: (t: 'personal' | 'online') => void;
  onBack: () => void;
  isSupabaseConfigured: boolean;
}

export function LeaderboardView({ profile, leaderboardData, tab, onTabChange, onBack, isSupabaseConfigured }: LeaderboardViewProps) {
  const xpForNextLevel = (profile.level) * (profile.level) * 100;
  const xpForCurrentLevel = (profile.level - 1) * (profile.level - 1) * 100;
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? ((profile.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
    : 0;

  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center w-full max-w-md p-6 mt-10"
    >
      <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase">
            Statisztika
          </h2>
        </div>

        <div className="flex w-full mb-6 border-b border-white/10">
          {(['personal', 'online'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={cn(
                "flex-1 pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2",
                tab === t ? "border-[#f0c866] text-[#f0c866]" : "border-transparent text-[#a89078] hover:text-white"
              )}
            >
              {t === 'personal' ? 'Saját Profil' : 'Ranglista'}
            </button>
          ))}
        </div>

        {tab === 'personal' ? (
          <>
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-[#241810] border-2 border-[#f0c866] flex items-center justify-center mb-4 relative">
                <User className="text-[#f0c866]" size={40} />
                <div className="absolute -bottom-3 bg-[#f0c866] text-[#1a0f08] text-xs font-bold px-3 py-1 rounded-full border-2 border-[#1a0f08]">
                  Lvl {profile.level}
                </div>
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider">{profile.username}</h3>
              <p className="text-[#a89078] text-sm mt-1">{profile.xp} XP</p>

              <div className="w-full h-2 bg-[#241810] rounded-full mt-4 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#f0c866]/50 to-[#f0c866] transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
                />
              </div>
              <div className="w-full flex justify-between text-[10px] text-[#a89078] mt-1 uppercase tracking-wider">
                <span>Lvl {profile.level}</span>
                <span>Lvl {profile.level + 1}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#4caf50] mb-1">{profile.wins}</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">Győzelem</div>
              </div>
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#e74c3c] mb-1">{profile.losses}</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">Vereség</div>
              </div>
            </div>

            <div className="mt-8 text-center text-xs text-[#a89078]/60">
              {isSupabaseConfigured
                ? 'A statisztikák a Supabase felhőben szinkronizálva vannak.'
                : 'A statisztikák jelenleg lokálisan mentődnek.'}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {!isSupabaseConfigured ? (
              <div className="text-center text-[#a89078] py-8">
                A ranglista használatához Supabase kapcsolat szükséges.
              </div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center text-[#a89078] py-8">Betöltés...</div>
            ) : (
              leaderboardData.map((p, index) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    p.id === profile.id ? "bg-[#f0c866]/10 border-[#f0c866]/50" : "bg-[#241810] border-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-300 text-black" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-[#1a0f08] text-[#a89078] border border-white/10"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-wider text-sm">{p.username}</div>
                      <div className="text-[#a89078] text-xs">Lvl {p.level}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#f0c866] font-bold">{p.xp} XP</div>
                    <div className="text-[10px] text-[#a89078] uppercase">{p.wins}W - {p.losses}L</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
