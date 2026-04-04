# Changelog

All notable changes to Quoridor Falsakk are documented here.

---

## [Unreleased] — 2026-04-04 (patch 5)

### Changed — Skillek 2–4 játékosra
- **SKIP (Átugrás)** — a **`(turn + 1) % n`** játékos kapja a kihagyott kört (körrend szerinti következő), nem egy fix „P0 ellenfél” index.
- **SWAP (Csere)** — **véletlenszerű** másik játékossal cserél helyet; `applySkill` opcionális **`rng`** paraméter tesztekhez. Visszatérés: `{ state, swapPartner? }`.
- **MAGNET** — **minden** ellenfelet külön húz a domináns tengely mentén (vízszintes vagy függőleges, max. 2 mező); **foglalt** célmezőnél az adott húzás kimarad.
- **Teleport** (`QuoridorBoard`) — célcella csak akkor választható, ha **nincs** rajta másik bábu (javítva a `players[1 - turn]` hibás index 3–4 főnél).

### Changed — Csapda & kliens
- **`executeSkill`** — TELEPORT / SWAP / MAGNET után **minden** bábura lefut a csapdaellenőrzés (nem egyetlen `oppIdx`).

### Changed — Dokumentáció & UI szöveg
- **Szabályok** (`Rules.tsx`): kibővített leírások (módok, idő, kincs, skillek táblázat, bolt); SKIP / MAGNET / SWAP sorok az új logikának megfelelően.
- **GameView** / **StoreView** skill tooltip és bolt leírások frissítve.

### Added — Tests
- **`applySkill`** egységtesztek: SKIP 2p és 4p, SWAP seeded `rng`, MAGNET több ellenfél és ütközés-elutasítás.

---

## [Unreleased] — 2026-04-04 (patch 4)

### Security (Supabase)
- **`profiles_peer` nézet** — publikus oszlopok (id, username, xp, wins, losses, level, created_at); **fingerprint / egg_wallet / owned_skills / skill_loadout / collected_items** nem látszanak listázásnál vagy más játékos lekérésénél.
- **RLS** — eltávolítva a „mindenki olvassa a teljes `profiles` sort” policy; **csak saját sor** (`auth.uid() = id`) a teljes táblára.
- **`get_username_for_fingerprint` RPC** — `SECURITY DEFINER`; vendég név előtöltés anon nélkül közvetlen `profiles` scan nélkül.
- **`protect_profile_progression` trigger** — kliens nem módosíthat **xp / wins / losses / level**; **service_role** (pl. `award-xp`) igen.
- **Kliens** — `getDbProfile(userId, viewerUserId)`; ranglista `profiles_peer`; győzelem után **nincs** `updateDbProfile` XP fallback (szerver `getDbProfile` frissítés).

### Added — Tests
- **Vitest** (`npm test`, `npm run test:watch`) + **happy-dom**.
- Tesztek: `profileAccess`, `formatGuestAuthError`, `calculateLevel`, `easterEggRoll` (határértékek + eloszlás), `joinGame` RPC szerződés (`vi.spyOn`), játék `logic` (hasWon, initState, v2w, isBlocked), dokumentációs security invariant lista.
- **`rollEggAt`** kivonva `easterEggRoll.ts`-be a determinisztikus tesztekhez.

---

## [Unreleased] — 2026-04-04 (patch 3)

### Changed
- **Easter egg spawn** — legalább **28 s** valós idő két spawn-kísérlet között (`MIN_MS_BETWEEN_SPAWN_ATTEMPTS` a `useEasterEggSpawner`-ben); korábban minden kör váltáskor dobott, gyors játékban túl sűrűn jelent meg tojás. Kilépés a játékból nullázza a számlálót.
- **Húsvéti esemény dobás** (~ápr. 4–8.) — valószínűségek mérsékelve (össz. ~**4,5%** / sikeres kísérlet a korábbi ~6% körül helyett): szivárvány ~0,3%, arany ~0,9%, alap ~3,3%.

### Fixed
- **Vendég (anonim) bejelentkezés** — `try/catch/finally`, külön `guestSigningIn` / `guestAuthError` állapot; hiba az `AuthView`-ban jelenik meg, nem `alert` + globális `authLoading`. `formatGuestAuthError()` magyar szöveg (pl. Supabase „Database error creating anonymous user” / 500).
- **Supabase migrációk** — fájlnevek egyedi időbélyegre (`20260404120010` … `20260404120060`), hogy a `schema_migrations` ne írjon ütköző `20260404` verziót; `migration repair` + `db push` a távoli DB-re.
- **`handle_new_user` trigger** — ha a felhasználónév-ütközés ciklusa nem oldódik, **`Játékos_` + UUID (kötőjel nélkül)** garantált egyedi név; csökkenti az anonim signup 500-as auth hibát.

