import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Zap, Hammer, SkipForward, Pickaxe, Flame,
  Shield, Plus, Magnet, Crosshair, ArrowLeftRight,
  Package, Star, CheckCircle2, Lock, ShoppingBag, ShoppingCart, Wallet,
} from 'lucide-react';
import { SkillType } from '../../game/logic';
import { Profile, EggWallet } from '../../lib/supabase';
import { CollectibleType, COLLECTIBLE_META } from '../../lib/types';

interface StoreViewProps {
  profile: Profile;
  onBack: () => void;
  onSaveLoadout: (loadout: SkillType[]) => void;
  onPurchaseSkill: (
    skill: SkillType,
    eggType: CollectibleType,
    cost: number
  ) => Promise<'ok' | 'insufficient' | 'already_owned' | 'error'>;
}

// ── Skill catalogue ──────────────────────────────────────────────────────────

type SkillMeta = {
  icon: React.ReactNode;
  label: string;
  desc: string;
  color: string;
  eggType: CollectibleType;
  eggCost: number;
};

const SKILL_META: Record<SkillType, SkillMeta> = {
  WALLS:    { icon: <Plus size={22} />,            label: 'Extra Falak',  desc: '+2 fal kerül a készletedbe (azonnal).',         color: '#f0c866', eggType: 'EGG_BASIC',   eggCost: 2 },
  HAMMER:   { icon: <Hammer size={22} />,          label: 'Kalapács',     desc: 'Távolítsd el a szomszédos falat.',              color: '#f97316', eggType: 'EGG_BASIC',   eggCost: 3 },
  SKIP:     { icon: <SkipForward size={22} />,     label: 'Átugrás',      desc: 'A következő játékos a körből kimarad (2–4 fő).', color: '#facc15', eggType: 'EGG_BASIC',   eggCost: 4 },
  SHIELD:   { icon: <Shield size={22} />,          label: 'Pajzs',        desc: '2 saját körön át blokkol bizonyos ellenfél-falakat (2 játékos).', color: '#34d399', eggType: 'EGG_GOLD',    eggCost: 1 },
  MOLE:     { icon: <Pickaxe size={22} />,         label: 'Vakond',       desc: '1 körön át átsétálhatsz a falakon.',            color: '#a3e635', eggType: 'EGG_GOLD',    eggCost: 2 },
  TELEPORT: { icon: <Zap size={22} />,             label: 'Teleport',     desc: 'Ugorj egy szabad mezőre (max. 2 cella távolság).', color: '#a78bfa', eggType: 'EGG_GOLD',    eggCost: 2 },
  MAGNET:   { icon: <Magnet size={22} />,          label: 'Mágnes',       desc: 'Minden ellenfelet feléd húz (vízsz. vagy függ., max. 2 mező).', color: '#60a5fa', eggType: 'EGG_GOLD',    eggCost: 3 },
  TRAP:     { icon: <Crosshair size={22} />,       label: 'Csapda',       desc: 'Helyezz el egy láthatatlan csapdát.',           color: '#f472b6', eggType: 'EGG_GOLD',    eggCost: 3 },
  DYNAMITE: { icon: <Flame size={22} />,           label: 'Dinamit',      desc: 'Felrobbantsz egy 3×3-as területet.',           color: '#ef4444', eggType: 'EGG_RAINBOW', eggCost: 1 },
  SWAP:     { icon: <ArrowLeftRight size={22} />,  label: 'Csere',        desc: 'Véletlenszerű másik játékossal cserélsz helyet.', color: '#22d3ee', eggType: 'EGG_RAINBOW', eggCost: 2 },
};

const SKILL_ORDER: SkillType[] = [
  'WALLS', 'HAMMER', 'SKIP',
  'SHIELD', 'MOLE', 'TELEPORT', 'MAGNET', 'TRAP',
  'DYNAMITE', 'SWAP',
];

