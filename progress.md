# Progress

Survivor Game — build progress and roadmap.

_Last updated: 2026-06-23_

## Status: Phase 0 + 1 complete ✅

Engine foundation + a complete, playable core loop. Verified in-browser end to end
(menu → play → auto-fire → kills → gems → level-up modal → upgrade → resume → game-over → restart)
with **46 unit tests passing, clean type check, clean production build, zero console errors**.

## Done

### Phase 0 — Foundation
- [x] Vue 3 + TypeScript + Vite + Pinia + PixiJS project scaffold
- [x] Pure-TS engine boundary (no Vue/Pinia runtime in `engine/`)
- [x] Fixed-timestep game loop (1/60 s accumulator) — framerate-independent
- [x] ECS-style `World` (plain-data entities + stateless system functions)
- [x] PixiJS renderer with player-follow camera
- [x] Pinia bridge store (summary state + upgrade handshake)
- [x] Core utilities: seeded RNG, 2D vector math, object pool, spatial grid, keyboard input
  - _object pool & spatial grid are built + tested but not yet wired into `World` — staged for phase 2_

### Phase 1 — Core loop
- [x] Player movement (WASD / arrows) + camera follow
- [x] One auto-firing weapon (targets nearest enemy)
- [x] One enemy type — spawns from screen edges, chases the player
- [x] Difficulty curve (spawn rate ramps over time)
- [x] XP gems drop on kill, auto-attract + collect
- [x] Level-up → pause → 3-choice upgrade card → apply → resume
- [x] Contact damage → game over → results (survival time / kills / level) → restart
- [x] Main menu, HUD (level / timer / kills / HP & XP bars), upgrade modal, game-over screen

### Hardening / fixes
- [x] Fixed flaky projectile-kill test (gem was being collected mid-loop)
- [x] Fixed double-destroy crash on restart (`Game.stop` / `PixiRenderer.destroy` now idempotent)
- [x] Level-up flag is a counter (multiple level-ups in one xp grant no longer dropped)
- [x] Upgrade RNG seeded per run (each game offers a varied upgrade sequence)
- [x] README + CLAUDE.md

## Roadmap (not started)

### Phase 2 — Content
- [ ] Multiple weapons (and weapon-specific upgrades)
- [ ] Multiple enemy types
- [ ] Boss enemy
- [ ] Passive items / more upgrade branches
- [ ] Wire `objectPool` + `spatialGrid` into `World` for higher entity counts

### Phase 3 — Variety
- [ ] Multiple playable characters
- [ ] Multiple maps
- [ ] Chests / random rewards

### Phase 4 — Meta
- [ ] Progress save (localStorage)
- [ ] Unlocks
- [ ] Score / leaderboard
- [ ] Audio (SFX + music)
- [ ] Replace placeholder shapes with sprite art

Each phase gets its own spec → plan → implementation cycle.

## Verification snapshot

| Check | Result |
|-------|--------|
| Unit tests (Vitest) | 46 passing |
| Type check (vue-tsc) | clean |
| Production build | clean |
| In-browser smoke test | all phase-1 acceptance criteria pass, 0 console errors |
