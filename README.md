# Survivor Game

A Vampire-Survivors-style web game (bullet-heaven / survivor-like) built with Vue 3 + PixiJS.

Move to dodge swarming enemies, your weapon auto-fires at the nearest one, collect XP gems
to level up, pick an upgrade, and survive as long as you can.

## Tech stack

- **Vue 3** (`<script setup>` + TypeScript) — menu / HUD / upgrade modal / game-over UI
- **PixiJS (WebGL)** — game-world rendering
- **Pinia** — bridge between the pure-TS engine and the Vue UI
- **Vite** — dev server & build
- **Vitest** — unit tests for the engine

The game engine under `src/engine/` is pure TypeScript with no Vue/Pinia runtime dependency:
a fixed-timestep loop drives an ECS-style `World` of entities and systems; Vue only renders the
surrounding UI and reads summary state from the store.

## Controls

- **WASD / Arrow keys** — move
- Weapon fires automatically at the nearest enemy

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

## Scripts

```bash
npm test           # run unit tests (Vitest)
npm run typecheck  # vue-tsc type check
npm run build      # production build
npm run lint       # eslint --fix
```

## Project structure

```
src/
├─ main.ts                 # Vue entry
├─ App.vue                 # state-machine root: menu / playing / upgrading / over
├─ stores/game.ts          # Pinia bridge (summary state + upgrade handshake)
├─ ui/                     # MainMenu, Hud, UpgradeModal, GameOver
└─ engine/                 # pure TS — no Vue
   ├─ core/                # vector, rng, objectPool, spatialGrid, input
   ├─ systems/             # movement, spawn, combat, collision, pickup, leveling
   ├─ entities/factory.ts  # player / enemy / projectile / gem
   ├─ World.ts             # simulation: holds entities, runs systems each step
   ├─ PixiRenderer.ts      # entity → PixiJS display + player-follow camera
   └─ Game.ts              # fixed-timestep loop wiring World + renderer + store
```

## Status

This is **phase 0 + 1**: the engine foundation plus a complete, playable core loop
(one weapon, one enemy type, leveling, upgrades, game-over/restart). Later phases add more
weapons/enemies, bosses, multiple characters/maps, and persistence. The `objectPool` and
`spatialGrid` modules are built and tested in preparation for the higher entity counts of
those phases.

Design and implementation plan live in
`../docs/superpowers/specs/` and `../docs/superpowers/plans/`.
