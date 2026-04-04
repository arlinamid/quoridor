import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, User, Mail, Pencil, Check, X, Send, CheckCircle, ShieldCheck, UserX, RefreshCw } from 'lucide-react';
import { supabase, Profile, formatEmailAuthError, isEmailRateLimitError } from '../../lib/supabase';
import { useEmailSendCooldown } from '../../lib/useEmailSendCooldown';
import { cn } from '../../lib/utils';
import { hu } from '../../i18n/hu/ui';

interface LeaderboardViewProps {
  profile: Profile;
  leaderboardData: Profile[];
  tab: 'personal' | 'online';
  isAnonymous: boolean;
  userEmail?: string;
  onTabChange: (t: 'personal' | 'online') => void;
  onBack: () => void;
  isSupabaseConfigured: boolean;
  onUsernameUpdate: (username: string) => Promise<void>;
  onUpgradeAccount: (email: string) => Promise<{ error: any }>;
  onMarketingOptOutChange: (optOut: boolean) => void;
  onOpenTos: () => void;
  onOpenPrivacy: () => void;
}

export function LeaderboardView({
  profile, leaderboardData, tab, isAnonymous, userEmail,
  onTabChange, onBack, isSupabaseConfigured,
  onUsernameUpdate, onUpgradeAccount,
  onMarketingOptOutChange, onOpenTos, onOpenPrivacy,
}: LeaderboardViewProps) {
  const xpForNextLevel    = (profile.level) * (profile.level) * 100;
  const xpForCurrentLevel = (profile.level - 1) * (profile.level - 1) * 100;
  const xpProgress = xpForNextLevel > xpForCurrentLevel
    ? ((profile.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100
    : 0;

  const totalGames = profile.wins + profile.losses;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  // Username editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile.username);
  const [nameSaving, setNameSaving] = useState(false);

  const saveUsername = async () => {
    if (!nameInput.trim() || nameInput === profile.username) { setEditingName(false); return; }
    setNameSaving(true);
    await onUsernameUpdate(nameInput.trim());
    setNameSaving(false);
    setEditingName(false);
  };

  // Account upgrade
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSending, setUpgradeSending] = useState(false);
  const [upgradeSent, setUpgradeSent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const { remaining: upgradeCooldownRemaining, startCooldown: startUpgradeCooldown, penalizeRateLimit: penalizeUpgradeRateLimit, blockMessage: upgradeCooldownBlock } =
    useEmailSendCooldown(60);

  const handleUpgrade = async () => {
    if (!upgradeEmail.trim() || !upgradeEmail.includes('@')) {
      setUpgradeError(hu.leaderboard.upgradeEmailInvalid);
      return;
    }
    if (upgradeCooldownBlock) {
      setUpgradeError(upgradeCooldownBlock);
      return;
    }
    setUpgradeError('');
    setUpgradeSending(true);
    const { error } = await onUpgradeAccount(upgradeEmail.trim());
    setUpgradeSending(false);
    if (error) {
      setUpgradeError(formatEmailAuthError(error));
      if (isEmailRateLimitError(error)) penalizeUpgradeRateLimit();
    } else {
      setUpgradeSent(true);
      startUpgradeCooldown();
    }
  };

  return (
    <motion.div
      key="leaderboard"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center w-full max-w-md p-6 mt-6 pb-10"
    >
      <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase">
            {hu.common.stats}
          </h2>
        </div>

        {/* Tabs */}
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
              {t === 'personal' ? hu.leaderboard.tabPersonal : hu.leaderboard.tabOnline}
            </button>
          ))}
        </div>

        {tab === 'personal' ? (
          <div className="flex flex-col gap-5">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-[#241810] border-2 border-[#f0c866] flex items-center justify-center">
                  <User className="text-[#f0c866]" size={40} />
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#f0c866] text-[#1a0f08] text-xs font-bold px-3 py-1 rounded-full border-2 border-[#1a0f08] whitespace-nowrap">
                  {hu.leaderboard.lvlShort} {profile.level}
                </div>
              </div>

              {/* Editable username */}
              <div className="mt-3 flex items-center gap-2">
                {editingName ? (
                  <>
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingName(false); }}
                      maxLength={15}
                      className="bg-[#241810] border border-[#f0c866]/50 rounded px-3 py-1.5 text-[#f5e6d3] text-sm focus:outline-none focus:border-[#f0c866] w-36 text-center"
                    />
                    <button onClick={saveUsername} disabled={nameSaving} className="text-emerald-400 hover:text-emerald-300 transition-colors">
                      <Check size={16} />
                    </button>
                    <button onClick={() => { setEditingName(false); setNameInput(profile.username); }} className="text-red-400 hover:text-red-300 transition-colors">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-bold uppercase tracking-wider">{profile.username}</h3>
                    <button onClick={() => { setEditingName(true); setNameInput(profile.username); }} className="text-[#a89078] hover:text-[#f0c866] transition-colors" title={hu.leaderboard.editNameTitle}>
                      <Pencil size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* Account type badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                isAnonymous
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              )}>
                {isAnonymous ? <UserX size={11} /> : <ShieldCheck size={11} />}
                {isAnonymous ? hu.leaderboard.guestAccount : userEmail ? hu.leaderboard.registeredWithEmail(userEmail) : hu.leaderboard.registered}
              </div>
            </div>

            {/* XP bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-[#a89078]">{profile.xp} XP</span>
                <span className="text-xs text-[#a89078]">{hu.leaderboard.nextLevelXp(xpForNextLevel)}</span>
              </div>
              <div className="w-full h-2.5 bg-[#241810] rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-[#f0c866]/60 to-[#f0c866] transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, xpProgress))}%` }}
                />
              </div>
              <div className="w-full flex justify-between text-[10px] text-[#a89078] mt-1 uppercase tracking-wider">
                <span>{hu.leaderboard.lvlShort} {profile.level}</span>
                <span>{hu.leaderboard.lvlShort} {profile.level + 1}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#4caf50] mb-1">{profile.wins}</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">{hu.leaderboard.statWin}</div>
              </div>
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#e74c3c] mb-1">{profile.losses}</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">{hu.leaderboard.statLoss}</div>
              </div>
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#f0c866] mb-1">{totalGames}</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">{hu.leaderboard.statTotal}</div>
              </div>
              <div className="bg-[#241810] p-4 rounded-xl border border-white/5 text-center">
                <div className="text-3xl font-light text-[#a78bfa] mb-1">{winRate}%</div>
                <div className="text-xs text-[#a89078] uppercase tracking-wider">{hu.leaderboard.statWinRate}</div>
              </div>
            </div>

            {/* Privacy & marketing opt-out */}
            <div className="rounded-xl border border-white/10 bg-[#1a0f08]/40 p-4 space-y-3">
              <div className="text-xs font-bold text-[#f0c866] uppercase tracking-wider">{hu.leaderboard.privacySectionTitle}</div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!!profile.marketing_opt_out}
                  onChange={(e) => onMarketingOptOutChange(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-[#241810] text-[#f0c866] focus:ring-[#f0c866]/50"
                />
                <span className="text-[11px] text-[#a89078] leading-relaxed group-hover:text-[#c8b090] transition-colors">
                  <strong className="text-[#f5e6d3]">{hu.leaderboard.marketingOptOutStrong}</strong> {hu.leaderboard.marketingOptOutRest}
                </span>
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <button type="button" onClick={onOpenTos} className="text-[#f0c866] hover:underline underline-offset-2">
                  {hu.leaderboard.tos}
                </button>
                <button type="button" onClick={onOpenPrivacy} className="text-[#f0c866] hover:underline underline-offset-2">
                  {hu.leaderboard.privacyPolicy}
                </button>
              </div>
            </div>

            {/* Upgrade section — only for anonymous users */}
            <AnimatePresence>
              {isAnonymous && isSupabaseConfigured && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-2">
                    <Mail size={16} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-amber-400 text-sm">{hu.leaderboard.upgradeTitle}</div>
                      <div className="text-[11px] text-[#a89078] mt-0.5 leading-relaxed">
                        {hu.leaderboard.upgradeIntro}
                      </div>
                    </div>
                  </div>

                  {upgradeSent ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-2 text-emerald-400 text-sm">
                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{hu.leaderboard.upgradeConfirmSent}</span>
                      </div>
                      <div className="text-[11px] text-[#a89078] leading-relaxed bg-[#1a0f08] rounded-lg p-3 border border-white/5">
                        <strong className="text-[#f0c866]">{hu.leaderboard.upgradeOtherDeviceBold}</strong>
                        {' '}{hu.leaderboard.upgradeOtherDeviceRest}
                      </div>
                      <button
                        onClick={async () => {
                          setRefreshing(true);
                          setRefreshMsg('');
                          const { data, error } = await supabase.auth.refreshSession();
                          setRefreshing(false);
                          if (!error && data.session && !data.session.user.is_anonymous) {
                            setRefreshMsg(hu.leaderboard.upgradeRefreshOk);
                            // parent will re-render since session state updates via onAuthStateChange
                          } else {
                            setRefreshMsg(hu.leaderboard.upgradeRefreshPending);
                          }
                        }}
                        disabled={refreshing}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                      >
                        {refreshing
                          ? <span className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full" />
                          : <RefreshCw size={14} />}
                        {hu.leaderboard.upgradeRefresh}
                      </button>
                      {refreshMsg && (
                        <p className={`text-xs text-center ${refreshMsg.startsWith('✓') ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {refreshMsg}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder={hu.auth.emailPlaceholder}
                          value={upgradeEmail}
                          onChange={e => { setUpgradeEmail(e.target.value); setUpgradeError(''); }}
                          onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
                          className="flex-1 bg-[#241810] border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-[#f5e6d3] focus:outline-none focus:border-amber-400 transition-colors"
                        />
                        <button
                          onClick={handleUpgrade}
                          disabled={upgradeSending || upgradeCooldownRemaining > 0}
                          className="bg-amber-500 text-[#1a0f08] font-bold px-3 py-2 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm whitespace-nowrap"
                        >
                          {upgradeSending
                            ? <span className="animate-spin w-4 h-4 border-2 border-[#1a0f08] border-t-transparent rounded-full" />
                            : <Send size={14} />}
                          {upgradeSending ? hu.leaderboard.upgradeSending : upgradeCooldownRemaining > 0 ? hu.leaderboard.upgradeCooldown(upgradeCooldownRemaining) : hu.leaderboard.upgradeSend}
                        </button>
                      </div>
                      {upgradeError && <p className="text-xs text-red-400">{upgradeError}</p>}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="text-center text-xs text-[#a89078]/50">
              {isSupabaseConfigured
                ? hu.leaderboard.statsCloud
                : hu.leaderboard.statsLocal}
            </div>
          </div>
        ) : (
          /* Leaderboard tab */
          <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {!isSupabaseConfigured ? (
              <div className="text-center text-[#a89078] py-8">{hu.leaderboard.needSupabaseForLb}</div>
            ) : leaderboardData.length === 0 ? (
              <div className="text-center text-[#a89078] py-8">{hu.common.loading}</div>
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
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0",
                      index === 0 ? "bg-yellow-500 text-black" :
                      index === 1 ? "bg-gray-300 text-black" :
                      index === 2 ? "bg-amber-700 text-white" :
                      "bg-[#1a0f08] text-[#a89078] border border-white/10"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold uppercase tracking-wider text-sm">{p.username}</div>
                      <div className="text-[#a89078] text-xs">{hu.leaderboard.lvlShort} {p.level}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#f0c866] font-bold">{p.xp} XP</div>
                    <div className="text-[10px] text-[#a89078] uppercase">{hu.leaderboard.wlRecord(p.wins, p.losses)}</div>
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
