import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Zap, Hammer, SkipForward, Pickaxe, Flame,
  Shield, Plus, Magnet, Crosshair, ArrowLeftRight,
  Package, Star, CheckCircle2, Lock, ShoppingBag
} from 'lucide-react';
import { SkillType } from '../../game/logic';
import { Profile } from '../../lib/supabase';
import { CollectedItem, CollectibleType, COLLECTIBLE_META } from '../../lib/types';

interface StoreViewProps {
  profile: Profile;
  onBack: () => void;
  onSaveLoadout: (loadout: SkillType[]) => void;
}

const SKILL_META: Record<SkillType, { icon: React.ReactNode; label: string; desc: string; color: string; xpRequired: number }> = {
  TELEPORT:  { icon: <Zap size={22} />,            label: 'Teleport',       desc: 'Ugorj bármely szabad mezőre.',             color: '#a78bfa', xpRequired: 0   },
  HAMMER:    { icon: <Hammer size={22} />,          label: 'Kalapács',       desc: 'Távolítsd el a szomszédos falat.',          color: '#f97316', xpRequired: 50  },
  SKIP:      { icon: <SkipForward size={22} />,     label: 'Átugrás',        desc: 'Az ellenfél kihagyja a következő körét.',   color: '#facc15', xpRequired: 100 },
  MOLE:      { icon: <Pickaxe size={22} />,         label: 'Vakond',         desc: '3 körre átveheted a falakat.',              color: '#a3e635', xpRequired: 150 },
  DYNAMITE:  { icon: <Flame size={22} />,           label: 'Dinamit',        desc: 'Felrobbantsz egy 3x3-as területet.',        color: '#ef4444', xpRequired: 200 },
  SHIELD:    { icon: <Shield size={22} />,          label: 'Pajzs',          desc: '3 körre immunis vagy a skillekre.',         color: '#34d399', xpRequired: 250 },
  WALLS:     { icon: <Plus size={22} />,            label: 'Extra Falak',    desc: '+3 fal kerül a készletedbe.',               color: '#f0c866', xpRequired: 300 },
  MAGNET:    { icon: <Magnet size={22} />,          label: 'Mágnes',         desc: 'Az ellenfelet 2 mezővel közelebb húzod.',   color: '#60a5fa', xpRequired: 350 },
  TRAP:      { icon: <Crosshair size={22} />,       label: 'Csapda',         desc: 'Helyezz el egy láthatatlan csapdát.',       color: '#f472b6', xpRequired: 400 },
  SWAP:      { icon: <ArrowLeftRight size={22} />,  label: 'Csere',          desc: 'Cserélj pozíciót egy másik játékossal.',    color: '#22d3ee', xpRequired: 500 },
};

const SKILL_ORDER: SkillType[] = ['TELEPORT', 'HAMMER', 'SKIP', 'MOLE', 'DYNAMITE', 'SHIELD', 'WALLS', 'MAGNET', 'TRAP', 'SWAP'];

type StoreTab = 'loadout' | 'collection';

