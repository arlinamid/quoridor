# Changelog

All notable changes to Quoridor Falsakk are documented here.

---

## [Unreleased] — 2026-04-03

### Added
- **Hierarchical menu** — stepped navigation replaces flat button list:
  `1v1 → Normal / Kincskereső`, `1 vs Gép → Normal / Kincskereső → Nehézség`, `Multiplayer → Normal / Kincskereső`
- **`treasure-ai` mode** — AI opponent in treasure mode with skill system
- **`treasure-online` mode** — online multiplayer in treasure mode; lobby filters by matching mode; treasure indicator shown on game cards
- **Server-side XP** — Supabase Edge Function `award-xp` validates and awards XP server-side, preventing client-side manipulation. Client falls back to direct DB update if the function is unavailable
- **Component extraction** — `App.tsx` split into `MenuView`, `AuthView`, `LobbyView`, `GameView`, `LeaderboardView` + shared `GameMode` types in `src/lib/types.ts`
- **XP bar fix** — level progress bar now correctly reflects XP within the current level bracket
- **`GameMode` helper predicates** — `isOnlineMode()`, `isTreasureMode()`, `isAIMode()` used throughout for cleaner logic

### Changed
- `awardXp` in `supabase.ts` calls Edge Function; falls back to `updateDbProfile` on error
- Lobby now filters waiting games by treasure/normal mode to avoid joining a mismatched game

---

## [0.4.0] — 2026-04-03

### Added
- **Treasure mode** (`treasure-pvp`) — 4 treasures on the board; players dig to find random skills
- **Skill system** — 10 skills: TELEPORT, HAMMER, SKIP, MOLE, DYNAMITE, SHIELD, WALLS, MAGNET, TRAP, SWAP
- Trap mechanic — players can place traps that teleport opponents back to start
- Inventory UI — up to 2 skills per player; skills shown in-game, hidden from opponent in online mode
- `applySkill`, `advanceTurn`, `cloneS` exported from `logic.ts`
- `PlayerEffect` and treasure/trap state in `GameState`

---

## [0.3.0] — 2026-04-03

### Added
- **AI difficulty selection** — Easy (depth 1), Medium (depth 2), Hard (depth 3)
- AI selection screen in menu before starting AI game

---

## [0.2.0] — 2026-04-01

### Added
- **Win handling** — win overlay with XP rewards (+50 win / +10 loss for AI and online, +20 for local PvP)
- **Refs pattern** — `gameStateRef`, `viewRef`, `showWinRef` to prevent stale closure bugs in async effects
- **Presence delay** — 3-second grace period before declaring opponent-disconnect win (handles React Strict Mode remounts and brief network drops)
- **Rules view** — in-game rules page accessible from menu
- SEO metadata and Open Graph tags

---

## [0.1.0] — 2026-04-01

### Added
- Initial project setup with Vite + React 19 + TypeScript + Tailwind CSS 4
- Core Quoridor game logic (`logic.ts`): BFS pathfinding, wall validation, valid move generation
- Minimax AI with alpha-beta pruning
- `QuoridorBoard` component — 17×17 grid, wall hover/placement, pawn animations
- `ThreeBackground` — Three.js 3D board with procedural wood texture and floating walls
- Online multiplayer via Supabase Realtime (PostgreSQL change tracking + Presence)
- Anonymous authentication with device fingerprinting for returning players
- XP / level / win-loss tracking with Supabase DB; localStorage fallback
- Leaderboard (top 10 by XP)
- `LegalDocs` — ÁSZF and Privacy Policy components