---

## [Unreleased] — 2026-04-04 (patch 2)

### Fixed — Code Review (12 bug)
- **Winner display** — win modal mostantól `winnerIdx` state-t használ, nem `gameState.turn`-t; a turn előre léphetett mire a modal renderelt
- **Online 3–4 player winner** — a nyertes slotját `winner_id` → player1–4_id lookup alapján határozza meg; korábban csak P0/P1 esetén volt helyes
- **Csapda teleport P2/P3** — `PLAYER_START` tömb definiálja a helyes start pozíciót (`{r:4,c:0}` és `{r:4,c:8}`); korábban mindenki az r=0 vagy r=8 pozícióba ugrott
- **`handleWin` stale closure** — `executeMove` és `executeSkill` mostantól `handleWinRef.current()` hívja a `handleWin` callbacket; eltávolítva a `useCallback` deps-ből
- **SWAP/MAGNET csapda check** — `oppIdx = 1 - Math.min(turn, 1)` egyező a `applySkill` logikájával; `1 - prev.turn` 3–4 player esetén `-1`/`-2` indexet adott
- **`disconnectTimerRef` leak** — realtime subscription cleanup mostantól `clearTimeout`-ot hív a timer törlésére; korábban a timer a subscription eltávolítása után is futott
- **Auto-start timer stale closure** — `botSlotsRef.current` és `gameStateRef.current` olvasva közvetlenül, nem a closure-ból rögzített értékek
- **Online joiner skill loadout** — `skillLoadoutRef.current` alkalmazza a saját loadout-ot a saját player slotjára a realtime `'playing'` eseménynél; korábban a host state-je üres inventoryval érkezett
- **`startGame` stale loadout** — `skillLoadoutRef.current`-t olvas a closure-ba rögzített `skillLoadout` helyett; `onlineGameId` hozzáadva deps-be
- **Easter egg collect hiba** — `collectEasterEgg` hívás `try/catch`-be csomagolva; korábban a hálózati hiba crashelhette a játékot
- **EasterEggFloater `timeLeft` negatív** — `Math.max(0, p - 1)` hogy ne menjen 0 alá; `egg.type` hozzáadva dep-be a reset miatt
- **`botSlotsRef` és `skillLoadoutRef`** — két új ref hozzáadva az összes kapcsolódó stale closure megelőzéséhez

---

## [Unreleased] — 2026-04-04 (patch 1)

### Added
- **Gamepass & Áruház** (`StoreView`) — új nézet 3 tabbal:
  - **Bolt**: mind a 10 skill kártyán; Easter egg-ekkel vásárolható (nem XP); ár tier szerint: Alap/Arany/Szivárvány tojás; „Megvétel" gomb, egyenleg ellenőrzéssel
  - **Loadout**: saját (megvásárolt) skillekből max 2 aktív (3 Gamepass-szel, azaz Lvl 5+); játék indulásakor ezek kerülnek az inventory-ba
  - **Gyűjtemény**: tojás egyenleg összesítő, megvásárolt skill lista, gyűjtési előzmények (dátum + ritkasági szint)
- **Easter Egg rendszer** — játék közben (nem kezdéskor) véletlenszerűen megjelenik egy animált tojás; 8 mp-ig kattintható; kattintásra `egg_wallet` nő; 3 ritkasági fokozat: 🥚 Alap / 🌟 Arany / 🌈 Szivárvány
- **Easter esemény** (2026. ápr. 4–8.) — tojás spawn ráta 6–12× magasabb; `SessionWarning` banner jelenik meg; banner bezárható, localStorage-ban menti (`DISMISS_KEY`)
- **Skill loadout játékindulásnál** — `initState(treasureMode, playerCount, loadout?)` harmadik paraméter; P0 inventory-ja a kiválasztott loadout-tal tölt fel; online játékosnál saját slotja is frissítve a realtime game start eseménynél
- **Branded email sablonok** — `/supabase/email-templates/` könyvtár:
  - `magic-link.html` — sötét téma, arany gomb, ⚡ ikon, 10 perces érvényesség
  - `confirm-email-change.html` — zöld gomb, 🛡️ ikon, megmaradó adatok listája, 1 órás érvényesség
