# Survivor Game — Foundation + Core Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Vampire-Survivors-style web game: a player auto-attacks, dodges swarming enemies, collects XP, levels up with a 3-choice upgrade, and survives as long as possible — on a foundation that scales to later content phases.

**Architecture:** Vue 3 renders DOM UI (menu, HUD, upgrade modal, game-over). A pure-TypeScript engine (no Vue reactivity) runs a fixed-timestep loop over a lightweight ECS-style World, renders entities via PixiJS, and pushes summary state to a Pinia store that bridges engine ↔ UI.

**Tech Stack:** Vue 3 (`<script setup>` + TypeScript), Vite, Pinia, PixiJS, Vitest, ESLint, Prettier, vue-tsc.

**Working directory:** All paths are relative to a NEW project folder `/Users/caesarwang/project/survivor-game/`. Create and `cd` into it for Task 1; all later paths are relative to it.

**Commits:** The new project gets its own git repo (Task 1). Commit after each task.

---

## File Structure

```
survivor-game/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ vitest.config.ts
├─ .eslintrc.cjs / eslint.config.js
├─ .prettierrc
└─ src/
   ├─ main.ts                     # Vue entry
   ├─ App.vue                     # state-machine root: menu/playing/over
   ├─ stores/game.ts              # Pinia bridge (summary state + events)
   ├─ ui/
   │  ├─ MainMenu.vue
   │  ├─ Hud.vue
   │  ├─ UpgradeModal.vue
   │  └─ GameOver.vue
   └─ engine/
      ├─ types.ts                 # shared entity/config types
      ├─ core/
      │  ├─ vector.ts             # 2D vector math (pure)
      │  ├─ spatialGrid.ts        # neighbor queries (pure)
      │  ├─ objectPool.ts         # generic pool (pure)
      │  ├─ rng.ts                # seedable RNG (pure)
      │  └─ input.ts              # keyboard state
      ├─ entities/factory.ts      # create player/enemy/projectile/gem
      ├─ systems/
      │  ├─ movement.ts           # apply velocity, player input
      │  ├─ spawn.ts              # spawn enemies, difficulty curve
      │  ├─ combat.ts             # auto-fire at nearest enemy, projectile hits
      │  ├─ collision.ts          # enemy↔player contact damage
      │  ├─ pickup.ts             # gem attraction + collection
      │  └─ leveling.ts           # xp→level, roll upgrade choices, apply
      ├─ World.ts                 # holds entities, runs systems per step
      ├─ PixiRenderer.ts          # sync entities → Pixi display + camera
      └─ Game.ts                  # GameLoop (fixed timestep) + wires World+Renderer+store
```

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`, `.gitignore`, `.prettierrc`, `eslint.config.js`

- [ ] **Step 1: Create the project directory and init git**

```bash
mkdir -p /Users/caesarwang/project/survivor-game
cd /Users/caesarwang/project/survivor-game
git init
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "survivor-game",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "vue-tsc --noEmit",
    "lint": "eslint . --fix"
  },
  "dependencies": {
    "pinia": "^2.2.0",
    "pixi.js": "^8.6.0",
    "vue": "^3.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.0",
    "eslint": "^9.0.0",
    "eslint-plugin-vue": "^9.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "vue-tsc": "^2.1.0"
  }
}
```

- [ ] **Step 3: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUnusedLocals": true,
    "jsx": "preserve",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

`.gitignore`:
```
node_modules
dist
*.local
.DS_Store
```

`.prettierrc`:
```json
{ "semi": false, "singleQuote": true, "printWidth": 100 }
```

`eslint.config.js`:
```js
import vue from 'eslint-plugin-vue'

export default [
  ...vue.configs['flat/essential'],
  { ignores: ['dist', 'node_modules'] },
]
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Survivor Game</title>
    <style>
      html, body, #app { margin: 0; height: 100%; overflow: hidden; background: #111; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create minimal `src/main.ts` and `src/App.vue`**

`src/main.ts`:
```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
```

`src/App.vue`:
```vue
<script setup lang="ts">
</script>

<template>
  <div style="color: white; font-family: sans-serif; padding: 1rem">
    Survivor Game — scaffold OK
  </div>
</template>
```

- [ ] **Step 6: Install and verify dev server boots**

Run: `npm install && npm run dev`
Expected: Vite serves at `http://localhost:5173`; page shows "Survivor Game — scaffold OK". Stop the server (Ctrl+C).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vue 3 + Vite + TS + Pinia + PixiJS project"
```

---

## Task 2: Vector math (`core/vector.ts`)

**Files:**
- Create: `src/engine/core/vector.ts`
- Test: `src/engine/core/vector.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { add, sub, scale, length, normalize, distance } from './vector'

