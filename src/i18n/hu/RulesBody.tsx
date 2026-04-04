import React from 'react';
import {
  Move, Shield, Target, Timer, Users, MapPin, Sparkles, ShoppingBag, Gift, Skull,
} from 'lucide-react';

/** Szabályok fő szövegtörzs (fejléc / vissza a Rules.tsx-ben marad). */
export function RulesScrollableContent() {
  return (
    <div className="space-y-8 text-[#a89078]">
      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Target size={20} />
          A játék célja
        </h3>
        <p className="leading-relaxed">
          A Quoridor egy absztrakt stratégiai játék. A célod, hogy a bábuddal <strong>elérd a tábla veled szemben lévő célvonal bármelyik mezőjét</strong>, mielőtt az ellenfeleid elérnék a sajátjukat.
          <span className="block mt-2">
            <strong>2 játékos:</strong> P0 lentről felfelé (8. sor), P1 felülről lefelé (0. sor).
            <strong className="ml-1">3–4 játékos:</strong> két további játékos oldalról indul (oszlop 0 → 8, illetve 8 → 0).
          </span>
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Users size={20} />
          Játékmódok
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-2 leading-relaxed">
          <li><strong>Helyi 2 fős</strong> — klasszikus vagy <strong>Kincskereső</strong> (lásd lent).</li>
          <li><strong>Gép ellen</strong> — nehézség: könnyű / közepes / nehéz; a gép mozgást és falat is választ.</li>
          <li><strong>Online</strong> — lobby, 2–4 játékos, opcionális bot slotok; ugyanaz a szabályrendszer, állapot szinkron. <strong>Csapat mód</strong> (3–4 fő): 3 játékosnál <strong>1+2</strong> (P1 vs P2+P3) vagy <strong>2+1</strong> (P1+P2 vs P3); 4 játékosnál <strong>2–2</strong> (P1+P2 vs P3+P4). Győzelem: ha a csapatod bármelyik bábuja eléri a saját céloldalát, mindannyian nyertesként számítotok.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Move size={20} />
          A kör menete
        </h3>
        <p className="leading-relaxed mb-4">
          A játékosok felváltva jönnek. A saját körödben <strong>egy</strong> dolgot választhatsz:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Lépsz a bábuddal</strong> egy érvényes szomszédos mezőre (lásd ugrás alább).</li>
          <li><strong>VAGY leraksz egy falat</strong> — ha van még fal a készletedben.</li>
          <li><strong>VAGY</strong> (ha van a készletedben) <strong>speciális képességet</strong> használsz — ez is lezárja a kört, hacsak a képesség nem vezet azonnali győzelemhez.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3">Bábu mozgása</h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li>Vízszintesen vagy függőlegesen <strong>egy</strong> mező; <strong>átló tilos</strong>.</li>
          <li>A falakon nem lehet átlépni (kivéve <strong>Vakond</strong> effekt alatt).</li>
          <li><strong>Ugrás:</strong> ha az ellenfél közvetlenül melletted van és nincs köztetek fal, <strong>átugorhatod</strong> — egyenes irányban a túloldalra, vagy „oldalra kitérő” ugrás, ha a közvetlen hátsó mező foglalt vagy fal miatt nem járható.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Shield size={20} />
          Falak
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-4">
          <li><strong>Kezdő falak száma:</strong> 2 játékos — <strong>10–10</strong>; 3 játékos — <strong>7</strong>; 4 játékos — <strong>5</strong> (játékosonként).</li>
          <li>A fal <strong>két mező hosszú</strong>, a rácsvonalakra kerül; vízszintes / függőleges (jobb klikk vagy Forgatás).</li>
          <li>Nem metszhetik / fedhetik egymást; lerakás után fix.</li>
          <li><strong>Tilos olyan falat lerakni, amivel bármely játékos elvágná az összes útvonalat a saját célvonalához.</strong> A játék ezt nem engedi.</li>
        </ul>
      </section>

      <section className="bg-[#f0c866]/10 border border-[#f0c866]/30 p-5 rounded-xl">
        <h3 className="text-xl font-bold text-[#f0c866] mb-2 uppercase tracking-wider">
          Arany szabály
        </h3>
        <p className="text-white font-medium leading-relaxed">
          Minden játékos számára <strong>mindig marad legalább egy lehetséges út</strong> a saját célja felé. Nem lehet „bezáratni” egymást teljesen.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Timer size={20} />
          Időkorlát
        </h3>
        <p className="leading-relaxed">
          Egy körben <strong>2 perc</strong> áll rendelkezésre. Ha lejár: <strong>helyi 2 fős</strong> módban az időtúllépő veszít; <strong>többjátékos / online</strong> esetén az adott játékos köre kihagyásra kerül, a játék folytatódik.
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <MapPin size={20} />
          Kincskereső mód
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-4 leading-relaxed">
          <li>A pályán <strong>?</strong> jelű kincsek jelennek meg; a győzelmi szabály ugyanaz (célvonal).</li>
          <li>Ha a saját körödben a bábud <strong>rákövetkező lépéssel vagy akcióval</strong> a kincs mezőjén áll, <strong>Ásás</strong> gombbal kincset kutathatsz: <strong>véletlen speciális képesség</strong> kerül a készletedbe — ha van hely (max. <strong>2</strong> skill a készleten ebben a módban a kódban; tele készlet esetén üzenetet kapsz).</li>
          <li><strong>Csapdák</strong> csak kincsmódban: üres mezőre helyezhetők; az ellenfélnek rejtettek; rálépéskor vagy oda kerüléskor <strong>visszakerülsz a saját startmeződre</strong>.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Sparkles size={20} />
          Speciális képességek (skillek)
        </h3>
        <p className="text-sm mb-4 leading-relaxed">
          A képességeket az <strong>Áruházban</strong> vásárolhatod meg tojás-valutáért, majd a <strong>Loadout</strong> fülön választod ki, melyek induljanak veled (lásd bolt szekció). <strong>Egy megvásárolt skill = egy felhasználás:</strong> ha elhasználtad a meccsen, többé nincs a birtokodban — <strong>újra meg kell venni</strong>. Típusonként egyszerre csak <strong>egy darab</strong> lehet nálad (és a készleteden sem lehet két azonos típus). Egy körben egy skill; a használat <strong>elfogyasztja</strong> a példányt a készletedből (pl. WALLS azonnal növeli a falaidat, majd a kártya eltűnik).
        </p>
        <div className="overflow-x-auto rounded-lg border border-[#f0c866]/20">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#241810] text-[#f0c866]">
                <th className="p-2 border-b border-[#f0c866]/20">Képesség</th>
                <th className="p-2 border-b border-[#f0c866]/20">Hatás (játéklogika)</th>
              </tr>
            </thead>
            <tbody className="text-[#c8b090]">
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#f0c866]">+2 Fal (WALLS)</td><td className="p-2">Azonnal <strong>+2</strong> fal a készletedhez.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#f97316]">Kalapács</td><td className="p-2">Egy megjelölt, szomszédos fal eltávolítása.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#facc15]">Átugrás (SKIP)</td><td className="p-2">A <strong>körrend szerinti következő</strong> játékos (2–4 főnél is) <strong>kihagy egy kört</strong>.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#34d399]">Pajzs</td><td className="p-2"><strong>2 játékos:</strong> az ellenfél nem tehet bizonyos <strong>vízszintes</strong> falakat a bábuja elé; több körön át (effekt időzítés a motorban).</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#a3e635]">Vakond</td><td className="p-2">Egy körben <strong>átsétálhatsz a falakon</strong> (mozgásnál).</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#a78bfa]">Teleport</td><td className="p-2">Ugrás egy üres mezőre <strong>legfeljebb 2 távolságra</strong> (Manhattan); cél kijelölése szükséges.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#60a5fa]">Mágnes</td><td className="p-2">Minden <strong>másik</strong> játékost egyenként <strong>feléd húz</strong> vízszintesen vagy függőlegesen: ha |sor-különbség| &gt; |oszlop-különbség|, a sor mentén mozdul el max. 2 mezőt (különben az oszlop mentén). Ha a célmező foglalt, az adott bábu nem mozdul.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#f472b6]">Csapda</td><td className="p-2">Üres mezőre helyezhető (cél kijelölés); az ellenfélnek rejtett; rálépéskor <strong>startmezőre</strong> kerülsz.</td></tr>
              <tr className="border-b border-white/5"><td className="p-2 font-semibold text-[#ef4444]">Dinamit</td><td className="p-2">Robbantás egy megjelölt középpont körül: a <strong>3×3 területhez csatlakozó falak</strong> eltűnnek.</td></tr>
              <tr><td className="p-2 font-semibold text-[#22d3ee]">Csere (SWAP)</td><td className="p-2"><strong>Véletlenszerűen</strong> kiválasztott <strong>másik</strong> játékossal megcseréled a pozíciódat (2–4 fő). Csapda / start szabályok utána lefutnak.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-3 text-[#8a7868] leading-relaxed">
          <strong>Mágnes:</strong> a bábukat sorrendben húzza a motor; ha többen is ugyanoda kerülnének, az ütközést elkerülendő az adott húzás kimaradhat. <strong>SWAP</strong> online / több kliensnél a szerver által kapott végállapot a mérvadó (egy játékos gépe dob véletlent a lépés pillanatában).
        </p>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <ShoppingBag size={20} />
          Áruház, Gamepass, tojások
        </h3>
        <ul className="list-disc list-inside space-y-2 ml-4 leading-relaxed">
          <li><strong>Bolt:</strong> skillek megvásárlása <strong>🥚 Alap</strong>, <strong>🌟 Arany</strong> vagy <strong>🌈 Szivárvány</strong> tojásokért (árak a játékban a kártyákon).</li>
          <li><strong>Loadout:</strong> csak olyan skillekből, amiket <strong>épp birtokolsz</strong> (megvásárolt, még fel nem használt példány). Alapból <strong>2</strong> fér el; <strong>5. szint</strong> felett <strong>Gamepass</strong>: <strong>3</strong> hely. Meccsen a használat után a skill kikerül a birtoklásodból és a loadoutodból.</li>
          <li><strong>Tojások:</strong> játék közben jelenhetnek meg (ritkaság eseménytől függően); kattintással gyűjtöd, egyenleg az adatbázisban / lokálisan.</li>
          <li><strong>Gyűjtemény</strong> tab: egyenlegek, megvásárolt skillek, gyűjtési előzmények.</li>
        </ul>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[#f0c866] mb-3 flex items-center gap-2">
          <Gift size={20} />
          Árak összefoglaló (bolt)
        </h3>
        <div className="overflow-x-auto rounded-lg border border-[#f0c866]/20 text-sm">
          <table className="w-full text-left">
            <thead><tr className="bg-[#241810] text-[#f0c866]"><th className="p-2">Skill</th><th className="p-2">Tojás</th><th className="p-2">Ár</th></tr></thead>
            <tbody className="text-[#c8b090]">
              <tr className="border-t border-white/5"><td className="p-2">+2 Fal, Kalapács, Átugrás</td><td className="p-2">🥚 Alap</td><td className="p-2">2 / 3 / 4</td></tr>
              <tr className="border-t border-white/5"><td className="p-2">Pajzs, Vakond, Teleport, Mágnes, Csapda</td><td className="p-2">🌟 Arany</td><td className="p-2">1–3</td></tr>
              <tr className="border-t border-white/5"><td className="p-2">Dinamit, Csere</td><td className="p-2">🌈 Szivárvány</td><td className="p-2">1 / 2</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-[#ef4444]/10 border border-[#ef4444]/25 p-4 rounded-xl flex gap-3">
        <Skull className="text-[#f87171] shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm font-bold text-[#fca5a5] mb-1 uppercase tracking-wider">Online &amp; XP</h3>
          <p className="text-xs text-[#c8b090] leading-relaxed">
            Online meccsek és gép elleni győzelem/vereség <strong>XP-t</strong> ad a profilodnak (szerver oldali szabály szerint). Ranglista és profil a menüből. A játékállapot <strong>Realtime</strong>-szal szinkronizálódik; ha a házigazda elhagyja a lobbyt, a várakozó meccs <strong>megszűnhet</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}