- **Részletes profil & vendég → regisztrált upgrade** — `LeaderboardView` kibővítve: szerkeszthető felhasználónév, fiók típus badge (Vendég / Regisztrált), 4 statisztika kártya, XP progress bar, email upgrade szekció magic link-kel
- **Magic link bejelentkezés** — `AuthView` email tab: OTP küldés, success állapot, „Másik email" reset; `signInWithMagicLink()` → Supabase `signInWithOtp`
- **Cross-browser email konfirmáció szinkron** — `USER_UPDATED` event kezelése `onAuthStateChange`-ben; „Már megerősítettem" gomb `refreshSession()` hívással; sikeres eredmény esetén badge automatikusan frissül
- **Tojás valuta rendszer** — `egg_wallet` JSONB oszlop (spendable egyenleg típusonként); `owned_skills` TEXT[] (megvásárolt skillек); `purchased_skill_with_eggs()` RPC (atomi egyenleg ellenőrzés + levonás + skill hozzáadás); `add_egg_to_wallet()` RPC (egyenleg növelés + history append)

### Fixed
- **RLS UPDATE P3/P4** — `games_update_player` policy kiegészítve `player3_id` és `player4_id` oszlopokkal; korábban P3/P4 néma hibával nem tudta frissíteni a játékállapotot
- **pg_cron CHECK constraint** — `games_status_check` újraalkotva mind az 5 státusszal (`waiting|playing|finished|abandoned|cancelled`); korábban az `abandoned` és `cancelled` hiányzott, minden cron futás hibázott
- **Cross-browser session** — `onAuthStateChange` `USER_UPDATED` event most mutatja az email megerősítési visszajelzést; a másik böngészőből a `refreshSession()` gomb frissít

### DB migrations szükséges
```sql
-- Store funkciók (egg_wallet, owned_skills, collected_items, skill_loadout)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS collected_items JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS skill_loadout   TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS egg_wallet      JSONB  DEFAULT '{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb,
  ADD COLUMN IF NOT EXISTS owned_skills    TEXT[] DEFAULT '{}'::text[];

-- RPC: tojás hozzáadása a tárcához
CREATE OR REPLACE FUNCTION add_egg_to_wallet(p_user_id UUID, p_egg_type TEXT, p_amount INT DEFAULT 1)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET
    egg_wallet = jsonb_set(COALESCE(egg_wallet,'{"EGG_BASIC":0,"EGG_GOLD":0,"EGG_RAINBOW":0}'::jsonb),
      ARRAY[p_egg_type], to_jsonb(COALESCE((egg_wallet ->> p_egg_type)::int, 0) + p_amount)),
    collected_items = COALESCE(collected_items,'[]'::jsonb) ||
      jsonb_build_object('type', p_egg_type, 'collectedAt', now()::text)::jsonb
  WHERE id = p_user_id;
$$;

-- RPC: skill vásárlás tojásokkal
CREATE OR REPLACE FUNCTION purchase_skill_with_eggs(
  p_user_id UUID, p_skill TEXT, p_egg_type TEXT, p_egg_cost INT
) RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE current_wallet JSONB; current_bal INT;
BEGIN
  SELECT egg_wallet INTO current_wallet FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND p_skill = ANY(owned_skills)) THEN RETURN 'already_owned'; END IF;
  current_bal := COALESCE((current_wallet ->> p_egg_type)::int, 0);
  IF current_bal < p_egg_cost THEN RETURN 'insufficient'; END IF;
  UPDATE profiles SET
    egg_wallet   = jsonb_set(egg_wallet, ARRAY[p_egg_type], to_jsonb(current_bal - p_egg_cost)),
    owned_skills = array_append(owned_skills, p_skill)
  WHERE id = p_user_id;
  RETURN 'ok';
END;
$$;
```

---

## [Unreleased] — 2026-04-04

