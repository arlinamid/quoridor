import React from 'react';
import { ArrowLeft, ShieldAlert, FileText } from 'lucide-react';
import { TosSections, PrivacySections } from '../i18n/hu/LegalBodies';
import { hu } from '../i18n/hu/ui';

export function TOS({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl text-[#a89078] max-h-[80vh] overflow-y-auto custom-scrollbar mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#a89078] hover:text-[#f0c866] transition-colors uppercase tracking-wider text-sm font-bold">
        <ArrowLeft size={20} /> {hu.common.back}
      </button>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-[#f0c866]" size={32} />
        <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866]">{hu.legal.tosTitle}</h2>
      </div>
      <p className="text-[10px] text-[#a89078]/70 uppercase tracking-wider mb-6">{hu.legal.tosUpdated}</p>
      <TosSections />
    </div>
  );
}

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl text-[#a89078] max-h-[80vh] overflow-y-auto custom-scrollbar mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#a89078] hover:text-[#f0c866] transition-colors uppercase tracking-wider text-sm font-bold">
        <ArrowLeft size={20} /> {hu.common.back}
      </button>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="text-[#f0c866]" size={32} />
        <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866]">{hu.legal.privacyTitle}</h2>
      </div>
      <p className="text-[10px] text-[#a89078]/70 uppercase tracking-wider mb-6">{hu.legal.privacyUpdated}</p>
      <PrivacySections />
    </div>
  );
}
