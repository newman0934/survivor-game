# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

A Vampire-Survivors-style web game (survivor-like / bullet-heaven). The player moves to dodge
swarming enemies; the weapon auto-fires at the nearest enemy; killing enemies drops XP gems;
collecting XP levels up and offers a 3-choice upgrade; survive as long as possible.

Currently **phase 0 + 1** (engine foundation + complete core loop). See `progress.md` for status
and the roadmap; design/plan docs live in `../docs/superpowers/specs/` and `../docs/superpowers/plans/`.

## Architecture — the one rule that matters

**The engine is pure TypeScript and must NOT import Vue or Pinia at runtime.**

```
Vue (DOM UI)  ──reads summary / sends upgrade pick──►  Pinia store  ◄──pushes summary──  Engine (pure TS)
src/ui/*, App.vue                                      src/stores/game.ts                src/engine/**
```

- `src/engine/**` runs the game: a fixed-timestep loop over an ECS-style `World` (plain-data
  entities + stateless system functions), rendered with PixiJS. It never touches Vue reactivity —
  that would tank performance with hundreds of entities.
- The **only** allowed engine→store reference is `import type { Summary }` (type-only, erased at
  compile time) in `World.ts`. No runtime Vue/Pinia imports in `engine/`.
- The engine pushes a small **summary** (hp, time, level, kills, xp…) to the store only at moments
  the UI cares about; Vue renders HUD/menu/modal from that.
- Upgrade handshake: on level-up the loop pauses, calls `store.offerUpgrades(...)` and sets
  `store.onUpgradePicked`; the modal calls `store.pickUpgrade(id)`, which invokes that callback
  (→ `world.applyUpgrade`) and resumes.

## File map

```
src/
├─ main.ts                 # Vue entry
├─ App.vue                 # state machine: menu / playing / upgrading / over; mounts the engine
├─ stores/game.ts          # Pinia bridge — plain summary data + {id,label} upgrade descriptors only
├─ ui/                     # MainMenu, Hud, UpgradeModal, GameOver  (presentational)
└─ engine/                 # PURE TS — no Vue/Pinia runtime
   ├─ types.ts             # Entity, PlayerStats, UpgradeOption
   ├─ core/                # vector, rng (seeded mulberry32), objectPool, spatialGrid, input
   ├─ systems/             # movement, spawn, combat, collision, pickup, leveling  (stateless fns)
   ├─ entities/factory.ts  # createPlayer/Enemy/Projectile/Gem
   ├─ World.ts             # holds entities, runs systems each step()  ← core simulation
   ├─ PixiRenderer.ts      # entity → PixiJS Graphics + player-follow camera
   └─ Game.ts              # fixed-timestep raf loop; wires World + renderer + input + store
```

## Commands

```bash
npm run dev        # Vite dev server at http://localhost:5173
npm test           # Vitest (engine unit tests)
npm run typecheck  # vue-tsc --noEmit
npm run build      # typecheck + production build
npm run lint       # eslint --fix
```

## Conventions

- **Vue:** Vue 3 Composition API with `<script setup lang="ts">` only. No Options API.
- **TDD for engine logic:** core/ and systems/ and `World` are pure and unit-tested. Write the
  failing test first. Renderer/loop/UI are integration glue — verified by running the app, not
  unit-tested.
- **Keep systems stateless:** a system is a function over entities/data, not a class with state.
  All mutable run state lives in `World`.
- **Determinism:** randomness goes through `core/rng` (seeded). Don't call `Math.random()` in the
  simulation — it breaks reproducibility. The game loop is fixed-timestep (1/60 s) so logic is
  framerate-independent; never tie game logic to raw frame delta.
- **Resource cleanup:** `Game.stop()` and `PixiRenderer.destroy()` are idempotent (guarded) because
  game-over and restart can both call stop — keep them that way.
- **Commit style:** conventional commits (`feat(engine): …`, `test(store): …`), one logical change
  per commit.

## Known tradeoffs (intentional for the prototype)

- `World.step()` uses `Array.filter` to cull dead entities each frame, and array scans for
  collisions. Fine at current counts. `core/objectPool` and `core/spatialGrid` are built + tested
  but not yet wired in — they're staged for phase 2's higher entity counts. Wire them through
  `World` before optimizing anything else if frame rate becomes an issue.
- `Game.ts` calls `useGameStore()` directly, so it must run inside a Pinia context. If the engine
  ever needs isolated unit testing, refactor to inject store-shaped callbacks from `App.vue`.

## Gotchas

- Adding an upgrade: add it to `ALL_UPGRADES` in `src/engine/systems/leveling.ts` (id + label +
  `apply(stats)`). The UI and roll logic pick it up automatically.
- Adding an enemy/weapon/entity type: extend `EntityKind`/factory in `src/engine/entities` and the
  relevant system; add a color in `PixiRenderer`'s `COLORS` map.
- Tuning difficulty/feel: spawn curve in `systems/spawn.ts`, base stats in `entities/factory.ts` and
  `World.stats`, xp curve in `systems/leveling.ts`.