export function StoreView({ profile, onBack, onSaveLoadout }: StoreViewProps) {
  const [tab, setTab] = useState<StoreTab>('loadout');
  const [loadout, setLoadout] = useState<SkillType[]>(profile.skill_loadout ?? []);
  const [saved, setSaved] = useState(false);

  const hasGamepass = (profile.level ?? 1) >= 5;
  const maxSlots = hasGamepass ? 3 : 2;
  const collectedItems: CollectedItem[] = profile.collected_items ?? [];

  const toggleSkill = (skill: SkillType) => {
    setLoadout(prev => {
      if (prev.includes(skill)) return prev.filter(s => s !== skill);
      if (prev.length >= maxSlots) return prev; // max reached
      return [...prev, skill];
    });
    setSaved(false);
  };

  const handleSave = () => {
    onSaveLoadout(loadout);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isUnlocked = (skill: SkillType) => (profile.xp ?? 0) >= SKILL_META[skill].xpRequired;

  // Group collected items by type
  const itemCounts: Partial<Record<CollectibleType, number>> = {};
  collectedItems.forEach(i => { itemCounts[i.type] = (itemCounts[i.type] ?? 0) + 1; });

  return (
    <motion.div
      key="store"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 w-full max-w-2xl p-4 py-6 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors p-2 rounded-lg hover:bg-[#f0c866]/10">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest">ÁRUHÁZ</h1>
          <div className="text-xs text-[#a89078] tracking-widest uppercase">Gamepass & Gyűjtemény</div>
        </div>
        {hasGamepass && (
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#fbbf24]/20 to-[#f0c866]/10 border border-[#fbbf24]/40 rounded-full px-3 py-1">
            <Star size={12} className="text-[#fbbf24]" />
            <span className="text-[#fbbf24] text-xs font-bold tracking-wider">GAMEPASS</span>
          </div>
        )}
      </div>

      {/* Gamepass info (if not yet unlocked) */}
      {!hasGamepass && (
        <div className="bg-[#1a0f08] border border-[#fbbf24]/30 rounded-xl p-4 flex items-start gap-3">
          <div className="text-2xl mt-0.5">🎮</div>
          <div>
            <div className="text-[#fbbf24] font-bold text-sm tracking-wide mb-0.5">Gamepass</div>
            <div className="text-[#a89078] text-xs leading-relaxed">
              Érd el az <strong className="text-[#f5e6d3]">5. szintet</strong> a Gamepass feloldásához!
              Jelenleg: <strong className="text-[#f0c866]">Szint {profile.level ?? 1}</strong> ({profile.xp ?? 0} XP).<br />
              Gamepass előnyök: 3 képességhely • Easter egg gyűjtés bonusz.
            </div>
            <div className="mt-2 bg-[#241810] rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#fbbf24] to-[#f0c866] transition-all"
                style={{ width: `${Math.min(100, ((profile.level ?? 1) / 5) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-[#6b5040] mt-1">{profile.level ?? 1} / 5 szint</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([['loadout', 'Képességek', <ShoppingBag size={14} />], ['collection', 'Gyűjtemény', <Package size={14} />]] as const).map(([t, label, icon]) => (
          <button
            key={t}
            onClick={() => setTab(t as StoreTab)}
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

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'loadout' && (
          <motion.div key="loadout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Active loadout slots */}
            <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl p-4">
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">
                Aktív képességek ({loadout.length}/{maxSlots})
              </div>
              <div className="flex gap-3">
                {Array.from({ length: maxSlots }).map((_, i) => {
                  const skill = loadout[i];
                  const meta = skill ? SKILL_META[skill] : null;
                  return (
                    <div
                      key={i}
                      className={`w-16 h-16 rounded-xl flex items-center justify-center border-2 transition-all ${
                        skill
                          ? 'border-opacity-60'
                          : 'border-[#f0c866]/20 border-dashed'
                      }`}
                      style={skill ? { borderColor: meta!.color + '99', background: meta!.color + '15' } : {}}
                    >
                      {skill ? (
                        <div style={{ color: meta!.color }}>{meta!.icon}</div>
                      ) : (
                        <span className="text-[#6b5040] text-xs">üres</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {!hasGamepass && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-[#6b5040]">
                  <Lock size={11} /> 3. hely Gamepass-szel
                </div>
              )}
            </div>

            {/* Skill grid */}
            <div className="grid grid-cols-2 gap-3">
              {SKILL_ORDER.map(skill => {
                const meta = SKILL_META[skill];
                const unlocked = isUnlocked(skill);
                const selected = loadout.includes(skill);
                const disabled = !unlocked || (!selected && loadout.length >= maxSlots);
                return (
                  <button
                    key={skill}
                    onClick={() => !disabled && toggleSkill(skill)}
                    disabled={disabled && !selected}
                    className={`relative p-4 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-opacity-80 shadow-lg'
                        : unlocked
                          ? 'border-[#f0c866]/20 bg-[#1a0f08] hover:border-[#f0c866]/40'
                          : 'border-[#f0c866]/10 bg-[#1a0f08]/50 opacity-50 cursor-not-allowed'
                    }`}
                    style={selected ? { borderColor: meta.color + 'cc', background: meta.color + '18' } : {}}
                  >
                    {selected && (
                      <CheckCircle2 size={16} className="absolute top-2 right-2" style={{ color: meta.color }} />
                    )}
                    {!unlocked && (
                      <Lock size={14} className="absolute top-2 right-2 text-[#6b5040]" />
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: meta.color + '22', color: meta.color }}>
                        {meta.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#f5e6d3]">{meta.label}</div>
                        {!unlocked && (
                          <div className="text-[10px] text-[#6b5040]">{meta.xpRequired} XP kell</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#a89078] leading-relaxed">{meta.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
                saved
                  ? 'bg-[#34d399] text-[#1a0f08]'
                  : 'bg-[#f0c866] text-[#1a0f08] hover:bg-[#f4d488]'
              }`}
            >
              {saved ? '✓ Mentve!' : 'Loadout Mentése'}
            </button>
          </motion.div>
        )}

        {tab === 'collection' && (
          <motion.div key="collection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            {/* Summary */}
            <div className="bg-[#1a0f08] border border-[#f0c866]/25 rounded-xl p-4">
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">Összesen gyűjtve</div>
              <div className="flex gap-4">
                {(Object.keys(COLLECTIBLE_META) as CollectibleType[]).map(type => {
                  const meta = COLLECTIBLE_META[type];
                  const count = itemCounts[type] ?? 0;
                  return (
                    <div key={type} className="flex flex-col items-center gap-1">
                      <div className="text-3xl">{meta.icon}</div>
                      <div className="text-xl font-bold" style={{ color: meta.color }}>{count}</div>
                      <div className="text-[10px] text-[#a89078] text-center leading-tight">{meta.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent items */}
            <div>
              <div className="text-xs text-[#a89078] uppercase tracking-widest mb-3">Legutóbb gyűjtve</div>
              {collectedItems.length === 0 ? (
                <div className="text-center py-12 text-[#6b5040]">
                  <div className="text-5xl mb-3">🥚</div>
                  <div className="text-sm tracking-wide">Még nem gyűjtöttél Easter egg-et.</div>
                  <div className="text-xs mt-1">Játszz többet, hogy megtaláld őket!</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {[...collectedItems].reverse().slice(0, 20).map((item, i) => {
                    const meta = COLLECTIBLE_META[item.type];
                    const date = new Date(item.collectedAt);
                    return (
                      <div key={i} className="flex items-center gap-3 bg-[#1a0f08] border border-[#f0c866]/10 rounded-lg px-4 py-2.5">
                        <span className="text-xl">{meta.icon}</span>
                        <div className="flex-1">
                          <div className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</div>
                          <div className="text-xs text-[#6b5040]">{meta.rarity}</div>
                        </div>
                        <div className="text-xs text-[#6b5040]">
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
