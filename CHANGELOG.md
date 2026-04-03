# Changelog

All notable changes to Quoridor Falsakk are documented here.

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

### Fixed
- `cloneS` now preserves `botPlayers` field (was silently dropped, causing bots to stop after first move)
- `mmRoot` replaced with `greedyBotMove(s, pi)` for bot moves — `mmRoot` was hardcoded for player index 1; new function works for any player index
- `executeMove` and `executeSkill` win checks now use `hasWon(p)` to support `goalCol` players (P3/P4)
- Board min cell size kept at 28px on mobile (was 36px, caused overflow on narrow screens)
- `award-xp` Edge Function CORS: added `Access-Control-Allow-Methods: POST, OPTIONS` header

### Changed
- Vercel cron removed (Hobby plan limit); cleanup handled by heartbeat piggyback + Supabase pg_cron instead
- `initState(treasureMode, playerCount)` — player starting positions and wall counts scale with player count

### DB migrations required
```sql
alter table games add column if not exists max_players integer default 2;
alter table games add column if not exists player3_id uuid references auth.users(id);
alter table games add column if not exists player4_id uuid references auth.users(id);
alter table games add column if not exists last_heartbeat timestamptz default now();

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
