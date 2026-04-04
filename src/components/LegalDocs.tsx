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
      <p className="text-[10px] text-[#a89078]/70 uppercase tracking-wider mb-6">Utolsó frissítés: 2026. április 4. · Quoridor: Falsakk webes alkalmazás</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h3 className="text-lg font-bold text-white mb-2">1. Szolgáltató és elfogadás</h3>
          <p>
            A Quoridor: Falsakk (a továbbiakban: <strong>„Szolgáltatás”</strong>) egy böngészőben futó játékalkalmazás. A Szolgáltatás használatával Ön elfogadja jelen Általános Szerződési Feltételeket (<strong>ÁSZF</strong>) és az{' '}
            <strong>Adatvédelmi tájékoztatót</strong>. Ha nem ért egyet, ne használja a Szolgáltatást.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">2. Fiókok, vendég mód és email</h3>
          <p>
            Bejelentkezhet <strong>anonim (vendég)</strong> módban — ilyenkor a tárhelyszolgáltató (Supabase Auth) egyedi azonosítót rendel az Ön munkamenetéhez. Választhatja az <strong>email alapú magic link</strong> bejelentkezést is; ekkor az email-cím az azonosítás és a kapcsolattartás része lehet.
          </p>
          <p className="mt-2">
            Ön felelős a fiókjával történő minden tevékenységért. A felhasználónév nem lehet mások jogait sértő, megtévesztő vagy jogellenes tartalmú.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">3. Játékszabályok és tisztességes használat</h3>
          <p>
            A játék a Quoridor szabályrendszerén alapul. Tilos olyan külső eszköz, automatizálás, exploit vagy más játékosok megtévesztésére alkalmas magatartás, amely tisztességtelen előnyt biztosít (ideértve a nem hivatalos botokat a többjátékos módban).
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">4. Virtuális tartalmak és előfizetés</h3>
          <p>
            A játékban megjelenő virtuális elemek (pl. tojások, skillek, kozmetikai jellegű funkciók) a Szolgáltatás részei; <strong>nem</strong> minősülnek forgalomképes dolognak külön értékesítés céljából, hacsak a felület másként nem jelzi. A tartalom és az árazás előzetes értesítés nélkül változhat.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">5. Szellemi tulajdon</h3>
          <p>
            A Szolgáltatás felületének, szövegeinek, grafikáinak és kódjának jogai a jogosultakat illetik. A játék szabályai közismert társasjáték-szabályokon alapulnak; a megvalósítás (szoftver, dizájn) önálló alkotásnak minősül.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">6. Korlátozott felelősség</h3>
          <p>
            A Szolgáltatást „ahogy van” (<em>as is</em>) formában nyújtjuk. Nem vállalunk felelősséget a szünetmentes működésért, adatvesztésért, harmadik felek (pl. tárhely, hálózat) hibájából eredő károkért, illetve a játékbeli eredményekért. A jogszabályok által kizárni nem engedett mértékben érvényes felelősség változatlan.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">7. Szüneteltetés és megszüntetés</h3>
          <p>
            Fenntartjuk a jogot a Szolgáltatás módosítására, korlátozására vagy megszüntetésére — lehetőség szerint ésszerű előzetes tájékoztatással. Jogsértő vagy visszaélésszerű használat esetén a hozzáférés felfüggeszthető vagy megszüntethető.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">8. Panasz, kapcsolat</h3>
          <p>
            Észrevételeit, panaszait a Szolgáltatás üzemeltetője által közzétett elérhetőségen jelezheti (pl. projekt README / tárhely). Fogyasztói jogvitákban illetékes lehet a lakóhelye szerinti fogyasztóvédelmi hatóság vagy békéltető testület.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">9. ÁSZF módosítása</h3>
          <p>
            Az ÁSZF időszakosan frissülhet. A lényeges változásokról ésszerűen tájékoztatjuk a felhasználókat (pl. dátum a dokumentumban, kiemelés a bejelentkezési felületen). A változás közzététele után a Szolgáltatás további használata az új feltételek elfogadásának minősül.
          </p>
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
        <h2 className="font-['Cinzel',serif] text-3xl font-bold text-[#f0c866]">Adatvédelmi tájékoztató</h2>
      </div>
      <p className="text-[10px] text-[#a89078]/70 uppercase tracking-wider mb-6">Utolsó frissítés: 2026. április 4. · GDPR / 2011. évi CXII. törvény összhang</p>

      <div className="space-y-6 text-sm leading-relaxed">
        <section>
          <h3 className="text-lg font-bold text-white mb-2">1. Adatkezelő</h3>
          <p>
            A Szolgáltatást üzemeltető természetes vagy jogi személy (a továbbiakban: <strong>Adatkezelő</strong>) felelős az alábbiak szerinti adatkezelésért. Pontos név és elérhetőség a projekt dokumentációjában / kapcsolatfelvételi csatornában található.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">2. Kezelt adatkörök</h3>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Azonosítás:</strong> Supabase Auth felhasználói azonosító (UUID); opcionálisan email-cím (magic link regisztráció esetén).</li>
            <li><strong>Profil / játék:</strong> felhasználónév, XP, szint, győzelem/vereség, játékhoz kapcsolódó beállítások (pl. skill loadout), eszköz-alapú vendégazonosítás (fingerprint hash) — ha megadásra kerül.</li>
            <li><strong>Gyűjtemény / bolt:</strong> virtuális egyenlegek (tojások), megvásárolt skillek, gyűjtési előzmények — ha a funkció engedélyezve van.</li>
            <li><strong>Többjátékos:</strong> játékállapot, játékban résztvevő azonosítók a szabályos működéshez.</li>
            <li><strong>Technikai:</strong> böngésző helyi tároló (localStorage) a kényelmes működéshez; szerver oldali naplózás a tárhelyszolgáltató szabályai szerint.</li>
            <li><strong>Marketing tiltás:</strong> <code>marketing_opt_out</code> jelző — ha bekapcsolja a profilban, rögzítjük, hogy nem kér opcionális marketing/promóciós megkeresést.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">3. Adatkezelés célja és jogalapja</h3>
          <p>
            A szerződés teljesítése és a Szolgáltatás nyújtása (játék, szinkron, ranglista), jogos érdek (biztonság, visszaélések megelőzése), valamint — ahol alkalmazandó — az Ön hozzájárulása (pl. opcionális értesítések). A kötelező jogi kötelezettségek teljesítése külön jogcímen történhet.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">4. Tárhelyszolgáltató (feldolgozó)</h3>
          <p>
            Az adatokat jelenleg a <strong>Supabase</strong> (PostgreSQL, Auth, Realtime) infrastruktúrájában tároljuk, amely EU-n kívüli szervereket is használhat. Az átadás során az EU általános adatvédelmi rendeletének (GDPR) megfelelő garanciák (pl. szerződéses záradékok) érvényesülhetnek. Részletek:{' '}
            <a href="https://supabase.com/privacy" className="text-[#f0c866] underline underline-offset-2" target="_blank" rel="noopener noreferrer">supabase.com/privacy</a>.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">5. Megőrzési idő</h3>
          <p>
            A fiók fennállásáig, illetve amíg az adatkezelés célja megvalósul. Törlés vagy inaktivitás után az adatokat ésszerű határidőn belül törölhetjük vagy anonimizálhatjuk, kivéve, ha jogszabály hosszabb megőrzést ír elő.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">6. Az Ön jogai</h3>
          <p>Önnek joga van többek között:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>tájékoztatást kérni kezelt adatairól;</li>
            <li>helyesbítést kérni;</li>
            <li>törlést kérni („elfeledtetés”), ha nem áll fenn jogos ok a további kezelésre;</li>
            <li>adathordozhatósághoz (strukturált, géppel olvasható formátum) — ahol alkalmazandó;</li>
            <li>tiltakozni a jogos érdeken alapuló kezelés ellen;</li>
            <li>panaszt tenni a <strong>Nemzeti Adatvédelmi és Információszabadság Hatóságnál</strong> (NAIH):{' '}
              <a href="https://www.naih.hu" className="text-[#f0c866] underline underline-offset-2" target="_blank" rel="noopener noreferrer">naih.hu</a>.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">7. Marketing és opt-out</h3>
          <p>
            Jelenleg a Szolgáltatás <strong>nem</strong> küld tömeges marketing emaileket. Ha a jövőben bevezetünk opcionális hírlevelet vagy promóciós értesítést, azt csak jogalap (tipikusan hozzájárulás vagy jogos érdek) mellett tesszük, és leiratkozási lehetőséget biztosítunk.
          </p>
          <p className="mt-2">
            A <strong>Statisztika</strong> nézetben a <strong>„Nem kérek marketing vagy promóciós megkereséseket”</strong> beállítással előre jelezheti, hogy ilyen megkereséseket ne kapjon — ezt a profilban tároljuk (<code>marketing_opt_out</code>).
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">8. Sütik és helyi tároló</h3>
          <p>
            A munkamenet és a bejelentkezés működéséhez a böngésző és a tárhelyszolgáltató sütiket / tárolót használhat. A játék a <strong>localStorage</strong>-ban tárolhat másolatot a profilról a gyorsabb betöltéshez; ezt a böngésző beállításaiban törölheti.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">9. Kiskorúak</h3>
          <p>
            A Szolgáltatás nem célzott kifejezetten 16 év alattiakra. Ha tudomásunkra jut, hogy szülői hozzájárulás nélkül gyermekadatait kezeljük, lépéseket teszünk az adatok törlése érdekében.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-bold text-white mb-2">10. Tájékoztató módosítása</h3>
          <p>
            Ezt a tájékoztatót frissíthetjük. A változás dátumát a dokumentum tetején jelezzük. Lényeges változásnál — ahol szükséges — külön értesítést vagy újbóli elfogadást kérhetünk.
          </p>
        </section>
      </div>
    </div>
  );
}