### Added
- **3–4 player multiplayer** — host selects 2/3/4 players in lobby; P3 moves left→right, P4 right→left; each player gets their own color (red/dark blue/green/purple)
- **AI bots in multiplayer lobby** — host can fill any empty slot with a bot; bots use `greedyBotMove` (BFS-based greedy, works for any player index); bots are driven by the host's client and synced via Supabase Realtime
- **Manual start + 2-minute auto-start** — host can start when ≥2 slots are filled; auto-start fires after 2 minutes
- **Heartbeat system** — clients POST to `/api/heartbeat` every 30 s while in a game; each call also sweeps stale games (last_heartbeat > 2 min → `abandoned`)
- **Auto-close stale games** — `api/cleanup-games.ts` endpoint + Supabase pg_cron `*/2 * * * *` closes abandoned games at the DB level without requiring Vercel Pro
- **Rejoin within 2 minutes** — on login, `getActiveGame()` checks for an active `'playing'` game; a banner on the menu offers one-click rejoin; `handleRejoinGame` restores full game state
- **Block new game while in one** — `startGame()` guards against starting a new online game when `onlineGameId` is set; host's "leave lobby" cancels the game in DB via `cancelGame()`
- **Vercel API** — `api/active-game.ts` server-side endpoint returns the user's active game (used for rejoin detection)
- **Dynamic player panels** — `GameView` now renders all players from `gameState.players` (2–4); each card shows color dot, name, wall count, bot badge, and active-turn highlight
- **Larger board for 3–4 players** — cells scale from `clamp(28px,6vw,48px)` (2-player) to `clamp(28px,8vw,60px)` (3–4 player) so desktop gets larger cells while mobile stays compact
- **Scaled treasure count** — `playerCount × 2` treasures per game (4/6/8 for 2/3/4 players)
- **4-color pawns** — `PLAYER_COLORS` used for pawns and goal-line edge indicators on all 4 sides
- **Disconnect tolerance** — presence leave timeout extended from 3 s to 2 minutes; presence join clears the timer and shows "Ellenfél visszacsatlakozott!"
- **`'abandoned'` game status** — realtime subscription detects abandoned games and shows "Játék lezárva — inaktivitás miatt."
- **Presence-aware bot failover** — `connectedUserIds` tracked via Supabase Presence; bot controller computed as the lowest-indexed *connected* human; if host disconnects, the next connected player automatically drives the bots
- **Per-player profiles in game** — `playerProfiles: Record<number, Profile>` replaces single `opponent`; all player slots (2–4) resolved correctly by role index; bot slots show "Bot", AI shows "Gép (AI)"
- **Skill icon buttons with tooltips** — each skill rendered as a 56×56 icon button with unique Lucide icon, per-skill accent colour, active glow when in targeting mode, and animated hover tooltip (skill name + Hungarian description); opponent skills shown as lock icon + `???`
- **Lobby player names** — slot rows now show the joining player's actual username in their player colour; `lobbySlotNames` fetched on every `hostedGameData` change; own slot resolved from local profile without extra DB call

### Fixed
- `cloneS` now preserves `botPlayers` field (was silently dropped, causing bots to stop after first move)
- `mmRoot` replaced with `greedyBotMove(s, pi)` for bot moves — `mmRoot` was hardcoded for player index 1; new function works for any player index
- `executeMove` and `executeSkill` win checks now use `hasWon(p)` to support `goalCol` players (P3/P4)
- Board min cell size kept at 28px on mobile (was 36px, caused overflow on narrow screens)
- `award-xp` Edge Function CORS: added `Access-Control-Allow-Methods: POST, OPTIONS` header
- **Stale lobby games** — `handleCreateOnlineGame` calls `cancelMyWaitingGames()` before inserting; old abandoned waiting games no longer accumulate in the lobby list
- **Duplicate player names** — in 3–4 player online games all non-self slots now resolve to the correct username via `playerProfiles[pi]`; previously all showed the same single `opponent` profile
- **Timer fires from game start** — `initState` was setting `lastMoveTime: Date.now()`, so the 2-minute clock started at game creation; changed to `undefined` so timer only starts after the first actual move
- **Timer stale closure / freeze** — timer effect depended on `[gameState, handleWin, ...]`; recreated on every move; stale `gameOver` in closure caused repeated `handleWin` calls; full rewrite using refs (`gameStateRef`, `modeRef`, `onlineRoleRef`, `handleWinRef`) with `[view]` only as dependency
- **Timer wrong winner for 3–4 players** — `1 - gameState.turn` gives `-1` for player index 2; 3–4 player timeout now skips the timed-out player's turn instead of declaring an invalid winner
- **API heartbeat/cleanup silently failing** — all three Vercel API files used `VITE_SUPABASE_ANON_KEY` which cannot bypass RLS; switched to `SUPABASE_SERVICE_ROLE_KEY` (with `VITE_` prefix fallback)
- **pg_cron failing since setup** — `games_status_check` constraint only allowed `waiting | playing | finished`; `abandoned` and `cancelled` were missing; every cron run errored; fixed by dropping and recreating the constraint with all 5 valid statuses

