# Quoridor Falsakk — A Stratégia Játéka

A Quoridor board game web-alapú implementációja React + Supabase stack-kel.
Magyar nyelvű felület, 6 játékmód, 2–4 játékos online multiplayer, AI botok, kincskeresős skill-rendszer, és Easter egg Gamepass áruház.

**Live:** https://quoridor-snowy.vercel.app

---

## Játékmódok

| Mód | Leírás | XP |
|-----|--------|-----|
| **1 vs 1 — Normal** | Helyi kétjátékos | +20 XP |
| **1 vs 1 — Kincskereső** | Helyi kétjátékos, kincsekkel és skillekkel | +20 XP |
| **1 vs Gép — Normal** | AI ellenfél (Könnyű / Közepes / Nehéz) | +50 győzelem / +10 vereség |
| **1 vs Gép — Kincskereső** | AI + treasure mode | +50 / +10 |
| **Online — Normal** | Valós idejű 2–4 játékos multiplayer | +50 / +10 |
| **Online — Kincskereső** | Online + treasure mode | +50 / +10 |

---

## Multiplayer funkciók

- **2–4 játékos** — a host választja a létszámot (2/3/4) a lobby előtt
- **AI botok** — üres slotok feltölthetők bottal; a bot BFS-alapú greedy algoritmust használ, és a host klienséről fut
- **Kézi indítás** — host indíthat, ha ≥2 slot foglalt; 2 perc után automatikus indítás
- **Visszacsatlakozás** — kiesés után 2 percen belül újra be lehet lépni a meccsbe
- **Heartbeat rendszer** — 30 másodpercenként életjelet küld; inaktív játékok 2 perc után automatikusan lezáródnak
- **Játékon belüli maradás** — új online meccs nem indítható, amíg egy másikban benne vagy

---

## Tech Stack

| Réteg | Technológia |
|-------|-------------|
| Frontend | React 19, TypeScript |
| Build | Vite 6 |
| Stílus | Tailwind CSS 4 |
| Animáció | Motion (Framer Motion) |
| 3D háttér | Three.js |
| Backend | Supabase (PostgreSQL + Realtime + Edge Functions) |
| Auth | Supabase Anonymous Auth |
| Deploy | Vercel (SPA + serverless API routes) |
| DB Cron | Supabase pg_cron |

---

## Projekt struktúra

```
src/
  App.tsx                    # Fő állapotkezelés és routing
  game/
    logic.ts                 # Játéklogika: BFS, Minimax, skill rendszer, 4 játékos
  components/
    QuoridorBoard.tsx        # Játéktábla UI (17×17 grid, skálázható cellaméret)
    ThreeBackground.tsx      # Three.js 3D háttér
    Rules.tsx                # Szabályok oldal
    LegalDocs.tsx            # ÁSZF és Adatvédelem
    EasterEggOverlay.tsx     # Floating egg spawn + useEasterEggSpawner hook
    SessionWarning.tsx       # Húsvéti esemény banner (ápr. 4–8.)
    views/
      AuthView.tsx           # Bejelentkezési képernyő (vendég + magic link tab)
      MenuView.tsx           # Lépcsőzetes főmenü (+ Áruház gomb)
      LobbyView.tsx          # Online lobby (2–4 játékos, bot slot-ok)
      GameView.tsx           # Játékfelület (dinamikus 2–4 játékos panel, Easter egg overlay)
      LeaderboardView.tsx    # Statisztikák, ranglista, profil szerkesztés, fiók upgrade
      StoreView.tsx          # Gamepass áruház (Bolt / Loadout / Gyűjtemény tab)
  lib/
    supabase.ts              # Supabase kliens, auth, DB, RPC hívások, egg wallet
    types.ts                 # Megosztott típusok (GameMode, View, CollectibleType, COLLECTIBLE_META)
    fingerprint.ts           # Eszközazonosítás visszatérő játékosokhoz
    utils.ts                 # cn() segédfüggvény

api/                         # Vercel serverless API route-ok
  active-game.ts             # GET ?userId= — aktív játék keresése (visszalépéshez)
  heartbeat.ts               # POST — életjel + stale game sweep
  cleanup-games.ts           # GET — inaktív játékok lezárása (pg_cron hívja)

supabase/
  functions/
    award-xp/
      index.ts               # Edge Function: server-side XP kiosztás
```

---

## Telepítés

```bash
npm install
```

### Környezeti változók (`.env.local`)

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Ha a Supabase nincs konfigurálva, az app lokális módban indul (localStorage profil, nincs online funkció).

### Vercel környezeti változók (dashboard → Settings → Environment Variables)

A Vercel serverless API route-okhoz (`/api/*`) a service role key szükséges az RLS megkerüléséhez:

```
SUPABASE_URL              = https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service-role-key>
```