describe('vector', () => {
  it('adds and subtracts', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 })
    expect(sub({ x: 3, y: 4 }, { x: 1, y: 2 })).toEqual({ x: 2, y: 2 })
  })
  it('scales', () => {
    expect(scale({ x: 2, y: -3 }, 2)).toEqual({ x: 4, y: -6 })
  })
  it('computes length and distance', () => {
    expect(length({ x: 3, y: 4 })).toBe(5)
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('normalizes to unit length, and zero vector stays zero', () => {
    const n = normalize({ x: 0, y: 5 })
    expect(n).toEqual({ x: 0, y: 1 })
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/vector.test.ts`
Expected: FAIL — cannot find module './vector'.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface Vec2 {
  x: number
  y: number
}

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s })
export const length = (a: Vec2): number => Math.hypot(a.x, a.y)
export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y)

export const normalize = (a: Vec2): Vec2 => {
  const len = length(a)
  if (len === 0) return { x: 0, y: 0 }
  return { x: a.x / len, y: a.y / len }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/vector.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/vector.ts src/engine/core/vector.test.ts
git commit -m "feat(engine): add 2D vector math"
```

---

## Task 3: Seedable RNG (`core/rng.ts`)

**Files:**
- Create: `src/engine/core/rng.ts`
- Test: `src/engine/core/rng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { createRng } from './rng'

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })
  it('next() returns values in [0,1)', () => {
    const r = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = r.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
  it('range(min,max) stays within bounds', () => {
    const r = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = r.range(10, 20)
      expect(v).toBeGreaterThanOrEqual(10)
      expect(v).toBeLessThan(20)
    }
  })
  it('pick returns an element of the array', () => {
    const r = createRng(3)
    const arr = ['a', 'b', 'c']
    expect(arr).toContain(r.pick(arr))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/rng.test.ts`
Expected: FAIL — cannot find module './rng'.

- [ ] **Step 3: Write minimal implementation**

```ts
export interface Rng {
  next(): number
  range(min: number, max: number): number
  pick<T>(arr: T[]): T
}

// mulberry32 — small, fast, deterministic
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  const next = (): number => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/rng.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/rng.ts src/engine/core/rng.test.ts
git commit -m "feat(engine): add seedable RNG"
```

---

## Task 4: Object pool (`core/objectPool.ts`)

**Files:**
- Create: `src/engine/core/objectPool.ts`
- Test: `src/engine/core/objectPool.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { ObjectPool } from './objectPool'

describe('ObjectPool', () => {
  it('creates new objects when empty', () => {
    let created = 0
    const pool = new ObjectPool(() => ({ id: created++ }))
    const a = pool.acquire()
    const b = pool.acquire()
    expect(a.id).toBe(0)
    expect(b.id).toBe(1)
  })
  it('reuses released objects instead of creating new ones', () => {
    let created = 0
    const pool = new ObjectPool(() => ({ id: created++ }))
    const a = pool.acquire()
    pool.release(a)
    const b = pool.acquire()
    expect(b).toBe(a)
    expect(created).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/objectPool.test.ts`
Expected: FAIL — cannot find module './objectPool'.

- [ ] **Step 3: Write minimal implementation**

```ts
export class ObjectPool<T> {
  private free: T[] = []
  constructor(private readonly factory: () => T) {}

  acquire(): T {
    return this.free.pop() ?? this.factory()
  }

  release(obj: T): void {
    this.free.push(obj)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/objectPool.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/objectPool.ts src/engine/core/objectPool.test.ts
git commit -m "feat(engine): add generic object pool"
```

---

## Task 5: Spatial grid (`core/spatialGrid.ts`)

**Files:**
- Create: `src/engine/core/spatialGrid.ts`
- Test: `src/engine/core/spatialGrid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SpatialGrid } from './spatialGrid'

describe('SpatialGrid', () => {
  it('returns items near a position within radius', () => {
    const grid = new SpatialGrid<{ x: number; y: number }>(50)
    const near = { x: 10, y: 10 }
    const far = { x: 1000, y: 1000 }
    grid.insert(near, near.x, near.y)
    grid.insert(far, far.x, far.y)
    const found = grid.queryRadius(0, 0, 100)
    expect(found).toContain(near)
    expect(found).not.toContain(far)
  })
  it('clear empties the grid', () => {
    const grid = new SpatialGrid<{ x: number; y: number }>(50)
    const p = { x: 5, y: 5 }
    grid.insert(p, p.x, p.y)
    grid.clear()
    expect(grid.queryRadius(0, 0, 100)).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/core/spatialGrid.test.ts`
Expected: FAIL — cannot find module './spatialGrid'.

- [ ] **Step 3: Write minimal implementation**

```ts
export class SpatialGrid<T> {
  private cells = new Map<string, T[]>()
  constructor(private readonly cellSize: number) {}

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  insert(item: T, x: number, y: number): void {
    const cx = Math.floor(x / this.cellSize)
    const cy = Math.floor(y / this.cellSize)
    const k = this.key(cx, cy)
    const bucket = this.cells.get(k)
    if (bucket) bucket.push(item)
    else this.cells.set(k, [item])
  }

  queryRadius(x: number, y: number, radius: number): T[] {
    const minCx = Math.floor((x - radius) / this.cellSize)
    const maxCx = Math.floor((x + radius) / this.cellSize)
    const minCy = Math.floor((y - radius) / this.cellSize)
    const maxCy = Math.floor((y + radius) / this.cellSize)
    const result: T[] = []
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.cells.get(this.key(cx, cy))
        if (bucket) result.push(...bucket)
      }
    }
    return result
  }

  clear(): void {
    this.cells.clear()
  }
}
```

Note: `queryRadius` returns items in neighboring cells (a coarse filter). Callers needing exact distance must still check with `distance()`. The test's `far` point sits in a distant cell so it is correctly excluded.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/core/spatialGrid.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/core/spatialGrid.ts src/engine/core/spatialGrid.test.ts
git commit -m "feat(engine): add spatial grid for neighbor queries"
```

---

## Task 6: Shared types + entity factory

**Files:**
- Create: `src/engine/types.ts`, `src/engine/entities/factory.ts`
- Test: `src/engine/entities/factory.test.ts`

- [ ] **Step 1: Write `src/engine/types.ts`** (no test — pure type declarations)

```ts
import type { Vec2 } from './core/vector'

export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem'

export interface Entity {
  kind: EntityKind
  active: boolean
  pos: Vec2
  vel: Vec2
  radius: number
  hp: number
  maxHp: number
  speed: number
  // projectile/enemy damage dealt on contact/hit
  damage: number
  // projectile lifetime in seconds (counts down); ignored for others
  life: number
  // gem xp value; ignored for others
  xp: number
}

export interface PlayerStats {
  moveSpeed: number
  fireCooldown: number // seconds between shots
  projectileDamage: number
  projectileSpeed: number
  pickupRadius: number
}

export interface UpgradeOption {
  id: string
  label: string
  apply: (stats: PlayerStats) => void
}
```

- [ ] **Step 2: Write the failing test for the factory**

```ts
import { describe, it, expect } from 'vitest'
import { createPlayer, createEnemy, createProjectile, createGem } from './factory'

describe('entity factory', () => {
  it('creates an active player at a position', () => {
    const p = createPlayer({ x: 100, y: 100 })
    expect(p.kind).toBe('player')
    expect(p.active).toBe(true)
    expect(p.pos).toEqual({ x: 100, y: 100 })
    expect(p.hp).toBeGreaterThan(0)
  })
  it('creates an enemy with hp and speed', () => {
    const e = createEnemy({ x: 0, y: 0 })
    expect(e.kind).toBe('enemy')
    expect(e.hp).toBeGreaterThan(0)
    expect(e.speed).toBeGreaterThan(0)
  })
  it('creates a projectile with velocity, damage and finite life', () => {
    const pr = createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, 200, 5)
    expect(pr.kind).toBe('projectile')
    expect(pr.vel).toEqual({ x: 200, y: 0 })
    expect(pr.damage).toBe(5)
    expect(pr.life).toBeGreaterThan(0)
  })
  it('creates a gem carrying xp', () => {
    const g = createGem({ x: 0, y: 0 }, 3)
    expect(g.kind).toBe('gem')
    expect(g.xp).toBe(3)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/engine/entities/factory.test.ts`
Expected: FAIL — cannot find module './factory'.

- [ ] **Step 4: Write minimal implementation**

```ts
import type { Vec2 } from '../core/vector'
import type { Entity } from '../types'

const base = (): Entity => ({
  kind: 'enemy',
  active: true,
  pos: { x: 0, y: 0 },
  vel: { x: 0, y: 0 },
  radius: 10,
  hp: 1,
  maxHp: 1,
  speed: 0,
  damage: 0,
  life: 0,
  xp: 0,
})

export function createPlayer(pos: Vec2): Entity {
  return { ...base(), kind: 'player', pos: { ...pos }, radius: 14, hp: 100, maxHp: 100, speed: 200 }
}

export function createEnemy(pos: Vec2): Entity {
  return { ...base(), kind: 'enemy', pos: { ...pos }, radius: 12, hp: 10, maxHp: 10, speed: 60, damage: 5, xp: 1 }
}

export function createProjectile(pos: Vec2, dir: Vec2, speed: number, damage: number): Entity {
  return {
    ...base(),
    kind: 'projectile',
    pos: { ...pos },
    vel: { x: dir.x * speed, y: dir.y * speed },
    radius: 5,
    hp: 1,
    maxHp: 1,
    damage,
    life: 1.5,
  }
}

export function createGem(pos: Vec2, xp: number): Entity {
  return { ...base(), kind: 'gem', pos: { ...pos }, radius: 6, xp }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/engine/entities/factory.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/engine/types.ts src/engine/entities/factory.ts src/engine/entities/factory.test.ts
git commit -m "feat(engine): add shared types and entity factory"
```

---

## Task 7: Movement system (`systems/movement.ts`)

**Files:**
- Create: `src/engine/systems/movement.ts`
- Test: `src/engine/systems/movement.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { applyVelocity, steerTowards } from './movement'
import { createEnemy } from '../entities/factory'

describe('movement', () => {
  it('applyVelocity advances position by vel * dt', () => {
    const e = createEnemy({ x: 0, y: 0 })
    e.vel = { x: 10, y: 20 }
    applyVelocity(e, 0.5)
    expect(e.pos).toEqual({ x: 5, y: 10 })
  })
  it('steerTowards sets velocity pointing at target at entity speed', () => {
    const e = createEnemy({ x: 0, y: 0 })
    e.speed = 100
    steerTowards(e, { x: 0, y: 50 })
    expect(e.vel).toEqual({ x: 0, y: 100 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/movement.test.ts`
Expected: FAIL — cannot find module './movement'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { normalize, sub, scale } from '../core/vector'

export function applyVelocity(e: Entity, dt: number): void {
  e.pos.x += e.vel.x * dt
  e.pos.y += e.vel.y * dt
}

export function steerTowards(e: Entity, target: Vec2): void {
  const dir = normalize(sub(target, e.pos))
  e.vel = scale(dir, e.speed)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/movement.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/movement.ts src/engine/systems/movement.test.ts
git commit -m "feat(engine): add movement system"
```

---

## Task 8: Spawn system + difficulty curve (`systems/spawn.ts`)

**Files:**
- Create: `src/engine/systems/spawn.ts`
- Test: `src/engine/systems/spawn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { spawnInterval, spawnPositionAround } from './spawn'

describe('spawn', () => {
  it('spawn interval shrinks as elapsed time grows (harder over time)', () => {
    const early = spawnInterval(0)
    const late = spawnInterval(120)
    expect(late).toBeLessThan(early)
  })
  it('spawn interval never drops below a floor', () => {
    expect(spawnInterval(100000)).toBeGreaterThanOrEqual(0.2)
  })
  it('spawnPositionAround returns a point at the given distance from center', () => {
    const center = { x: 100, y: 100 }
    const p = spawnPositionAround(center, 300, 0.5)
    const dist = Math.hypot(p.x - center.x, p.y - center.y)
    expect(dist).toBeCloseTo(300, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/spawn.test.ts`
Expected: FAIL — cannot find module './spawn'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Vec2 } from '../core/vector'

// Seconds between spawns. Starts at 1.2s, decays toward a 0.2s floor.
export function spawnInterval(elapsedSeconds: number): number {
  const floor = 0.2
  const start = 1.2
  const decayed = start * Math.exp(-elapsedSeconds / 90)
  return Math.max(floor, decayed)
}

// t in [0,1) maps to an angle around the circle; returns a point `radius` away.
export function spawnPositionAround(center: Vec2, radius: number, t: number): Vec2 {
  const angle = t * Math.PI * 2
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/spawn.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/spawn.ts src/engine/systems/spawn.test.ts
git commit -m "feat(engine): add spawn system with difficulty curve"
```

---

## Task 9: Combat targeting (`systems/combat.ts`)

**Files:**
- Create: `src/engine/systems/combat.ts`
- Test: `src/engine/systems/combat.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { findNearest } from './combat'
import { createPlayer, createEnemy } from '../entities/factory'

describe('combat targeting', () => {
  it('finds the nearest active enemy', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(near)
  })
  it('ignores inactive enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const near = createEnemy({ x: 10, y: 0 })
    near.active = false
    const far = createEnemy({ x: 500, y: 0 })
    expect(findNearest(player.pos, [near, far])).toBe(far)
  })
  it('returns null when there are no active enemies', () => {
    const player = createPlayer({ x: 0, y: 0 })
    expect(findNearest(player.pos, [])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/combat.test.ts`
Expected: FAIL — cannot find module './combat'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance } from '../core/vector'

export function findNearest(from: Vec2, enemies: Entity[]): Entity | null {
  let best: Entity | null = null
  let bestDist = Infinity
  for (const e of enemies) {
    if (!e.active) continue
    const d = distance(from, e.pos)
    if (d < bestDist) {
      bestDist = d
      best = e
    }
  }
  return best
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/combat.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/combat.ts src/engine/systems/combat.test.ts
git commit -m "feat(engine): add nearest-enemy targeting"
```

---

## Task 10: Collision helper (`systems/collision.ts`)

**Files:**
- Create: `src/engine/systems/collision.ts`
- Test: `src/engine/systems/collision.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { circlesOverlap } from './collision'
import { createPlayer, createEnemy } from '../entities/factory'

describe('collision', () => {
  it('detects overlap when circles intersect', () => {
    const a = createPlayer({ x: 0, y: 0 }) // radius 14
    const b = createEnemy({ x: 20, y: 0 }) // radius 12 -> sum 26 > 20
    expect(circlesOverlap(a, b)).toBe(true)
  })
  it('reports no overlap when circles are apart', () => {
    const a = createPlayer({ x: 0, y: 0 })
    const b = createEnemy({ x: 200, y: 0 })
    expect(circlesOverlap(a, b)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/collision.test.ts`
Expected: FAIL — cannot find module './collision'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Entity } from '../types'
import { distance } from '../core/vector'

export function circlesOverlap(a: Entity, b: Entity): boolean {
  return distance(a.pos, b.pos) <= a.radius + b.radius
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/collision.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/collision.ts src/engine/systems/collision.test.ts
git commit -m "feat(engine): add circle overlap collision helper"
```

---

## Task 11: Pickup attraction (`systems/pickup.ts`)

**Files:**
- Create: `src/engine/systems/pickup.ts`
- Test: `src/engine/systems/pickup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { attractGem } from './pickup'
import { createPlayer, createGem } from '../entities/factory'

describe('pickup', () => {
  it('pulls a gem toward the player when within pickup radius', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const gem = createGem({ x: 50, y: 0 }, 1)
    attractGem(gem, player.pos, 100, 300) // pickupRadius 100, pull speed 300
    expect(gem.vel.x).toBeLessThan(0) // moving toward player (negative x)
  })
  it('leaves gem stationary when outside pickup radius', () => {
    const player = createPlayer({ x: 0, y: 0 })
    const gem = createGem({ x: 500, y: 0 }, 1)
    attractGem(gem, player.pos, 100, 300)
    expect(gem.vel).toEqual({ x: 0, y: 0 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/pickup.test.ts`
Expected: FAIL — cannot find module './pickup'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { distance, normalize, sub, scale } from '../core/vector'

export function attractGem(gem: Entity, playerPos: Vec2, pickupRadius: number, pullSpeed: number): void {
  if (distance(gem.pos, playerPos) <= pickupRadius) {
    gem.vel = scale(normalize(sub(playerPos, gem.pos)), pullSpeed)
  } else {
    gem.vel = { x: 0, y: 0 }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/pickup.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/pickup.ts src/engine/systems/pickup.test.ts
git commit -m "feat(engine): add gem attraction"
```

---

## Task 12: Leveling + upgrades (`systems/leveling.ts`)

**Files:**
- Create: `src/engine/systems/leveling.ts`
- Test: `src/engine/systems/leveling.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { xpForLevel, rollUpgrades, ALL_UPGRADES } from './leveling'
import { createRng } from '../core/rng'
import type { PlayerStats } from '../types'

describe('leveling', () => {
  it('xp required increases with level', () => {
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })
  it('rollUpgrades returns 3 distinct options', () => {
    const rng = createRng(1)
    const opts = rollUpgrades(rng, 3)
    expect(opts).toHaveLength(3)
    const ids = opts.map((o) => o.id)
    expect(new Set(ids).size).toBe(3)
  })
  it('applying an upgrade mutates player stats', () => {
    const stats: PlayerStats = {
      moveSpeed: 200,
      fireCooldown: 0.5,
      projectileDamage: 5,
      projectileSpeed: 400,
      pickupRadius: 100,
    }
    const dmg = ALL_UPGRADES.find((u) => u.id === 'damage')!
    dmg.apply(stats)
    expect(stats.projectileDamage).toBeGreaterThan(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/systems/leveling.test.ts`
Expected: FAIL — cannot find module './leveling'.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { PlayerStats, UpgradeOption } from '../types'
import type { Rng } from '../core/rng'

// Total xp needed to go from (level-1) to level.
export function xpForLevel(level: number): number {
  return 5 + (level - 1) * 5
}

export const ALL_UPGRADES: UpgradeOption[] = [
  { id: 'damage', label: '傷害 +3', apply: (s) => { s.projectileDamage += 3 } },
  { id: 'firerate', label: '攻速 +15%', apply: (s) => { s.fireCooldown *= 0.85 } },
  { id: 'movespeed', label: '移速 +12%', apply: (s) => { s.moveSpeed *= 1.12 } },
  { id: 'projspeed', label: '彈速 +20%', apply: (s) => { s.projectileSpeed *= 1.2 } },
  { id: 'pickup', label: '吸取範圍 +25%', apply: (s) => { s.pickupRadius *= 1.25 } },
]

export function rollUpgrades(rng: Rng, count: number): UpgradeOption[] {
  const pool = [...ALL_UPGRADES]
  const chosen: UpgradeOption[] = []
  while (chosen.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length)
    chosen.push(pool.splice(i, 1)[0])
  }
  return chosen
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/systems/leveling.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/leveling.ts src/engine/systems/leveling.test.ts
git commit -m "feat(engine): add leveling and upgrade options"
```

---

## Task 13: Pinia bridge store (`stores/game.ts`)

**Files:**
- Create: `src/stores/game.ts`
- Test: `src/stores/game.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from './game'

describe('game store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('starts on the menu', () => {
    const s = useGameStore()
    expect(s.phase).toBe('menu')
  })
  it('start() moves to playing and resets summary', () => {
    const s = useGameStore()
    s.start()
    expect(s.phase).toBe('playing')
    expect(s.kills).toBe(0)
    expect(s.level).toBe(1)
  })
  it('offerUpgrades() pauses and stores options', () => {
    const s = useGameStore()
    s.start()
    s.offerUpgrades([{ id: 'damage', label: '傷害 +3' }])
    expect(s.phase).toBe('upgrading')
    expect(s.upgradeOptions).toHaveLength(1)
  })
  it('gameOver() records final summary', () => {
    const s = useGameStore()
    s.start()
    s.updateSummary({ hp: 0, maxHp: 100, time: 42, level: 3, kills: 99, xp: 0, xpNeeded: 10 })
    s.gameOver()
    expect(s.phase).toBe('over')
    expect(s.time).toBe(42)
    expect(s.kills).toBe(99)
  })
})
```

Note: the store carries only **plain summary data** and UI-facing upgrade descriptors (`{ id, label }`) — never the engine `UpgradeOption.apply` function (that stays in the engine). The store's job is the Vue ↔ engine handshake, not game logic.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stores/game.test.ts`
Expected: FAIL — cannot find module './game'.

- [ ] **Step 3: Write minimal implementation**

```ts
import { defineStore } from 'pinia'

export type Phase = 'menu' | 'playing' | 'upgrading' | 'over'

export interface Summary {
  hp: number
  maxHp: number
  time: number
  level: number
  kills: number
  xp: number
  xpNeeded: number
}

export interface UpgradeDescriptor {
  id: string
  label: string
}

interface State extends Summary {
  phase: Phase
  upgradeOptions: UpgradeDescriptor[]
  // set by the engine; called by UI when the player picks an upgrade
  onUpgradePicked: ((id: string) => void) | null
}

export const useGameStore = defineStore('game', {
  state: (): State => ({
    phase: 'menu',
    hp: 0,
    maxHp: 0,
    time: 0,
    level: 1,
    kills: 0,
    xp: 0,
    xpNeeded: 0,
    upgradeOptions: [],
    onUpgradePicked: null,
  }),
  actions: {
    start() {
      this.phase = 'playing'
      this.hp = 0
      this.maxHp = 0
      this.time = 0
      this.level = 1
      this.kills = 0
      this.xp = 0
      this.xpNeeded = 0
      this.upgradeOptions = []
    },
    updateSummary(s: Summary) {
      this.hp = s.hp
      this.maxHp = s.maxHp
      this.time = s.time
      this.level = s.level
      this.kills = s.kills
      this.xp = s.xp
      this.xpNeeded = s.xpNeeded
    },
    offerUpgrades(options: UpgradeDescriptor[]) {
      this.upgradeOptions = options
      this.phase = 'upgrading'
    },
    pickUpgrade(id: string) {
      this.onUpgradePicked?.(id)
      this.upgradeOptions = []
      this.phase = 'playing'
    },
    gameOver() {
      this.phase = 'over'
    },
    toMenu() {
      this.phase = 'menu'
    },
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stores/game.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stores/game.ts src/stores/game.test.ts
git commit -m "feat(store): add Pinia bridge between engine and UI"
```

---

## Task 14: World (entity container + systems orchestration)

**Files:**
- Create: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

This is the heart of the simulation. It holds entities, steps systems in order, and exposes a summary. No PixiJS, no Vue — pure logic, so it is fully unit-testable.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { World } from './World'

describe('World', () => {
  it('starts with one player and no enemies', () => {
    const w = new World(1)
    expect(w.player.kind).toBe('player')
    expect(w.activeEnemies().length).toBe(0)
  })

  it('spawns enemies over time', () => {
    const w = new World(1)
    // step 3 seconds in 1/60 increments
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    expect(w.activeEnemies().length).toBeGreaterThan(0)
  })

  it('player takes damage when an enemy is in contact', () => {
    const w = new World(1)
    const startHp = w.player.hp
    const e = w.spawnEnemyAt({ x: w.player.pos.x, y: w.player.pos.y })
    w.step(1 / 60)
    expect(w.player.hp).toBeLessThan(startHp)
    expect(e).toBeDefined()
  })

  it('a projectile kills an enemy and drops a gem', () => {
    const w = new World(1)
    const e = w.spawnEnemyAt({ x: w.player.pos.x + 30, y: w.player.pos.y })
    e.hp = 1
    // force a shot this step by zeroing the fire timer
    w.forceFire()
    // advance enough for the projectile to reach the enemy
    for (let i = 0; i < 20; i++) w.step(1 / 60)
    expect(e.active).toBe(false)
    expect(w.gems().length).toBeGreaterThan(0)
  })

  it('collecting enough xp raises the pending level-up flag', () => {
    const w = new World(1)
    w.grantXp(w.summary().xpNeeded)
    expect(w.consumeLevelUp()).toBe(true)
    expect(w.consumeLevelUp()).toBe(false) // consumed once
  })

  it('applyUpgrade mutates player stats', () => {
    const w = new World(1)
    const before = w.stats.projectileDamage
    w.applyUpgrade('damage')
    expect(w.stats.projectileDamage).toBeGreaterThan(before)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/engine/World.test.ts`
Expected: FAIL — cannot find module './World'.

- [ ] **Step 3: Write the implementation**

```ts
import type { Entity, PlayerStats } from './types'
import type { Vec2 } from './core/vector'
import { distance } from './core/vector'
import { createRng, type Rng } from './core/rng'
import { createPlayer, createEnemy, createProjectile, createGem } from './entities/factory'
import { applyVelocity, steerTowards } from './systems/movement'
import { spawnInterval, spawnPositionAround } from './systems/spawn'
import { findNearest } from './systems/combat'
import { circlesOverlap } from './systems/collision'
import { attractGem } from './systems/pickup'
import { xpForLevel, ALL_UPGRADES } from './systems/leveling'
import type { Summary } from '../stores/game'

const SPAWN_RADIUS = 700
const GEM_PULL_SPEED = 350

export class World {
  player: Entity
  enemies: Entity[] = []
  projectiles: Entity[] = []
  gemEntities: Entity[] = []

  stats: PlayerStats = {
    moveSpeed: 200,
    fireCooldown: 0.5,
    projectileDamage: 5,
    projectileSpeed: 400,
    pickupRadius: 120,
  }

  // input direction, set externally each frame; normalized or zero
  moveInput: Vec2 = { x: 0, y: 0 }

  private rng: Rng
  private elapsed = 0
  private spawnTimer = 0
  private fireTimer = 0
  private level = 1
  private xp = 0
  private kills = 0
  private pendingLevelUp = false

  constructor(seed: number) {
    this.rng = createRng(seed)
    this.player = createPlayer({ x: 0, y: 0 })
  }

  activeEnemies(): Entity[] {
    return this.enemies.filter((e) => e.active)
  }
  gems(): Entity[] {
    return this.gemEntities.filter((g) => g.active)
  }

  spawnEnemyAt(pos: Vec2): Entity {
    const e = createEnemy(pos)
    this.enemies.push(e)
    return e
  }

  forceFire(): void {
    this.fireTimer = 0
  }

  grantXp(amount: number): void {
    this.xp += amount
    while (this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level)
      this.level += 1
      this.pendingLevelUp = true
    }
  }

  consumeLevelUp(): boolean {
    if (this.pendingLevelUp) {
      this.pendingLevelUp = false
      return true
    }
    return false
  }

  applyUpgrade(id: string): void {
    const up = ALL_UPGRADES.find((u) => u.id === id)
    up?.apply(this.stats)
  }

  step(dt: number): void {
    this.elapsed += dt

    // --- player movement ---
    this.player.vel = { x: this.moveInput.x * this.stats.moveSpeed, y: this.moveInput.y * this.stats.moveSpeed }
    applyVelocity(this.player, dt)

    // --- spawning ---
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed)
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnEnemyAt(pos)
    }

    // --- enemy steering + movement ---
    for (const e of this.enemies) {
      if (!e.active) continue
      steerTowards(e, this.player.pos)
      applyVelocity(e, dt)
    }

    // --- auto fire ---
    this.fireTimer -= dt
    if (this.fireTimer <= 0) {
      const target = findNearest(this.player.pos, this.enemies)
      if (target) {
        this.fireTimer = this.stats.fireCooldown
        const dir = {
          x: target.pos.x - this.player.pos.x,
          y: target.pos.y - this.player.pos.y,
        }
        const len = Math.hypot(dir.x, dir.y) || 1
        const proj = createProjectile(
          this.player.pos,
          { x: dir.x / len, y: dir.y / len },
          this.stats.projectileSpeed,
          this.stats.projectileDamage,
        )
        this.projectiles.push(proj)
      }
    }

    // --- projectiles move + hit enemies ---
    for (const p of this.projectiles) {
      if (!p.active) continue
      applyVelocity(p, dt)
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      for (const e of this.enemies) {
        if (!e.active) continue
        if (circlesOverlap(p, e)) {
          e.hp -= p.damage
          p.active = false
          if (e.hp <= 0) {
            e.active = false
            this.kills += 1
            const gem = createGem(e.pos, e.xp)
            this.gemEntities.push(gem)
          }
          break
        }
      }
    }

    // --- gems attract + collect ---
    for (const g of this.gemEntities) {
      if (!g.active) continue
      attractGem(g, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(g, dt)
      if (distance(g.pos, this.player.pos) <= this.player.radius) {
        g.active = false
        this.grantXp(g.xp)
      }
    }

    // --- enemy contact damage to player ---
    for (const e of this.enemies) {
      if (!e.active) continue
      if (circlesOverlap(e, this.player)) {
        this.player.hp -= e.damage * dt * 10 // damage-per-second scaled
      }
    }

    // --- cull inactive (keep arrays from growing unbounded) ---
    this.enemies = this.enemies.filter((e) => e.active)
    this.projectiles = this.projectiles.filter((p) => p.active)
    this.gemEntities = this.gemEntities.filter((g) => g.active)
  }

  isPlayerDead(): boolean {
    return this.player.hp <= 0
  }

  summary(): Summary {
    return {
      hp: Math.max(0, Math.round(this.player.hp)),
      maxHp: this.player.maxHp,
      time: Math.floor(this.elapsed),
      level: this.level,
      kills: this.kills,
      xp: this.xp,
      xpNeeded: xpForLevel(this.level),
    }
  }
}
```

Note on the contact-damage test (Task 14 Step 1, test 3): the enemy is spawned exactly on the player, so `circlesOverlap` is true on the first `step`, draining HP. The `damage * dt * 10` formula yields a small but nonzero loss in one 1/60 step — enough for `toBeLessThan`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/engine/World.test.ts`
Expected: PASS (6 tests). If the projectile-kill test is flaky on timing, increase the loop iteration count — the projectile at speed 400 covers 30px in well under 20 steps.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: all tests across all modules PASS.

- [ ] **Step 6: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "feat(engine): add World simulation orchestrating all systems"
```

---

## Task 15: PixiRenderer (entity → display sync + camera)

**Files:**
- Create: `src/engine/PixiRenderer.ts`

No unit test (touches WebGL/canvas — verified manually at the end). Renders each entity as a colored shape and centers the camera on the player.

- [ ] **Step 1: Write the implementation**

```ts
import { Application, Container, Graphics } from 'pixi.js'
import type { World } from './World'
import type { Entity } from './types'

const COLORS: Record<Entity['kind'], number> = {
  player: 0x4aa3ff,
  enemy: 0xff5252,
  projectile: 0xffe27a,
  gem: 0x6bff6b,
}

export class PixiRenderer {
  readonly app: Application
  private world: Container
  private sprites = new Map<Entity, Graphics>()

  private constructor(app: Application) {
    this.app = app
    this.world = new Container()
    app.stage.addChild(this.world)
  }

  static async create(canvasParent: HTMLElement): Promise<PixiRenderer> {
    const app = new Application()
    await app.init({
      resizeTo: canvasParent,
      background: 0x101018,
      antialias: true,
    })
    canvasParent.appendChild(app.canvas)
    return new PixiRenderer(app)
  }

  private graphicFor(e: Entity): Graphics {
    let g = this.sprites.get(e)
    if (!g) {
      g = new Graphics()
      g.circle(0, 0, e.radius).fill(COLORS[e.kind])
      this.world.addChild(g)
      this.sprites.set(e, g)
    }
    return g
  }

  render(world: World): void {
    const all: Entity[] = [
      ...world.gems(),
      ...world.activeEnemies(),
      ...world.projectiles.filter((p) => p.active),
      world.player,
    ]
    const seen = new Set<Entity>()
    for (const e of all) {
      const g = this.graphicFor(e)
      g.position.set(e.pos.x, e.pos.y)
      g.visible = true
      seen.add(e)
    }
    // hide/remove sprites whose entity is gone
    for (const [e, g] of this.sprites) {
      if (!seen.has(e)) {
        g.destroy()
        this.sprites.delete(e)
      }
    }
    // camera: center the player
    this.world.position.set(
      this.app.renderer.width / 2 - world.player.pos.x,
      this.app.renderer.height / 2 - world.player.pos.y,
    )
  }

  destroy(): void {
    this.app.destroy(true, { children: true })
    this.sprites.clear()
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "feat(engine): add PixiJS renderer with player-follow camera"
```

---

## Task 16: Game (fixed-timestep loop + store wiring)

**Files:**
- Create: `src/engine/Game.ts`

Ties World + PixiRenderer + input + Pinia store together. Owns the `requestAnimationFrame` loop with a fixed-timestep accumulator. No unit test (raf/timers); verified manually.

- [ ] **Step 1: Write `src/engine/core/input.ts` first**

```ts
import type { Vec2 } from './vector'

export class KeyboardInput {
  private keys = new Set<string>()
  private onKeyDown = (e: KeyboardEvent) => this.keys.add(e.key.toLowerCase())
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
  }
  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.keys.clear()
  }
  // normalized movement direction from WASD / arrows
  direction(): Vec2 {
    let x = 0
    let y = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1
    const len = Math.hypot(x, y)
    if (len === 0) return { x: 0, y: 0 }
    return { x: x / len, y: y / len }
  }
}
```

- [ ] **Step 2: Write `src/engine/Game.ts`**

```ts
import { World } from './World'
import { PixiRenderer } from './PixiRenderer'
import { KeyboardInput } from './core/input'
import { rollUpgrades } from './systems/leveling'
import { createRng } from './core/rng'
import { useGameStore } from '../stores/game'

const STEP = 1 / 60

export class Game {
  private world: World
  private renderer: PixiRenderer
  private input = new KeyboardInput()
  private store = useGameStore()
  private rafId = 0
  private lastTime = 0
  private accumulator = 0
  private paused = false
  private upgradeRng = createRng(99)

  private constructor(world: World, renderer: PixiRenderer) {
    this.world = world
    this.renderer = renderer
  }

  static async start(canvasParent: HTMLElement, seed: number): Promise<Game> {
    const world = new World(seed)
    const renderer = await PixiRenderer.create(canvasParent)
    const game = new Game(world, renderer)
    game.input.attach()
    game.store.onUpgradePicked = (id: string) => {
      world.applyUpgrade(id)
      game.paused = false
    }
    game.loop(0)
    return game
  }

  pause(): void {
    this.paused = true
  }
  resume(): void {
    this.paused = false
  }

  private loop = (time: number): void => {
    this.rafId = requestAnimationFrame(this.loop)
    if (this.lastTime === 0) this.lastTime = time
    const frameTime = Math.min(0.25, (time - this.lastTime) / 1000)
    this.lastTime = time

    if (!this.paused) {
      this.world.moveInput = this.input.direction()
      this.accumulator += frameTime
      while (this.accumulator >= STEP) {
        this.world.step(STEP)
        this.accumulator -= STEP

        if (this.world.consumeLevelUp()) {
          const opts = rollUpgrades(this.upgradeRng, 3)
          // engine keeps the apply fns; UI only needs id+label
          this.store.offerUpgrades(opts.map((o) => ({ id: o.id, label: o.label })))
          // re-point the handshake to THIS roll's options
          this.store.onUpgradePicked = (id: string) => {
            this.world.applyUpgrade(id)
            this.paused = false
          }
          this.paused = true
          break
        }
        if (this.world.isPlayerDead()) {
          this.store.updateSummary(this.world.summary())
          this.store.gameOver()
          this.stop()
          return
        }
      }
      this.store.updateSummary(this.world.summary())
    }

    this.renderer.render(this.world)
  }

  stop(): void {
    cancelAnimationFrame(this.rafId)
    this.input.detach()
    this.renderer.destroy()
  }
}
```

Note: `applyUpgrade` resolves the id back to the engine's upgrade function via `World.applyUpgrade` → `ALL_UPGRADES`. The `apply` closures never cross into Vue/Pinia, satisfying the spec's "engine logic stays in engine" boundary.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/engine/Game.ts src/engine/core/input.ts
git commit -m "feat(engine): add fixed-timestep game loop and store wiring"
```

---

## Task 17: Vue UI — MainMenu, Hud, UpgradeModal, GameOver

**Files:**
- Create: `src/ui/MainMenu.vue`, `src/ui/Hud.vue`, `src/ui/UpgradeModal.vue`, `src/ui/GameOver.vue`

- [ ] **Step 1: Write `src/ui/MainMenu.vue`**

```vue
<script setup lang="ts">
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="overlay">
    <h1>Survivor</h1>
    <button @click="emit('start')">開始遊戲</button>
    <p class="hint">WASD / 方向鍵移動 · 自動攻擊</p>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  color: #fff; font-family: sans-serif; background: rgba(16, 16, 24, 0.85);
}
h1 { font-size: 4rem; margin: 0; letter-spacing: 0.1em; }
button { font-size: 1.5rem; padding: 0.6rem 2rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff; }
.hint { opacity: 0.7; }
</style>
```

- [ ] **Step 2: Write `src/ui/Hud.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()
const hpPct = computed(() => (store.maxHp ? (store.hp / store.maxHp) * 100 : 0))
const xpPct = computed(() => (store.xpNeeded ? (store.xp / store.xpNeeded) * 100 : 0))
const mmss = computed(() => {
  const m = Math.floor(store.time / 60)
  const s = store.time % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <div class="hud">
    <div class="topbar">
      <span>Lv {{ store.level }}</span>
      <span class="time">{{ mmss }}</span>
      <span>擊殺 {{ store.kills }}</span>
    </div>
    <div class="bar xp"><div class="fill" :style="{ width: xpPct + '%' }" /></div>
    <div class="bar hp"><div class="fill" :style="{ width: hpPct + '%' }" /></div>
  </div>
</template>

<style scoped>
.hud { position: absolute; inset: 0; pointer-events: none; color: #fff;
  font-family: sans-serif; display: flex; flex-direction: column; }
.topbar { display: flex; justify-content: space-between; padding: 0.5rem 1rem;
  font-size: 1.1rem; text-shadow: 0 1px 2px #000; }
.time { font-size: 1.4rem; font-weight: bold; }
.bar { height: 8px; margin: 2px 1rem; background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
.bar.xp { order: 3; margin-top: auto; }
.bar.hp { order: 4; margin-bottom: 0.6rem; height: 12px; }
.xp .fill { background: #6bff6b; height: 100%; border-radius: 4px; }
.hp .fill { background: #ff5252; height: 100%; border-radius: 4px; }
</style>
```

- [ ] **Step 3: Write `src/ui/UpgradeModal.vue`**

```vue
<script setup lang="ts">
import { useGameStore } from '../stores/game'
const store = useGameStore()
</script>

<template>
  <div class="overlay">
    <h2>選擇升級</h2>
    <div class="cards">
      <button v-for="opt in store.upgradeOptions" :key="opt.id" class="card"
        @click="store.pickUpgrade(opt.id)">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1.5rem;
  background: rgba(16, 16, 24, 0.8); color: #fff; font-family: sans-serif; }
.cards { display: flex; gap: 1rem; }
.card { width: 160px; height: 120px; font-size: 1.2rem; cursor: pointer;
  border: 2px solid #4aa3ff; border-radius: 12px; background: #1c2030; color: #fff; }
.card:hover { background: #283050; }
</style>
```

- [ ] **Step 4: Write `src/ui/GameOver.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
const store = useGameStore()
const emit = defineEmits<{ restart: [] }>()
const mmss = computed(() => {
  const m = Math.floor(store.time / 60)
  const s = store.time % 60
  return `${m}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <div class="overlay">
    <h1>你倒下了</h1>
    <p>存活時間 {{ mmss }}</p>
    <p>擊殺 {{ store.kills }} · 等級 {{ store.level }}</p>
    <button @click="emit('restart')">再玩一次</button>
  </div>
</template>

<style scoped>
.overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 1rem;
  background: rgba(16, 16, 24, 0.9); color: #fff; font-family: sans-serif; }
button { font-size: 1.3rem; padding: 0.5rem 1.5rem; cursor: pointer; border: none;
  border-radius: 8px; background: #4aa3ff; color: #fff; }
</style>
```

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: no errors.

```bash
git add src/ui
git commit -m "feat(ui): add menu, HUD, upgrade modal, and game-over screens"
```

---

## Task 18: Wire App.vue (state machine + game mount)

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Replace `src/App.vue` with the full integration**

```vue
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useGameStore } from './stores/game'
import { Game } from './engine/Game'
import MainMenu from './ui/MainMenu.vue'
import Hud from './ui/Hud.vue'
import UpgradeModal from './ui/UpgradeModal.vue'
import GameOver from './ui/GameOver.vue'

const store = useGameStore()
const canvasParent = ref<HTMLDivElement | null>(null)
let game: Game | null = null
let seed = 1

async function startGame() {
  store.start()
  if (!canvasParent.value) return
  game = await Game.start(canvasParent.value, seed++)
}

function restart() {
  game?.stop()
  game = null
  startGame()
}

// pause/resume the loop when the upgrade modal shows/hides
watch(
  () => store.phase,
  (phase) => {
    if (!game) return
    if (phase === 'upgrading') game.pause()
    else if (phase === 'playing') game.resume()
  },
)

onBeforeUnmount(() => game?.stop())
</script>

<template>
  <div class="root">
    <div ref="canvasParent" class="canvas-host" />
    <Hud v-if="store.phase !== 'menu'" />
    <MainMenu v-if="store.phase === 'menu'" @start="startGame" />
    <UpgradeModal v-if="store.phase === 'upgrading'" />
    <GameOver v-if="store.phase === 'over'" @restart="restart" />
  </div>
</template>

<style scoped>
.root, .canvas-host { position: absolute; inset: 0; }
</style>
```

Note: the `Game` loop already calls `store.offerUpgrades` (which sets `phase = 'upgrading'`) and pauses itself inside the loop; this `watch` is a safety net that also covers the resume path after `pickUpgrade` sets `phase` back to `'playing'`.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.vue
git commit -m "feat: wire App state machine to game engine"
```

---

## Task 19: Manual verification (acceptance criteria)

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite + typecheck**

Run: `npm test && npm run typecheck`
Expected: all unit tests PASS, no type errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Open `http://localhost:5173`.

- [ ] **Step 3: Walk the acceptance checklist** (from spec §8). Confirm each:
  1. Main menu shows; clicking 開始遊戲 enters the game.
  2. WASD / arrows move the player smoothly; camera follows.
  3. Enemies spawn from the edges and chase; they increase over time.
  4. The weapon auto-fires at the nearest enemy; hits kill enemies.
  5. Dead enemies drop green gems; walking near auto-collects them.
  6. Filling the XP bar pauses the game and shows a 3-choice upgrade; picking one applies it and resumes.
  7. Enemy contact drains HP; at 0 HP the game-over screen shows survival time, kills, level; 再玩一次 restarts.
  8. With many enemies on screen the game stays smooth (target 60 FPS — check via browser devtools performance if unsure).

- [ ] **Step 4: If any criterion fails**, use the systematic-debugging skill before patching. Otherwise, final commit:

```bash
git add -A
git commit -m "chore: phase 0+1 foundation + core loop complete"
```

---

## Notes for the implementer

- **TDD order matters:** core modules (Tasks 2–12) are pure and tested first; World (Task 14) composes them and is the last heavily-tested unit. Renderer/loop/UI (Tasks 15–18) are integration glue, verified by running the app.
- **The engine never imports Vue.** Only `Game.ts` and `World.ts` import the *store* (for types + the bridge). Keep game logic out of `.vue` files and out of Pinia actions.
- **Performance:** the spatial grid (Task 5) exists for later phases; Task 14's World currently uses simple array scans, which is fine for the prototype's enemy counts. If criterion 8 fails under load, route enemy/projectile collision queries through the spatial grid before optimizing anything else.
