import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Cpu, Globe, BookOpen, ArrowLeft, Sword, Map, ShoppingBag, Swords } from 'lucide-react';
import { GameMode } from '../../lib/types';
import { hu } from '../../i18n/hu/ui';

type MenuStep = 'main' | '1v1' | 'ai' | 'ai-difficulty' | 'multiplayer';

interface MenuViewProps {
  onStartGame: (mode: GameMode, difficulty?: 'easy' | 'medium' | 'hard') => void;
  onRules: () => void;
  onStore: () => void;
}

const BTN = "group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#f0c866]/35 text-[#f0c866] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#f0c866] hover:shadow-[0_0_40px_rgba(240,200,102,0.2),inset_0_0_30px_rgba(240,200,102,0.05)] hover:-translate-y-0.5";
const BTN_TREASURE = "group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#e8b830]/50 text-[#e8b830] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#e8b830] hover:shadow-[0_0_40px_rgba(232,184,48,0.3),inset_0_0_30px_rgba(232,184,48,0.1)] hover:-translate-y-0.5";
const BTN_BATTLEFIELD = "group relative overflow-hidden bg-[#1a0f08]/85 backdrop-blur-md border border-[#ea580c]/55 text-[#fb923c] font-['Cinzel',serif] font-bold py-4 px-8 tracking-[3px] transition-all hover:border-[#fb923c] hover:shadow-[0_0_40px_rgba(251,146,60,0.25),inset_0_0_30px_rgba(251,146,60,0.08)] hover:-translate-y-0.5";
const BTN_SHINE = "absolute inset-0 bg-gradient-to-br from-[#f0c866]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity";
const BTN_SHINE_T = "absolute inset-0 bg-gradient-to-br from-[#e8b830]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity";
const BTN_SHINE_BF = "absolute inset-0 bg-gradient-to-br from-[#fb923c]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity";
const BACK = "text-[#a89078] hover:text-[#f0c866] transition-colors uppercase tracking-wider text-sm flex items-center justify-center gap-2 mt-2";

const stepVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
};
const trans = { duration: 0.18 };