> ⚠️ A service role key csak a Vercel szerver oldalon használható — soha ne kerüljön a frontend kódba vagy `.env.local`-ba.

### Fejlesztési szerver

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy (Vercel)

```bash
npx vercel --prod
```

---

## Supabase setup

### Táblák

```sql
-- profiles
create table profiles (
  id uuid primary key references auth.users,
  username text,
  xp integer default 0,
  wins integer default 0,
  losses integer default 0,
  level integer default 1,
  fingerprint text,
  created_at timestamptz default now(),
  -- Gamepass & Store (migration szükséges ha meglévő tábla)
  collected_items jsonb default '[]',
  skill_loadout   text[],
  egg_wallet      jsonb default '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}',
  owned_skills    text[] default '{}'
);

-- games
create table games (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  player3_id uuid references profiles(id),
  player4_id uuid references profiles(id),
  state jsonb,
  status text default 'waiting',   -- waiting | playing | finished | abandoned | cancelled
  winner_id uuid references profiles(id),
  max_players integer default 2,
  last_heartbeat timestamptz default now(),
  created_at timestamptz default now()
);
```

### Migrációk (ha meglévő táblák frissítése szükséges)

```sql
-- games tábla bővítések
alter table games add column if not exists max_players integer default 2;
alter table games add column if not exists player3_id uuid references auth.users(id);
alter table games add column if not exists player4_id uuid references auth.users(id);
alter table games add column if not exists last_heartbeat timestamptz default now();

-- profiles tábla — Gamepass & Store
alter table profiles add column if not exists collected_items jsonb default '[]'::jsonb;
alter table profiles add column if not exists skill_loadout text[] default null;
alter table profiles add column if not exists egg_wallet jsonb default '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb;
alter table profiles add column if not exists owned_skills text[] default '{}'::text[];
```

### Store RPC függvények

```sql
-- Tojás hozzáadása a tárcához (játék közben)
create or replace function add_egg_to_wallet(p_user_id uuid, p_egg_type text, p_amount int default 1)
returns void language sql security definer as $$
  update profiles set
    egg_wallet = jsonb_set(coalesce(egg_wallet,'{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb),
      array[p_egg_type], to_jsonb(coalesce((egg_wallet ->> p_egg_type)::int, 0) + p_amount)),
    collected_items = coalesce(collected_items,'[]'::jsonb) ||
      jsonb_build_object('type', p_egg_type, 'collectedAt', now()::text)::jsonb
  where id = p_user_id;
$$;

-- Skill vásárlás tojásokkal (áruházban)
create or replace function purchase_skill_with_eggs(
  p_user_id uuid, p_skill text, p_egg_type text, p_egg_cost int
) returns text language plpgsql security definer as $$
declare current_wallet jsonb; current_bal int;
begin
  select egg_wallet into current_wallet from profiles where id = p_user_id for update;
  if exists (select 1 from profiles where id = p_user_id and p_skill = any(owned_skills)) then return 'already_owned'; end if;
  current_bal := coalesce((current_wallet ->> p_egg_type)::int, 0);
  if current_bal < p_egg_cost then return 'insufficient'; end if;
  update profiles set
    egg_wallet   = jsonb_set(egg_wallet, array[p_egg_type], to_jsonb(current_bal - p_egg_cost)),
    owned_skills = array_append(owned_skills, p_skill)
  where id = p_user_id;
  return 'ok';
end;
$$;
```

### Status constraint (kötelező migráció)

A `games` táblának mind az 5 státuszt engedélyezni kell:

```sql
alter table games drop constraint if exists games_status_check;
alter table games add constraint games_status_check
  check (status = any (array['waiting','playing','finished','abandoned','cancelled']));
```

> Ha ez hiányzik, a pg_cron és a `cancelGame()` hívások csendesen hibáznak.

### pg_cron — automatikus játék lezárás

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'cleanup-stale-games',
  '*/2 * * * *',
  $$
    update games
    set status = 'abandoned'
    where status = 'playing'
      and last_heartbeat < now() - interval '2 minutes'
  $$
);
```

A cron futásainak ellenőrzése:

```bash
npx supabase db query --linked \
  "SELECT jobid, status, return_message, start_time FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;"
```

### Edge Function deploy

```bash
supabase functions deploy award-xp --project-ref <project-ref>
```

Az `award-xp` Edge Function server-side XP validációt végez — megakadályozza a kliens oldali XP manipulációt. CORS fejlécek konfigurálva (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`).

---

## Játékszabályok