### Changed
- Vercel cron removed (Hobby plan limit); cleanup handled by heartbeat piggyback + Supabase pg_cron instead
- `initState(treasureMode, playerCount)` — player starting positions and wall counts scale with player count
- API files use `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_URL` env var names (with `VITE_` fallback) — add both to Vercel dashboard

### DB migrations required
```sql
alter table games add column if not exists max_players integer default 2;
alter table games add column if not exists player3_id uuid references auth.users(id);
alter table games add column if not exists player4_id uuid references auth.users(id);
alter table games add column if not exists last_heartbeat timestamptz default now();

-- Fix status constraint (add abandoned + cancelled)
alter table games drop constraint if exists games_status_check;
alter table games add constraint games_status_check
  check (status = any (array['waiting','playing','finished','abandoned','cancelled']));

-- pg_cron cleanup (run once)
create extension if not exists pg_cron;
select cron.schedule('cleanup-stale-games', '*/2 * * * *', $$
  update games set status = 'abandoned'
  where status = 'playing' and last_heartbeat < now() - interval '2 minutes'
$$);
```

---

## [0.5.0] — 2026-04-03

### Added
- **Hierarchical menu** — stepped navigation replaces flat button list:
  `1v1 → Normal / Kincskereső`, `1 vs Gép → Normal / Kincskereső → Nehézség`, `Multiplayer → Normal / Kincskereső`
- **`treasure-online` mode** — online multiplayer in treasure mode; lobby filters by matching mode
- **Server-side XP** — Supabase Edge Function `award-xp` validates and awards XP server-side, preventing client manipulation; client falls back to direct DB update on error
- **Component extraction** — `App.tsx` (1172 → ~500 lines) split into `MenuView`, `AuthView`, `LobbyView`, `GameView`, `LeaderboardView`; shared `GameMode` types in `src/lib/types.ts`
- **`GameMode` predicates** — `isOnlineMode()`, `isTreasureMode()`, `isAIMode()`
- **TELEPORT range** limited to 2 cells (was 3)

### Fixed
- XP progress bar correctly reflects XP within current level bracket

---

## [0.4.0] — 2026-04-03

### Added
- **Treasure mode** (`treasure-pvp`) — 4 treasures on the board; players dig to find random skills
- **Skill system** — 10 skills: TELEPORT, HAMMER, SKIP, MOLE, DYNAMITE, SHIELD, WALLS, MAGNET, TRAP, SWAP
- Trap mechanic — traps teleport opponents back to start
- Inventory UI — up to 2 skills per player; skills hidden from opponent in online mode
- `applySkill`, `advanceTurn`, `cloneS` exported from `logic.ts`

---

## [0.3.0] — 2026-04-03

### Added
- **AI difficulty selection** — Easy (depth 1), Medium (depth 2), Hard (depth 3)

---

## [0.2.0] — 2026-04-01

### Added
- **Win handling** — win overlay with XP rewards (+50 win / +10 loss for AI/online, +20 for local PvP)
- **Refs pattern** — `gameStateRef`, `viewRef`, `showWinRef` to prevent stale closure bugs in async effects
- **Presence delay** — grace period before declaring disconnect win
- **Rules view** — in-game rules page accessible from menu
- SEO metadata and Open Graph tags

---

## [0.1.0] — 2026-04-01

### Added
- Initial project setup — Vite + React 19 + TypeScript + Tailwind CSS 4
- Core Quoridor game logic (`logic.ts`): BFS pathfinding, wall validation, valid move generation
- Minimax AI with alpha-beta pruning
- `QuoridorBoard` — 17×17 grid, wall hover/placement, pawn animations
- `ThreeBackground` — Three.js 3D board with procedural wood texture
- Online multiplayer via Supabase Realtime (PostgreSQL change tracking + Presence)
- Anonymous authentication with device fingerprinting
- XP / level / win-loss tracking; localStorage fallback
- Leaderboard (top 10 by XP)
- `LegalDocs` — ÁSZF and Privacy Policy
