import React from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { RulesScrollableContent } from '../i18n/hu/RulesBody';
import { hu } from '../i18n/hu/ui';

interface RulesProps {
  onBack: () => void;
}

export function Rules({ onBack }: RulesProps) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl overflow-y-auto max-h-[80vh] custom-scrollbar">
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#1a0f08] py-2 z-10 border-b border-[#f0c866]/20">
        <button type="button" onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase flex items-center gap-3">
          <BookOpen size={24} />
          {hu.rules.title}
        </h2>
      </div>
      <RulesScrollableContent />
    </div>
  );
}
