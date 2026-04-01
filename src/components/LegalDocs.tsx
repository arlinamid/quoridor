import React from 'react';
import { ArrowLeft, ShieldAlert, FileText } from 'lucide-react';

export function TOS({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl text-[#a89078] max-h-[80vh] overflow-y-auto custom-scrollbar mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#a89078] hover:text-[#f0c866] transition-colors uppercase tracking-wider text-sm font-bold">
        <ArrowLeft size={20} /> Vissza
      </button>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-[#f0c866]" size={32} />
        <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866]">Általános Szerződési Feltételek</h2>
      </div>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h3 className="text-lg font-bold text-white mb-2">1. Elfogadás</h3>
          <p>A Quoridor: Falsakk alkalmazás (továbbiakban: "Alkalmazás") használatával Ön elfogadja a jelen Általános Szerződési Feltételeket. Amennyiben nem ért egyet ezekkel a feltételekkel, kérjük, ne használja az Alkalmazást.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">2. Felhasználói Fiókok és Anonim Bejelentkezés</h3>
          <p>Az Alkalmazás lehetőséget biztosít anonim (vendég) bejelentkezésre. Ebben az esetben egy ideiglenes profil jön létre. Ön felelős a fiókjához kapcsolódó minden tevékenységért.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">3. Játékszabályok és Tisztességes Játék</h3>
          <p>A játékosok kötelesek betartani a Quoridor hivatalos szabályait. Tilos bármilyen külső szoftver, bot vagy csalás használata, amely tisztességtelen előnyt biztosít a többi játékossal vagy a beépített mesterséges intelligenciával szemben.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">4. Felelősségkorlátozás</h3>
          <p>Az Alkalmazást "ahogy van" (as is) alapon biztosítjuk. Nem vállalunk felelősséget az adatvesztésért (pl. XP vagy szint elvesztése), szerverleállásokért vagy egyéb technikai hibákért.</p>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl text-[#a89078] max-h-[80vh] overflow-y-auto custom-scrollbar mx-auto">
      <button onClick={onBack} className="mb-6 flex items-center gap-2 text-[#a89078] hover:text-[#f0c866] transition-colors uppercase tracking-wider text-sm font-bold">
        <ArrowLeft size={20} /> Vissza
      </button>
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="text-[#f0c866]" size={32} />
        <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866]">Adatvédelmi Irányelvek</h2>
      </div>
      
      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h3 className="text-lg font-bold text-white mb-2">1. Milyen adatokat gyűjtünk?</h3>
          <p>Anonim bejelentkezés esetén a Supabase hitelesítési rendszere generál egy egyedi azonosítót (UUID). Ezen kívül tároljuk a játékbeli statisztikáit (XP, győzelmek, vereségek, szint) és egy automatikusan generált felhasználónevet.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">2. Hogyan használjuk az adatokat?</h3>
          <p>Az összegyűjtött adatokat kizárólag a játékmenet biztosítására, a ranglisták (leaderboard) megjelenítésére és a felhasználói élmény javítására használjuk fel. Nem értékesítjük adatait harmadik feleknek.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">3. Adatok tárolása és biztonsága</h3>
          <p>Az adatokat a Supabase felhőalapú adatbázisában tároljuk, amely iparági szabványoknak megfelelő biztonsági intézkedésekkel (pl. Row Level Security) védi azokat. A helyi böngésző (localStorage) is tárolhat gyorsítótárazott adatokat a zökkenőmentes élmény érdekében.</p>
        </section>
        
        <section>
          <h3 className="text-lg font-bold text-white mb-2">4. Felhasználói jogok</h3>
          <p>Mivel a jelenlegi rendszer anonim bejelentkezést használ, a fiók törlése a böngészőadatok (localStorage és sütik) törlésével, valamint a kijelentkezéssel történik. Ekkor a kapcsolat a generált UUID és az Ön eszköze között megszakad.</p>
        </section>
      </div>
    </div>
  );
}