- 9×9-es tábla, 2–4 játékos
- **P1** (piros): sor 0 → sor 8 · **P2** (sötétkék): sor 8 → sor 0
- **P3** (zöld): oszlop 0 → oszlop 8 · **P4** (lila): oszlop 8 → oszlop 0
- Falak kezdeti száma: 10 (2 jt.) / 7 (3 jt.) / 5 (4 jt.)
- Fal lerakása után mindenkinek kell elérési útvonalnak lennie (BFS validáció)
- Ugrás lehetséges, ha az ellenfél szomszédos és mögötte szabad
- **Kincskereső módban**: `játékosszám × 2` kincs; kiásással skilleket lehet szerezni (max 2 db)

### Skill lista

Minden skill egy 56×56 px-es ikon gombként jelenik meg, játékos-specifikus akcentszínnel. Hover-re animált tooltip mutatja a nevet és a leírást. Az ellenfél skilljei `???`-ként rejtve jelennek meg online módban.

| Skill | Ikon | Szín | Leírás |
|-------|------|------|--------|
| TELEPORT | ⚡ Zap | lila | Ugrás legfeljebb 2 cellára (célpont kijelölése) |
| HAMMER | 🔨 Hammer | narancs | Egy fal lerombolása (célpont kijelölése) |
| SKIP | ⏭ SkipForward | kék | Ellenfél következő körét kihagyja |
| MOLE | ⛏ Pickaxe | lime | Következő körben átsétálhatsz falakon |
| DYNAMITE | 🔥 Flame | piros | Egy metszésponthoz csatlakozó összes fal robbantása (célpont) |
| SHIELD | 🛡 Shield | cián | 2 körre blokkolja a vízszintes falakat előtted |
| WALLS | ➕ Plus | arany | Azonnal kapsz 2 extra falat |
| MAGNET | 🧲 Magnet | rózsaszín | Ellenfelet 2 cellával közelebb húzza |
| TRAP | 🎯 Crosshair | narancs | Csapda az aktuális cellán — ellenfelet visszadobja starthoz |
| SWAP | ↔ ArrowLeftRight | zöld | Pozíció csere az ellenféllel |

---

## Gamifikáció

- **XP → Szint**: `szint = floor(sqrt(xp / 100)) + 1`
- XP kiosztása server-side az `award-xp` Edge Functionön keresztül
- Ranglista: top 10 játékos XP szerint
- Eszközazonosítás: visszatérő játékosok automatikus felismerése fingerprint alapján
- Lokális fallback: Supabase nélkül is működik localStorage-ban

---

## Gamepass & Áruház

```
Játék közben → Easter egg spawn (véletlenszerű) → kattintás → egg_wallet nő
Áruház → Bolt tab → skill kártya + tojás ár → Megvétel → owned_skills frissül
Áruház → Loadout tab → max 2 skill (3 Gamepass-szel, Lvl 5+) → mentés
Játék indul → loadout skilljeivel kezd a P0 / saját slot (online)
```

### Easter egg ritkasági szintek

Spawn: játék között **legalább ~28 s** telik el két **dobási kísérlet** között (nem minden kör váltáskor dob). A táblázat **egy kísérletre** vonatkozó valószínűség.

| Tojás | Húsvéti esemény (ápr. 4–8.) | Normál | Érték |
|-------|--------------------------|--------|-------|
| 🥚 Alap (EGG_BASIC) | ~3.3% / kísérlet | 0.3% | Közönséges skillekhez |
| 🌟 Arany (EGG_GOLD) | ~0.9% / kísérlet | 0.15% | Ritka skillekhez |
| 🌈 Szivárvány (EGG_RAINBOW) | ~0.3% / kísérlet | 0.05% | Legendás skillekhez |

### Skill árak

| Tier | Skillek | Ár |
|------|---------|-----|
| Alap | Extra Falak (2×🥚), Kalapács (3×🥚), Átugrás (4×🥚) | Alap tojás |
| Arany | Pajzs (1×🌟), Vakond/Teleport (2×🌟), Mágnes/Csapda (3×🌟) | Arany tojás |
| Legendás | Dinamit (1×🌈), Csere (2×🌈) | Szivárvány tojás |

### Gamepass

Szint 5+ automatikusan feloldja a Gamepass-t:
- 3. loadout képességhely (alapból 2)
- (jövőben bővíthető előnyök)

---

## Heartbeat & játék életciklus

```
Játék állapotok:
  waiting → playing → finished   (normál befejezés)
          → cancelled             (host kilép lobby-ból)
                    → abandoned  (heartbeat timeout)

Heartbeat folyamat:
  Kliens  ──POST /api/heartbeat every 30s──▶  Supabase DB (last_heartbeat)
  pg_cron ──every 2 min────────────────────▶  abandoned if last_heartbeat > 2 min

Időtúllépés (per-move, 2 perc):
  2 játékos:   időtúllépő játékos veszít
  3–4 játékos: időtúllépő játékos köre kihagyódik, a következő játékos lép
```
