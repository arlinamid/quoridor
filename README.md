# Quoridor Falsakk — A Stratégia Játéka

A Quoridor board game web-alapú implementációja React + Supabase stack-kel.
Magyar nyelvű felület, 6 játékmód, valós idejű online multiplayer, és egy kincskeresős skill-rendszer.

---

## Játékmódok

| Mód | Leírás | XP |
|-----|--------|-----|
| **1 vs 1 — Normal** | Helyi kétjátékos | +20 XP |
| **1 vs 1 — Kincskereső** | Helyi kétjátékos, kincsekkel és skillekkel | +20 XP |
| **1 vs Gép — Normal** | AI ellenfél (Könnyű / Közepes / Nehéz) | +50 győzelem / +10 vereség |
| **1 vs Gép — Kincskereső** | AI + treasure mode | +50 / +10 |
| **Online — Normal** | Valós idejű Supabase multiplayer | +50 / +10 |
| **Online — Kincskereső** | Online + treasure mode | +50 / +10 |

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

---

## Projekt struktúra

```
src/
  App.tsx                    # Fő állapotkezelés és routing
  game/
    logic.ts                 # Játéklogika: BFS, Minimax, skill rendszer
  components/
    QuoridorBoard.tsx        # Játéktábla UI (17×17 grid)
    ThreeBackground.tsx      # Three.js 3D háttér
    Rules.tsx                # Szabályok oldal
    LegalDocs.tsx            # ÁSZF és Adatvédelem
    views/
      AuthView.tsx           # Bejelentkezési képernyő
      MenuView.tsx           # Lépcsőzetes főmenü
      LobbyView.tsx          # Online lobby
      GameView.tsx           # Játékfelület
      LeaderboardView.tsx    # Statisztikák és ranglista
  lib/
    supabase.ts              # Supabase kliens, auth, DB és Edge Function hívások
    types.ts                 # Megosztott típusok (GameMode, View, helper predikátumok)
    fingerprint.ts           # Eszközazonosítás visszatérő játékosokhoz
    utils.ts                 # cn() segédfüggvény

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

Ha a Supabase nincs konfigurálva, az alkalmazás lokális módban indul (localStorage profil, nincs online funkció).

### Fejlesztési szerver

```bash
npm run dev
```

### Build

```bash
npm run build
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
  created_at timestamptz default now()
);

-- games
create table games (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid references profiles(id),
  player2_id uuid references profiles(id),
  state jsonb,
  status text default 'waiting',   -- waiting | playing | finished
  winner_id uuid references profiles(id),
  created_at timestamptz default now()
);
```

### Edge Function deploy

```bash
supabase functions deploy award-xp
```

Az `award-xp` Edge Function server-side XP validációt végez — megakadályozza a kliens oldali XP manipulációt. A kliens automatikusan fallback-el direkt DB frissítésre, ha a funkció nem elérhető.

---

## Játékszabályok

- 9×9-es tábla, két játékos
- Cél: elérni az ellentétes oldalt (P1: sor 8, P2: sor 0)
- Minden játékos kezdetben 10 fallal rendelkezik
- Fal lerakása után is mindkét játékosnak kell elérési útvonalnak lennie (BFS validáció)
- Ugrás lehetséges, ha az ellenfél szomszédos és mögötte szabad
- **Kincskereső módban**: kincsek ásásával skilleket lehet szerezni (max 2 db)

### Skill lista

| Skill | Leírás |
|-------|--------|
| TELEPORT | Ugrás 3 cellán belüli pozícióra |
| HAMMER | Egy fal lerombolása |
| SKIP | Ellenfél körének kihagyása |
| MOLE | 1 körön át átsétálhat falakon |
| DYNAMITE | Egy metszésponthoz csatlakozó összes fal elpusztítása |
| SHIELD | 2 körre blokkolja a vízszintes falakat előtted |
| WALLS | +2 fal az inventoryba |
| MAGNET | Ellenfelet 2 cellával közelebb húzza |
| TRAP | Csapda elhelyezése az aktuális pozícióban |
| SWAP | Pozíciók felcserélése az ellenféllel |

---

## Gamifikáció

- **XP → Szint**: `szint = floor(sqrt(xp / 100)) + 1`
- XP kiosztása server-side az `award-xp` Edge Functionön keresztül
- Ranglista: top 10 játékos XP szerint
- Eszközazonosítás: visszatérő játékosok automatikus felismerése fingerprint alapján