const EGG_TIER_LABEL: Record<CollectibleType, string> = {
  EGG_BASIC:   'Alap',
  EGG_GOLD:    'Arany',
  EGG_RAINBOW: 'Szivárvány',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function walletBalance(wallet: EggWallet | undefined, type: CollectibleType): number {
  return wallet?.[type] ?? 0;
}

// ── Component ────────────────────────────────────────────────────────────────

type StoreTab = 'shop' | 'loadout' | 'collection';

export function StoreView({ profile, onBack, onSaveLoadout, onPurchaseSkill }: StoreViewProps) {
  const [tab, setTab]         = useState<StoreTab>('shop');
  const [loadout, setLoadout] = useState<SkillType[]>(profile.skill_loadout ?? []);
  const [savedLoadout, setSavedLoadout] = useState(false);
  const [buying, setBuying]   = useState<SkillType | null>(null);
  const [feedback, setFeedback] = useState<{ skill: SkillType; msg: string; ok: boolean } | null>(null);

  const hasGamepass = (profile.level ?? 1) >= 5;
  const maxSlots    = hasGamepass ? 3 : 2;
  const wallet      = profile.egg_wallet ?? { EGG_BASIC: 0, EGG_GOLD: 0, EGG_RAINBOW: 0 };
  const owned       = profile.owned_skills ?? [];
  const history     = profile.collected_items ?? [];

  // egg counts in history for display
  const histCounts: Partial<Record<CollectibleType, number>> = {};
  history.forEach(i => { histCounts[i.type] = (histCounts[i.type] ?? 0) + 1; });

  // ── Purchase handler ──
  const handleBuy = async (skill: SkillType) => {
    const meta = SKILL_META[skill];
    setBuying(skill);
    const result = await onPurchaseSkill(skill, meta.eggType, meta.eggCost);
    setBuying(null);
    if (result === 'ok') {
      setFeedback({ skill, msg: `${meta.label} megvásárolva!`, ok: true });
    } else if (result === 'insufficient') {
      setFeedback({ skill, msg: 'Nincs elég tojásod!', ok: false });
    } else if (result === 'already_owned') {
      setFeedback({ skill, msg: 'Már megvan!', ok: true });
    } else {
      setFeedback({ skill, msg: 'Hiba történt.', ok: false });
    }
    setTimeout(() => setFeedback(null), 2500);
  };

  // ── Loadout toggle (only from owned skills) ──
  const toggleLoadout = (skill: SkillType) => {
    setLoadout(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill);
      if (prev.length >= maxSlots) return prev;
      return [...prev, skill];
    });
    setSavedLoadout(false);
  };

  const handleSaveLoadout = () => {
    onSaveLoadout(loadout);
    setSavedLoadout(true);
    setTimeout(() => setSavedLoadout(false), 2000);
  };

  // ── Tab definitions ──
  const tabs: [StoreTab, string, React.ReactNode][] = [
    ['shop',       'Bolt',        <ShoppingCart size={14} />],
    ['loadout',    'Loadout',     <ShoppingBag size={14} />],
    ['collection', 'Gyűjtemény',  <Package size={14} />],
  ];

  return (
    <motion.div
      key="store"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 w-full max-w-2xl p-4 py-6 flex flex-col gap-4"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-[#a89078] hover:text-[#f0c866] transition-colors p-2 rounded-lg hover:bg-[#f0c866]/10"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest">ÁRUHÁZ</h1>
          <div className="text-xs text-[#a89078] tracking-widest uppercase">Gamepass &amp; Gyűjtemény</div>
        </div>
        {hasGamepass && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#fbbf24]/20 to-[#f0c866]/10 border border-[#fbbf24]/40 rounded-full px-3 py-1">
            <Star size={12} className="text-[#fbbf24]" />
            <span className="text-[#fbbf24] text-xs font-bold tracking-wider">GAMEPASS</span>
          </div>
        )}
      </div>

      {/* ── Egg wallet banner ── */}
      <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl px-4 py-3 flex items-center gap-4">
        <Wallet size={18} className="text-[#f0c866] shrink-0" />
        <div className="text-xs text-[#a89078] uppercase tracking-widest shrink-0">Egyenleg</div>
        <div className="flex gap-4 flex-wrap">
          {(['EGG_BASIC', 'EGG_GOLD', 'EGG_RAINBOW'] as CollectibleType[]).map(type => {
            const meta = COLLECTIBLE_META[type];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className="text-lg">{meta.icon}</span>
                <span className="font-bold text-base" style={{ color: meta.color }}>
                  {walletBalance(wallet, type)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="ml-auto text-[10px] text-[#6b5040] text-right leading-tight hidden sm:block">
          Játék közben<br />gyűjtöd
        </div>
      </div>

      {/* ── Gamepass progress (if not yet unlocked) ── */}
      {!hasGamepass && (
        <div className="bg-[#1a0f08] border border-[#fbbf24]/25 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl mt-0.5">🎮</div>
          <div className="flex-1">
            <div className="text-[#fbbf24] font-bold text-sm tracking-wide mb-0.5">Gamepass — 5. szint kell</div>
            <div className="text-[#a89078] text-xs leading-relaxed mb-2">
              Előny: <strong className="text-[#f5e6d3]">3 képességhely</strong> a loadoutban (jelenleg 2).
              <br />Jelenlegi szint: <strong className="text-[#f0c866]">{profile.level ?? 1}</strong>
            </div>
            <div className="bg-[#241810] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f0c866] transition-all"
                style={{ width: `${Math.min(100, ((profile.level ?? 1) / 5) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[#6b5040] mt-1">{profile.level ?? 1} / 5 szint</div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        {tabs.map(([t, label, icon]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
              tab === t
                ? 'bg-[#f0c866] text-[#1a0f08]'
                : 'bg-[#1a0f08] border border-[#f0c866]/20 text-[#a89078] hover:border-[#f0c866]/50 hover:text-[#f0c866]'
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* ── SHOP TAB ── */}
        {tab === 'shop' && (
          <motion.div key="shop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {/* Tier legend */}
            <div className="flex gap-3 text-xs text-[#a89078]">
              {(['EGG_BASIC', 'EGG_GOLD', 'EGG_RAINBOW'] as CollectibleType[]).map(type => (
                <span key={type} className="flex items-center gap-1">
                  {COLLECTIBLE_META[type].icon} = {EGG_TIER_LABEL[type]}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {SKILL_ORDER.map(skill => {
                const meta    = SKILL_META[skill];
                const eggMeta = COLLECTIBLE_META[meta.eggType];
                const isOwned = owned.includes(skill);
                const canAfford = walletBalance(wallet, meta.eggType) >= meta.eggCost;
                const isBuying  = buying === skill;
                const fb        = feedback?.skill === skill ? feedback : null;

                return (
                  <div
                    key={skill}
                    className={`relative p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                      isOwned
                        ? 'border-opacity-60 bg-opacity-20'
                        : 'border-[#f0c866]/15 bg-[#1a0f08]'
                    }`}
                    style={isOwned ? { borderColor: meta.color + 'aa', background: meta.color + '12' } : {}}
                  >
                    {/* Owned badge */}
                    {isOwned && (
                      <div
                        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: meta.color + '33', color: meta.color }}
                      >
                        <CheckCircle2 size={10} /> Megvan
                      </div>
                    )}

                    {/* Skill info */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: meta.color + '22', color: meta.color }}
                      >
                        {meta.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#f5e6d3]">{meta.label}</div>
                        <div className="flex items-center gap-1 text-[11px]" style={{ color: eggMeta.color }}>
                          <span>{eggMeta.icon}</span>
                          <span className="font-bold">{meta.eggCost}×</span>
                          <span className="text-[#a89078]">{EGG_TIER_LABEL[meta.eggType]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-[#a89078] leading-relaxed">{meta.desc}</div>

                    {/* Feedback or buy button */}
                    <AnimatePresence mode="wait">
                      {fb ? (
                        <motion.div
                          key="fb"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={`text-xs font-bold text-center py-1.5 rounded-lg ${fb.ok ? 'text-[#34d399] bg-[#34d399]/10' : 'text-red-400 bg-red-500/10'}`}
                        >
                          {fb.msg}
                        </motion.div>
                      ) : isOwned ? (
                        <div className="text-xs text-center py-1.5 text-[#6b5040]">Már a gyűjteményedben van</div>
                      ) : (
                        <button
                          key="buy"
                          onClick={() => handleBuy(skill)}
                          disabled={!canAfford || isBuying}
                          className={`w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            canAfford
                              ? 'bg-[#f0c866] text-[#1a0f08] hover:bg-[#f4d488] active:scale-95'
                              : 'bg-[#241810] text-[#6b5040] border border-[#6b5040]/30 cursor-not-allowed'
                          }`}
                        >
                          {isBuying ? (
                            <span className="animate-pulse">...</span>
                          ) : canAfford ? (
                            <>{eggMeta.icon} Megvétel</>
                          ) : (
                            <><Lock size={11} /> Nincs elég tojás</>
                          )}
                        </button>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ── LOADOUT TAB ── */}
        {tab === 'loadout' && (
          <motion.div key="loadout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Active slots */}
            <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl p-4">
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">
                Aktív képességek ({loadout.length}/{maxSlots})
              </div>
              <div className="flex gap-3 mb-2">
                {Array.from({ length: maxSlots }).map((_, i) => {
                  const skill = loadout[i];
                  const meta  = skill ? SKILL_META[skill] : null;
                  return (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border-2 transition-all"
                      style={skill
                        ? { borderColor: meta!.color + '99', background: meta!.color + '15' }
                        : { borderColor: '#f0c86633', borderStyle: 'dashed' }}
                    >
                      {skill ? (
                        <>
                          <div style={{ color: meta!.color }}>{meta!.icon}</div>
                          <div className="text-[8px] mt-0.5" style={{ color: meta!.color }}>{meta!.label}</div>
                        </>
                      ) : (
                        <span className="text-[#6b5040] text-xs">üres</span>
                      )}
                    </div>
                  );
                })}
                {!hasGamepass && (
                  <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center border-2 border-[#fbbf24]/20 border-dashed opacity-40">
                    <Lock size={16} className="text-[#fbbf24]" />
                    <div className="text-[8px] text-[#fbbf24] mt-0.5">Lvl 5</div>
                  </div>
                )}
              </div>
              <div className="text-xs text-[#6b5040]">Csak a megvásárolt skilleket adhatod hozzá.</div>
            </div>

            {/* Owned skills grid */}
            {owned.length === 0 ? (
              <div className="text-center py-10 text-[#6b5040]">
                <div className="text-4xl mb-3">🛒</div>
                <div className="text-sm">Még nincs megvásárolt skillед.</div>
                <div className="text-xs mt-1">Gyűjts Easter egg-eket és vásárolj a Boltban!</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {owned.map(skill => {
                  const meta     = SKILL_META[skill];
                  const selected = loadout.includes(skill);
                  const disabled = !selected && loadout.length >= maxSlots;
                  return (
                    <button
                      key={skill}
                      onClick={() => !disabled && toggleLoadout(skill)}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        selected
                          ? 'shadow-lg'
                          : disabled
                            ? 'border-[#f0c866]/10 bg-[#1a0f08]/60 opacity-50 cursor-not-allowed'
                            : 'border-[#f0c866]/20 bg-[#1a0f08] hover:border-[#f0c866]/40'
                      }`}
                      style={selected ? { borderColor: meta.color + 'cc', background: meta.color + '18' } : {}}
                    >
                      {selected && <CheckCircle2 size={16} className="absolute top-2 right-2" style={{ color: meta.color }} />}
                      <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: meta.color + '22', color: meta.color }}>
                          {meta.icon}
                        </div>
                        <div className="text-sm font-bold text-[#f5e6d3]">{meta.label}</div>
                      </div>
                      <div className="text-xs text-[#a89078]">{meta.desc}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Save */}
            <button
              onClick={handleSaveLoadout}
              disabled={owned.length === 0}
              className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                savedLoadout
                  ? 'bg-[#34d399] text-[#1a0f08]'
                  : owned.length === 0
                    ? 'bg-[#241810] text-[#6b5040] cursor-not-allowed'
                    : 'bg-[#f0c866] text-[#1a0f08] hover:bg-[#f4d488]'
              }`}
            >
              {savedLoadout ? '✓ Mentve!' : 'Loadout Mentése'}
            </button>
          </motion.div>
        )}

        {/* ── COLLECTION TAB ── */}
        {tab === 'collection' && (
          <motion.div key="collection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Wallet + totals */}
            <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl p-4">
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">Összes eddig gyűjtve</div>
              <div className="grid grid-cols-3 gap-3">
                {(['EGG_BASIC', 'EGG_GOLD', 'EGG_RAINBOW'] as CollectibleType[]).map(type => {
                  const meta  = COLLECTIBLE_META[type];
                  const total = histCounts[type] ?? 0;
                  const bal   = walletBalance(wallet, type);
                  return (
                    <div key={type} className="flex flex-col items-center gap-1 bg-[#241810] rounded-lg p-3">
                      <div className="text-3xl">{meta.icon}</div>
                      <div className="text-lg font-bold" style={{ color: meta.color }}>{total}</div>
                      <div className="text-[10px] text-[#a89078] text-center leading-tight">{meta.label}</div>
                      <div className="text-[10px] text-[#6b5040]">
                        {bal} maradt
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Owned skills summary */}
            <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl p-4">
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-2">Megvásárolt képességek ({owned.length}/10)</div>
              {owned.length === 0 ? (
                <div className="text-xs text-[#6b5040]">Még nincs megvásárolt skill.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {owned.map(skill => {
                    const meta = SKILL_META[skill];
                    return (
                      <div
                        key={skill}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}55` }}
                      >
                        {meta.icon} {meta.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* History list */}
            <div>
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">Gyűjtési előzmények</div>
              {history.length === 0 ? (
                <div className="text-center py-10 text-[#6b5040]">
                  <div className="text-5xl mb-3">🥚</div>
                  <div className="text-sm">Még nem gyűjtöttél Easter egg-et.</div>
                  <div className="text-xs mt-1">Játszz, hogy megtaláld őket!</div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
                  {[...history].reverse().slice(0, 30).map((item, i) => {
                    const meta = COLLECTIBLE_META[item.type];
                    const date = new Date(item.collectedAt);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[#1a0f08] border border-[#f0c866]/10 rounded-lg px-3 py-2">
                        <span className="text-lg">{meta.icon}</span>
                        <div className="flex-1">
                          <div className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</div>
                          <div className="text-[10px] text-[#6b5040]">{meta.rarity}</div>
                        </div>
                        <div className="text-[10px] text-[#6b5040] text-right">
                          {date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
