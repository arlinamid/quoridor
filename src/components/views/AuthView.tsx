import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, Send, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuthViewProps {
  usernameInput: string;
  onUsernameChange: (v: string) => void;
  onGuestLogin: () => void | Promise<void>;
  guestSigningIn?: boolean;
  guestAuthError?: string;
  onMagicLink: (email: string) => Promise<{ error: any }>;
  isSupabaseConfigured: boolean;
  onTos: () => void;
  onPrivacy: () => void;
  /** Called when switching guest/email tab (e.g. clear vendég auth errors). */
  onAuthTabChange?: () => void;
}

export function AuthView({
  usernameInput, onUsernameChange, onGuestLogin, guestSigningIn = false, guestAuthError = '',
  onMagicLink, isSupabaseConfigured, onTos, onPrivacy, onAuthTabChange,
}: AuthViewProps) {
  const [tab, setTab] = useState<'guest' | 'email'>('guest');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes('@')) {
      setEmailError('Adj meg egy érvényes email-címet.');
      return;
    }
    setEmailError('');
    setSending(true);
    const { error } = await onMagicLink(email.trim());
    setSending(false);
    if (error) setEmailError(error.message ?? 'Hiba a küldés során.');
    else setSent(true);
  };

  return (
    <motion.div
      key="auth"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center w-full max-w-md p-6"
    >
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="font-['Cinzel',serif] text-5xl font-black tracking-[10px] text-[#f0c866] drop-shadow-[0_0_40px_rgba(240,200,102,0.35)]">
          QUORIDOR
        </h1>
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#f0c866] to-transparent mx-auto my-4" />
        <div className="text-sm text-[#a89078] tracking-[4px] uppercase">Jelentkezz be a játékhoz</div>
      </div>

      <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl flex flex-col gap-6">

        {/* Tab selector */}
        {isSupabaseConfigured && (
          <div className="flex w-full border-b border-white/10 mb-2">
            {(['guest', 'email'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSent(false); setEmailError(''); onAuthTabChange?.(); }}
                className={cn(
                  "flex-1 pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-1.5",
                  tab === t ? "border-[#f0c866] text-[#f0c866]" : "border-transparent text-[#a89078] hover:text-white"
                )}
              >
                {t === 'guest' ? <><User size={12} /> Vendég</> : <><Mail size={12} /> Email</>}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* ── Guest tab ─────────────────────────────── */}
          {tab === 'guest' && (
            <motion.div key="guest" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-[#a89078] uppercase tracking-wider">Felhasználónév (opcionális)</label>
                <input
                  type="text"
                  placeholder="Pl. SakkMester99"
                  value={usernameInput}
                  onChange={e => onUsernameChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && void onGuestLogin()}
                  maxLength={15}
                  className="w-full bg-[#241810] border border-[#f0c866]/30 rounded-lg px-4 py-3 text-[#f5e6d3] focus:outline-none focus:border-[#f0c866] transition-colors"
                />
              </div>
              {guestAuthError && (
                <p className="text-xs text-red-400 leading-relaxed" role="alert">
                  {guestAuthError}
                </p>
              )}
              <button
                onClick={() => void onGuestLogin()}
                disabled={guestSigningIn}
                className="w-full bg-[#241810] border border-[#f0c866]/50 text-[#f0c866] font-bold py-4 px-6 rounded-lg tracking-wider transition-all hover:bg-[#f0c866]/10 hover:border-[#f0c866] hover:shadow-[0_0_20px_rgba(240,200,102,0.2)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {guestSigningIn ? (
                  <span className="animate-spin w-5 h-5 border-2 border-[#f0c866] border-t-transparent rounded-full" />
                ) : (
                  <User size={20} />
                )}
                {guestSigningIn ? 'Belépés…' : 'Játssz Vendégként (Anonim)'}
              </button>
              {isSupabaseConfigured && (
                <p className="text-[10px] text-center text-[#a89078]/60 leading-relaxed">
                  Vendégként is mentődnek a statisztikáid. Az Email tab-on véglegesítheted a fiókodat.
                </p>
              )}
            </motion.div>
          )}

          {/* ── Email / Magic link tab ─────────────────── */}
          {tab === 'email' && (
            <motion.div key="email" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-4">
              {sent ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <CheckCircle size={48} className="text-emerald-400" />
                  <div>
                    <div className="font-bold text-emerald-400 text-lg">Email elküldve!</div>
                    <div className="text-sm text-[#a89078] mt-1">Ellenőrizd a postaládádat és kattints a linkre a bejelentkezéshez.</div>
                  </div>
                  <button onClick={() => { setSent(false); setEmail(''); }} className="text-xs text-[#a89078] hover:text-[#f0c866] underline transition-colors">
                    Másik email használata
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-[#a89078] uppercase tracking-wider">Email-cím</label>
                    <input
                      type="email"
                      placeholder="pelda@email.com"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
                      className="w-full bg-[#241810] border border-[#f0c866]/30 rounded-lg px-4 py-3 text-[#f5e6d3] focus:outline-none focus:border-[#f0c866] transition-colors"
                    />
                    {emailError && <p className="text-xs text-red-400">{emailError}</p>}
                  </div>
                  <button
                    onClick={handleMagicLink}
                    disabled={sending}
                    className="w-full bg-[#f0c866] text-[#1a0f08] font-bold py-4 px-6 rounded-lg tracking-wider transition-all hover:bg-[#f4d488] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {sending ? (
                      <span className="animate-spin w-5 h-5 border-2 border-[#1a0f08] border-t-transparent rounded-full" />
                    ) : (
                      <Send size={18} />
                    )}
                    {sending ? 'Küldés...' : 'Magic Link küldése'}
                  </button>
                  <p className="text-[10px] text-center text-[#a89078]/60 leading-relaxed">
                    Emailben kapod a belépési linket — nincs szükség jelszóra. Meglévő és új fiókok esetén egyaránt működik.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!isSupabaseConfigured && (
          <div className="text-xs text-center text-amber-500/80 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            A Supabase nincs konfigurálva. A játék lokális módban indul.
          </div>
        )}

        <div className="text-center text-xs text-[#a89078] flex flex-col gap-2">
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
