import React from 'react';
import { ArrowLeft, BookOpen, Move, Shield, Target, User } from 'lucide-react';

interface RulesProps {
  onBack: () => void;
}

export function Rules({ onBack }: RulesProps) {
  return (
    <div className="bg-[#1a0f08]/90 backdrop-blur-xl border border-[#f0c866]/30 p-8 rounded-2xl w-full shadow-2xl overflow-y-auto max-h-[80vh] custom-scrollbar">
      <div className="flex items-center gap-4 mb-8 sticky top-0 bg-[#1a0f08] py-2 z-10 border-b border-[#f0c866]/20">
        <button onClick={onBack} className="text-[#a89078] hover:text-[#f0c866] transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="font-['Cinzel',serif] text-2xl font-bold text-[#f0c866] tracking-widest uppercase flex items-center gap-3">
          <BookOpen size={24} />
          Játékszabályok
        </h2>
      </div>

      <div className="space-y-8 text-[#a89078]">
        <section>
          <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
            <Target size={20} />
            A játék célja
          </h3>
          <p className="leading-relaxed">
            A Quoridor egy absztrakt stratégiai játék. A célod, hogy a bábuddal <strong>elérd a tábla veled szemben lévő, legutolsó sorának bármelyik mezőjét</strong>, mielőtt az ellenfeled elérné a te kezdősorodat.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
            <Move size={20} />
            A kör menete
          </h3>
          <p className="leading-relaxed mb-4">
            A játékosok felváltva jönnek. A saját körödben <strong>két lehetőség</strong> közül kell választanod (csak az egyiket lépheted meg):
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li><strong>Lépsz a bábuddal</strong> egy szomszédos mezőre.</li>
            <li><strong>VAGY leraksz egy falat</strong> a táblára, hogy akadályozd az ellenfelet.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
            <User size={20} /> {/* Need to import User? No, let's use another icon or just text */}
            Bábu mozgása
          </h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>A bábuval <strong>vízszintesen vagy függőlegesen</strong> lehet lépni egy mezőt (előre, hátra, jobbra, balra).</li>
            <li><strong>Átlósan lépni tilos!</strong></li>
            <li>A bábuk nem léphetnek át a falakon.</li>
            <li><strong>Ugrás:</strong> Ha a két bábu közvetlenül egymás mellett áll (és nincs köztük fal), az éppen soron lévő játékos <strong>átugorhatja</strong> az ellenfél bábuját, így egyenes vonalban haladva annak a háta mögötti mezőre érkezik.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
            <Shield size={20} />
            Falak elhelyezése
          </h3>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Minden játékos <strong>10 fallal</strong> kezdi a játékot (2 fős játék esetén).</li>
            <li>A falak pontosan <strong>két mező hosszúságúak</strong>, és a mezők közötti vájatokba (vonalakra) helyezhetők el.</li>
            <li>A falakat <strong>vízszintesen és függőlegesen</strong> is el lehet helyezni. Játék közben a <strong>Jobb Egérgombbal</strong> (vagy a képernyőn lévő Forgatás gombbal) tudod forgatni a falat lerakás előtt.</li>
            <li>A falak nem keresztezhetik egymást, és nem is fedhetik át egymást.</li>
            <li>A már lerakott falakat nem lehet elmozdítani a játék során.</li>
          </ul>
        </section>

        <section className="bg-[#f0c866]/10 border border-[#f0c866]/30 p-5 rounded-xl mt-6">
          <h3 className="text-xl font-bold text-[#f0c866] mb-2 uppercase tracking-wider">
            A Legfontosabb Szabály!
          </h3>
          <p className="text-white font-medium">
            Tilos a falakkal teljesen elzárni az utat! Mindkét játékos számára <strong>mindig nyitva kell hagyni legalább egy lehetséges útvonalat</strong> a célvonala felé. Nem építhetsz olyan falat, ami lehetetlenné teszi a győzelmet.
          </p>
        </section>
      </div>
    </div>
  );
}