export function MenuView({ onStartGame, onRules, onStore }: MenuViewProps) {
  const [step, setStep] = useState<MenuStep>('main');
  const [pendingKind, setPendingKind] = useState<'normal' | 'treasure' | 'battlefield'>('normal');

  const Btn = ({ label, icon, onClick }: { label: string; icon?: React.ReactNode; onClick: () => void }) => (
    <button className={BTN} onClick={onClick}>
      <div className={BTN_SHINE} />
      <span className="relative flex items-center justify-center gap-3">{icon}{label}{icon}</span>
    </button>
  );

  const BtnTreasure = ({ label, icon, onClick }: { label: string; icon?: React.ReactNode; onClick: () => void }) => (
    <button className={BTN_TREASURE} onClick={onClick}>
      <div className={BTN_SHINE_T} />
      <span className="relative flex items-center justify-center gap-3">{icon}{label}{icon}</span>
    </button>
  );

  const BtnBattlefield = ({ label, icon, onClick }: { label: string; icon?: React.ReactNode; onClick: () => void }) => (
    <button className={BTN_BATTLEFIELD} onClick={onClick}>
      <div className={BTN_SHINE_BF} />
      <span className="relative flex items-center justify-center gap-3">{icon}{label}{icon}</span>
    </button>
  );

  const Back = ({ to }: { to: MenuStep }) => (
    <button className={BACK} onClick={() => setStep(to)}>
      <ArrowLeft size={16} /> {hu.common.back}
    </button>
  );

  const Subtitle = ({ text }: { text: string }) => (
    <div className="text-[#a89078] font-['Cinzel',serif] text-[10px] text-center tracking-[5px] uppercase mb-1">{text}</div>
  );

  const renderStep = () => {
    switch (step) {
      case 'main':
        return (
          <motion.div key="main" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={trans} className="flex flex-col gap-4 w-full">
            <Btn label={hu.menu.main1v1} icon={<User size={18} />} onClick={() => setStep('1v1')} />
            <Btn label={hu.menu.mainAi} icon={<Cpu size={18} />} onClick={() => setStep('ai')} />
            <Btn label={hu.menu.mainMulti} icon={<Globe size={18} />} onClick={() => setStep('multiplayer')} />
            <Btn label={hu.menu.mainRules} icon={<BookOpen size={18} />} onClick={onRules} />
            <Btn label={hu.menu.mainStore} icon={<ShoppingBag size={18} />} onClick={onStore} />
          </motion.div>
        );

      case '1v1':
        return (
          <motion.div key="1v1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={trans} className="flex flex-col gap-4 w-full">
            <Subtitle text={hu.menu.subtitle1v1} />
            <Btn label={hu.menu.normal} icon={<Sword size={18} />} onClick={() => onStartGame('pvp')} />
            <BtnTreasure label={hu.menu.treasure} icon={<Map size={18} />} onClick={() => onStartGame('treasure-pvp')} />
            <BtnBattlefield label={hu.menu.battlefield} icon={<Swords size={18} />} onClick={() => onStartGame('battlefield-pvp')} />
            <Back to="main" />
          </motion.div>
        );

      case 'ai':
        return (
          <motion.div key="ai" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={trans} className="flex flex-col gap-4 w-full">
            <Subtitle text={hu.menu.subtitleAi} />
            <Btn label={hu.menu.normal} icon={<Sword size={18} />} onClick={() => { setPendingKind('normal'); setStep('ai-difficulty'); }} />
            <BtnTreasure label={hu.menu.treasure} icon={<Map size={18} />} onClick={() => { setPendingKind('treasure'); setStep('ai-difficulty'); }} />
            <BtnBattlefield label={hu.menu.battlefield} icon={<Swords size={18} />} onClick={() => { setPendingKind('battlefield'); setStep('ai-difficulty'); }} />
            <Back to="main" />
          </motion.div>
        );

      case 'ai-difficulty':
        return (
          <motion.div key="ai-diff" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={trans} className="flex flex-col gap-4 w-full">
            <Subtitle text={hu.menu.subtitleDifficulty} />
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <Btn
                key={d}
                label={d === 'easy' ? hu.menu.easy : d === 'medium' ? hu.menu.medium : hu.menu.hard}
                onClick={() =>
                  onStartGame(
                    pendingKind === 'treasure' ? 'treasure-ai' : pendingKind === 'battlefield' ? 'battlefield-ai' : 'ai',
                    d
                  )
                }
              />
            ))}
            <Back to="ai" />
          </motion.div>
        );

      case 'multiplayer':
        return (
          <motion.div key="multiplayer" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={trans} className="flex flex-col gap-4 w-full">
            <Subtitle text={hu.menu.subtitleMulti} />
            <Btn label={hu.menu.normal} icon={<Sword size={18} />} onClick={() => onStartGame('online')} />
            <BtnTreasure label={hu.menu.treasure} icon={<Map size={18} />} onClick={() => onStartGame('treasure-online')} />
            <BtnBattlefield label={hu.menu.battlefield} icon={<Swords size={18} />} onClick={() => onStartGame('battlefield-online')} />
            <Back to="main" />
          </motion.div>
        );
    }
  };

  return (
    <motion.div
      key="menu"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 flex flex-col items-center justify-center w-full max-w-md p-6"
    >
      <div className="text-center mb-12">
        <h1 className="font-['Cinzel',serif] text-5xl md:text-7xl font-black tracking-[12px] text-[#f0c866] drop-shadow-[0_0_40px_rgba(240,200,102,0.35)]">
          QUORIDOR
        </h1>
        <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#f0c866] to-transparent mx-auto my-4" />
        <div className="text-sm text-[#a89078] tracking-[6px] uppercase">Falsakk &mdash; A Stratégia Játéka</div>
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
