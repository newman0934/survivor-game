# 多種敵人 — 實作計畫

> **給執行者：** 本計畫以 TDD、bite-sized 步驟撰寫，逐 task 執行。引擎純邏輯先寫失敗測試再實作；
> renderer / 迴圈 / UI 為整合膠水層，不寫單元測試（依 CLAUDE.md 慣例），靠實跑驗證。
> 每完成一個邏輯變更就 commit（CLAUDE.md commit 格式）。

**目標：** 引入 4 種敵人（basic / swarm / tank / charger），數值差異為主 + charger 特殊衝刺行為，
依時間解鎖 + 加權隨機登場。

**架構：** 敵人 = 純資料（`Entity` 加 `enemyKind`/`behaviorTimer`）+ 常數定義表（`ENEMY_DEFS`）+
無狀態行為函式（`enemyAI.ts`）+ 加權選種（`spawn.pickEnemyKind`）。`World` 生怪段改為選種建怪、
AI 迴圈改呼叫 `steerEnemy`。

**技術棧：** TypeScript、Vitest、PixiJS。

---

## 檔案結構（建立/修改一覽）

| 檔案 | 責任 | 動作 |
|------|------|------|
| `src/engine/types.ts` | 新增 `EnemyKind`、`EnemyDef`；`Entity` 加 `enemyKind?`/`behaviorTimer?` | 修改 |
| `src/engine/systems/enemyDefs.ts` | `ENEMY_DEFS` + `ENEMY_ORDER` 常數 | 建立 |
| `src/engine/systems/spawn.ts` | 新增 `pickEnemyKind` | 修改 |
| `src/engine/systems/spawn.test.ts` | pickEnemyKind 測試 | 修改 |
| `src/engine/systems/enemyAI.ts` | `steerEnemy`（basic/swarm/tank 直追、charger 狀態機） | 建立 |
| `src/engine/systems/enemyAI.test.ts` | enemyAI 測試 | 建立 |
| `src/engine/entities/factory.ts` | `createEnemy(pos, kind)` 依 ENEMY_DEFS | 修改 |
| `src/engine/entities/factory.test.ts` | createEnemy 種類測試 | 建立 |
| `src/engine/World.ts` | 生怪選種 + swarm 群襲 + AI 改用 steerEnemy | 修改 |
| `src/engine/World.test.ts` | 群襲/選種整合測試 | 修改 |
| `src/engine/PixiRenderer.ts` | 依 enemyKind 取色 | 修改 |
| `progress.md` | 更新進度 | 修改 |

---

## Task 1：型別基礎（types.ts）

**Files:**
- Modify: `src/engine/types.ts`

- [ ] **Step 1：新增 EnemyKind 與 EnemyDef，並擴充 Entity**

在 `EntityKind` 定義之後新增 `EnemyKind`：

```ts
/** 敵人子種類；僅 kind==='enemy' 的 entity 使用，決定數值/顏色/行為。 */
export type EnemyKind = 'basic' | 'swarm' | 'tank' | 'charger'
```

在 `Entity` interface 末尾（`xp` 之後）新增兩個可選欄位：

```ts
  /** 敵人子種類（僅敵人使用）；決定數值/顏色/行為。 */
  enemyKind?: EnemyKind
  /** charger 行為相位時鐘（秒）；其他敵種忽略。 */
  behaviorTimer?: number
```

在檔案末尾新增 `EnemyDef`：

```ts
/**
 * 一種敵人的定義（純資料）。
 * 逐種數值、登場時間與生成權重；charger 另含走/衝參數。調敵人手感從 enemyDefs.ts 下手。
 */
export interface EnemyDef {
  kind: EnemyKind
  /** 生命值。 */
  hp: number
  /** 追擊速度（charger 為走路速）。 */
  speed: number
  /** 接觸傷害。 */
  damage: number
  /** 碰撞半徑。 */
  radius: number
  /** 擊殺掉落的經驗值。 */
  xp: number
  /** 渲染填色。 */
  color: number
  /** 自開局幾秒後才可能生成。 */
  unlockTime: number
  /** 加權隨機的權重。 */
  spawnWeight: number
  /** charger 衝刺速度。 */
  dashSpeed?: number
  /** charger 走路相時長（秒）。 */
  walkTime?: number
  /** charger 衝刺相時長（秒）。 */
  dashTime?: number
}
```

- [ ] **Step 2：型別檢查（會因 factory 等下游未更新而紅，預期）**

Run: `npm run typecheck`
Expected: 可能出現 factory/World 相關錯誤（後續 task 修）；types.ts 本身無誤。先不 commit。

---

## Task 2：敵人定義表（enemyDefs.ts）

**Files:**
- Create: `src/engine/systems/enemyDefs.ts`

- [ ] **Step 1：建立定義表**

```ts
/**
 * 敵人定義表（純資料）。每種敵人的數值、登場時間、生成權重與顏色；charger 另含走/衝參數。
 * 新增敵種或調數值都從這裡下手（見 CLAUDE.md「新增敵人」）。
 */
import type { EnemyDef, EnemyKind } from '../types'

/** 確定性迭代用的固定順序。 */
export const ENEMY_ORDER: EnemyKind[] = ['basic', 'swarm', 'tank', 'charger']

export const ENEMY_DEFS: Record<EnemyKind, EnemyDef> = {
  basic: { kind: 'basic', hp: 10, speed: 60, damage: 5, radius: 12, xp: 1, color: 0xff5252, unlockTime: 0, spawnWeight: 50 },
  swarm: { kind: 'swarm', hp: 4, speed: 110, damage: 3, radius: 8, xp: 1, color: 0xff9d5c, unlockTime: 0, spawnWeight: 35 },
  tank: { kind: 'tank', hp: 60, speed: 35, damage: 12, radius: 20, xp: 5, color: 0x8e2b2b, unlockTime: 45, spawnWeight: 12 },
  charger: {
    kind: 'charger', hp: 18, speed: 45, damage: 10, radius: 13, xp: 4, color: 0xe91e63,
    unlockTime: 90, spawnWeight: 10, dashSpeed: 320, walkTime: 2.5, dashTime: 0.5,
  },
}
```

- [ ] **Step 2：commit**

```bash
git add src/engine/types.ts src/engine/systems/enemyDefs.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增敵人型別與定義表（EnemyKind/EnemyDef/ENEMY_DEFS）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3：factory 依種類建怪（factory.ts）

**Files:**
- Modify: `src/engine/entities/factory.ts`
- Test: `src/engine/entities/factory.test.ts`（新建）

- [ ] **Step 1：寫失敗測試**

```ts
import { describe, it, expect } from 'vitest'
import { createEnemy } from './factory'
import { ENEMY_DEFS } from '../systems/enemyDefs'

describe('createEnemy by kind', () => {
  it('未指定種類時建立 basic', () => {
    const e = createEnemy({ x: 0, y: 0 })
    expect(e.enemyKind).toBe('basic')
    expect(e.hp).toBe(ENEMY_DEFS.basic.hp)
  })

  it('依種類套用對應數值', () => {
    const t = createEnemy({ x: 0, y: 0 }, 'tank')
    expect(t.enemyKind).toBe('tank')
    expect(t.hp).toBe(ENEMY_DEFS.tank.hp)
    expect(t.speed).toBe(ENEMY_DEFS.tank.speed)
    expect(t.damage).toBe(ENEMY_DEFS.tank.damage)
    expect(t.radius).toBe(ENEMY_DEFS.tank.radius)
    expect(t.xp).toBe(ENEMY_DEFS.tank.xp)
  })

  it('charger 初始 behaviorTimer 為 0', () => {
    const c = createEnemy({ x: 0, y: 0 }, 'charger')
    expect(c.behaviorTimer).toBe(0)
  })
})
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- factory`
Expected: FAIL（createEnemy 尚未吃 kind / enemyKind 未設）

- [ ] **Step 3：改寫 createEnemy**

把 `factory.ts` 既有 `createEnemy` 替換為（保留 import，新增 ENEMY_DEFS import）：

於檔頭 import 區新增：

```ts
import { ENEMY_DEFS } from '../systems/enemyDefs'
import type { Entity, EnemyKind } from '../types'
```
（若原本已 `import type { Entity } from '../types'`，改成上行合併。）

替換 `createEnemy`：

```ts
/**
 * 建立敵人 entity。
 * @param pos  生成位置（會被複製）。
 * @param kind 敵人種類（預設 'basic'）；數值取自 ENEMY_DEFS。
 * @returns 新的 enemy entity，帶接觸傷害、掉落經驗值與行為相位時鐘。
 */
export function createEnemy(pos: Vec2, kind: EnemyKind = 'basic'): Entity {
  const def = ENEMY_DEFS[kind]
  return {
    ...base(),
    kind: 'enemy',
    enemyKind: kind,
    pos: { ...pos },
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    damage: def.damage,
    xp: def.xp,
    behaviorTimer: 0,
  }
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- factory`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/entities/factory.ts src/engine/entities/factory.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] createEnemy 依種類套用 ENEMY_DEFS 數值

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4：加權選種（spawn.ts）

**Files:**
- Modify: `src/engine/systems/spawn.ts`
- Test: `src/engine/systems/spawn.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `spawn.test.ts` 既有 describe 內（或新增 describe）加入：

```ts
import { pickEnemyKind } from './spawn'
import { createRng } from '../core/rng'

describe('pickEnemyKind', () => {
  it('t=0 只會選到已解鎖的 basic / swarm', () => {
    const rng = createRng(1)
    for (let i = 0; i < 200; i++) {
      const k = pickEnemyKind(0, rng)
      expect(['basic', 'swarm']).toContain(k)
    }
  })

  it('t>=45 候選含 tank、t>=90 候選含 charger', () => {
    const rng = createRng(2)
    const at60 = new Set<string>()
    const at120 = new Set<string>()
    for (let i = 0; i < 500; i++) at60.add(pickEnemyKind(60, rng))
    for (let i = 0; i < 500; i++) at120.add(pickEnemyKind(120, rng))
    expect(at60.has('tank')).toBe(true)
    expect(at60.has('charger')).toBe(false)
    expect(at120.has('charger')).toBe(true)
  })

  it('確定性：相同 seed 產生相同序列', () => {
    const a = createRng(7), b = createRng(7)
    const seqA = Array.from({ length: 10 }, () => pickEnemyKind(120, a))
    const seqB = Array.from({ length: 10 }, () => pickEnemyKind(120, b))
    expect(seqA).toEqual(seqB)
  })
})
```

> 注意：`spawn.test.ts` 若尚無 `describe`/import 結構，沿用既有檔案頂部的 import 風格新增。

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- spawn`
Expected: FAIL（`pickEnemyKind` 不存在）

- [ ] **Step 3：實作**

在 `spawn.ts` 末尾新增（並於檔頭新增 import）：

檔頭新增：

```ts
import type { Rng } from '../core/rng'
import type { EnemyKind } from '../types'
import { ENEMY_DEFS, ENEMY_ORDER } from './enemyDefs'
```

新增函式：

```ts
/**
 * 依目前遊戲時間，在「已解鎖」（elapsed >= unlockTime）的敵種間依 spawnWeight 加權抽一種。
 * 為維持確定性，亂數一律走傳入的 seeded rng。
 *
 * @param elapsed 自開局以來的遊戲時間（秒）。
 * @param rng     seeded 亂數產生器。
 * @returns 抽中的敵人種類。
 */
export function pickEnemyKind(elapsed: number, rng: Rng): EnemyKind {
  const unlocked = ENEMY_ORDER.filter((k) => elapsed >= ENEMY_DEFS[k].unlockTime)
  const total = unlocked.reduce((s, k) => s + ENEMY_DEFS[k].spawnWeight, 0)
  let r = rng.next() * total
  for (const k of unlocked) {
    r -= ENEMY_DEFS[k].spawnWeight
    if (r < 0) return k
  }
  return unlocked[unlocked.length - 1] // 浮點保險：理論上不會走到
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- spawn`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/spawn.ts src/engine/systems/spawn.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] spawn 新增 pickEnemyKind（時間解鎖 + 加權隨機）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5：敵人 AI（enemyAI.ts）

**Files:**
- Create: `src/engine/systems/enemyAI.ts`
- Test: `src/engine/systems/enemyAI.test.ts`

- [ ] **Step 1：寫失敗測試**

```ts
import { describe, it, expect } from 'vitest'
import { steerEnemy } from './enemyAI'
import { createEnemy } from '../entities/factory'
import { ENEMY_DEFS } from './enemyDefs'

describe('enemyAI', () => {
  it('basic 朝玩家直線移動', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'basic')
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60)
    expect(e.vel.x).toBeLessThan(0) // 朝 -x（玩家方向）
    expect(Math.abs(e.vel.y)).toBeLessThan(1e-6)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.basic.speed, 5)
  })

  it('charger 走路相朝玩家、速度約走路速', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'charger')
    // behaviorTimer=0 → 走路相
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60)
    expect(e.vel.x).toBeLessThan(0)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.charger.speed, 0)
  })

  it('charger 跨入衝刺相時鎖定方向並加速', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'charger')
    // 將時鐘設在走路相末端，下一步跨入衝刺相
    e.behaviorTimer = ENEMY_DEFS.charger.walkTime! - 1 / 120
    steerEnemy(e, { x: 0, y: 0 }, 1 / 60)
    expect(Math.hypot(e.vel.x, e.vel.y)).toBeCloseTo(ENEMY_DEFS.charger.dashSpeed!, 0)
    expect(e.vel.x).toBeLessThan(0) // 朝玩家方向衝
  })

  it('charger 衝刺相中不再轉向（維持速度向量）', () => {
    const e = createEnemy({ x: 100, y: 0 }, 'charger')
    // 置於衝刺相中段
    e.behaviorTimer = ENEMY_DEFS.charger.walkTime! + ENEMY_DEFS.charger.dashTime! / 2
    e.vel = { x: -320, y: 0 }
    steerEnemy(e, { x: 0, y: 999 }, 1 / 60) // 玩家換到別處，但不應改變 vel
    expect(e.vel).toEqual({ x: -320, y: 0 })
  })
})
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- enemyAI`
Expected: FAIL（模組不存在）

- [ ] **Step 3：實作 enemyAI.ts**

```ts
/**
 * 敵人 AI system（enemyAI）。
 *
 * 無狀態純函式：依敵人 enemyKind 設定其速度向量。basic/swarm/tank 直線追玩家；
 * charger 依 behaviorTimer 跑「走路↔衝刺」狀態機。實際位移仍由 movement.applyVelocity 處理。
 * 不依賴 Vue/Pinia。
 */
import type { Entity } from '../types'
import type { Vec2 } from '../core/vector'
import { normalize, sub, scale } from '../core/vector'
import { steerTowards } from './movement'
import { ENEMY_DEFS } from './enemyDefs'

/**
 * 依敵人種類設定其速度向量，朝 target（玩家）行動。
 * @param e      要轉向的敵人（vel/behaviorTimer 會被就地修改）。
 * @param target 目標位置（玩家座標）。
 * @param dt     固定步長秒數。
 */
export function steerEnemy(e: Entity, target: Vec2, dt: number): void {
  if (e.enemyKind === 'charger') {
    steerCharger(e, target, dt)
    return
  }
  steerTowards(e, target) // basic / swarm / tank：直線追擊
}

/** charger 狀態機：走路相慢速轉向；跨入衝刺相鎖定方向加速；衝刺相維持速度。 */
function steerCharger(e: Entity, target: Vec2, dt: number): void {
  const def = ENEMY_DEFS.charger
  const walkTime = def.walkTime!
  const dashTime = def.dashTime!
  const cycle = walkTime + dashTime

  const prev = (e.behaviorTimer ?? 0) % cycle
  e.behaviorTimer = (e.behaviorTimer ?? 0) + dt
  const cur = e.behaviorTimer % cycle

  const prevDashing = prev >= walkTime
  const curDashing = cur >= walkTime

  if (curDashing && !prevDashing) {
    // 進入衝刺：鎖定當下朝玩家方向、設衝刺速
    e.vel = scale(normalize(sub(target, e.pos)), def.dashSpeed!)
  } else if (!curDashing) {
    // 走路相：慢速朝玩家轉向
    e.vel = scale(normalize(sub(target, e.pos)), def.speed)
  }
  // 衝刺相中（curDashing && prevDashing）：保持既有 vel，不轉向
}
```

- [ ] **Step 4：執行確認通過**

Run: `npm test -- enemyAI`
Expected: PASS

- [ ] **Step 5：commit**

```bash
git add src/engine/systems/enemyAI.ts src/engine/systems/enemyAI.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 新增 enemyAI（直線追擊 + charger 衝刺狀態機）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6：World 整合（生怪選種 + swarm 群襲 + AI）

**Files:**
- Modify: `src/engine/World.ts`
- Test: `src/engine/World.test.ts`

- [ ] **Step 1：寫失敗測試**

在 `World.test.ts` 既有頂層 describe 內新增：

```ts
  it('生怪會帶 enemyKind', () => {
    const w = new World(1)
    for (let i = 0; i < 180; i++) w.step(1 / 60)
    const kinds = w.activeEnemies().map((e) => e.enemyKind)
    expect(kinds.every((k) => k !== undefined)).toBe(true)
  })

  it('spawnSwarmAt 一次生成 4 隻 swarm', () => {
    const w = new World(1)
    const before = w.enemies.length
    w.spawnSwarmAt({ x: 100, y: 0 })
    expect(w.enemies.length - before).toBe(4)
    expect(w.enemies.slice(-4).every((e) => e.enemyKind === 'swarm')).toBe(true)
  })
```

- [ ] **Step 2：執行確認失敗**

Run: `npm test -- World`
Expected: FAIL（`spawnSwarmAt` 不存在 / 敵人無 enemyKind）

- [ ] **Step 3：改寫 World.ts**

(a) import 調整（在既有 import 區）：

```ts
import { spawnInterval, spawnPositionAround, pickEnemyKind } from './systems/spawn'
import { steerEnemy } from './systems/enemyAI'
```
（移除對 `steerTowards` 的直接 import；若 `applyVelocity` 仍需要則保留該 import 行的其餘部分。）

(b) 新增 swarm 群襲方法（放在既有 `spawnEnemyAt` 之後）：

```ts
  /**
   * 在指定位置附近一次生成一小群 swarm（4 隻，固定角度偏移，維持確定性）。
   * @param pos 群襲中心位置。
   */
  spawnSwarmAt(pos: Vec2): void {
    const offsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]
    const r = 24
    for (const a of offsets) {
      this.enemies.push(createEnemy({ x: pos.x + Math.cos(a) * r, y: pos.y + Math.sin(a) * r }, 'swarm'))
    }
  }
```

(c) 生怪段改寫（原步驟 2）：

把
```ts
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed)
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      this.spawnEnemyAt(pos)
    }
```
替換為：
```ts
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.spawnTimer = spawnInterval(this.elapsed)
      const pos = spawnPositionAround(this.player.pos, SPAWN_RADIUS, this.rng.next())
      const kind = pickEnemyKind(this.elapsed, this.rng)
      if (kind === 'swarm') this.spawnSwarmAt(pos)
      else this.spawnEnemyAt(pos, kind)
    }
```

(d) `spawnEnemyAt` 簽章加上 kind 轉傳：

把
```ts
  spawnEnemyAt(pos: Vec2): Entity {
    const e = createEnemy(pos)
    this.enemies.push(e)
    return e
  }
```
改為
```ts
  spawnEnemyAt(pos: Vec2, kind: EnemyKind = 'basic'): Entity {
    const e = createEnemy(pos, kind)
    this.enemies.push(e)
    return e
  }
```
並於檔頭型別 import 加入 `EnemyKind`：把 `import type { Entity, PlayerStats, Weapon, UpgradeContext } from './types'` 改為
`import type { Entity, PlayerStats, Weapon, UpgradeContext, EnemyKind } from './types'`。

(e) 敵人 AI 迴圈（原步驟 3）改用 steerEnemy：

把
```ts
    for (const e of this.enemies) {
      if (!e.active) continue
      steerTowards(e, this.player.pos)
      applyVelocity(e, dt)
    }
```
替換為
```ts
    for (const e of this.enemies) {
      if (!e.active) continue
      steerEnemy(e, this.player.pos, dt)
      applyVelocity(e, dt)
    }
```

- [ ] **Step 4：執行全部測試**

Run: `npm test`
Expected: PASS（含新 World 測試與既有測試）

> 既有 World 測試 `spawns enemies over time` 仍成立（swarm 也算 enemies）。若某既有測試假設
> 「每次生一隻」而因 swarm 群襲失敗，將該測試改為斷言 `activeEnemies().length > 0`。

- [ ] **Step 5：型別檢查**

Run: `npm run typecheck`
Expected: 乾淨（PixiRenderer 顏色於 Task 7 處理；若此時報 COLORS 缺 enemyKind 不會發生，因 enemyKind 非 EntityKind）

- [ ] **Step 6：commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] World 接入多敵種：選種生怪、swarm 群襲、enemyAI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7：渲染（PixiRenderer.ts）

**Files:**
- Modify: `src/engine/PixiRenderer.ts`

- [ ] **Step 1：依 enemyKind 取色**

在檔頭 import 區新增：

```ts
import { ENEMY_DEFS } from './systems/enemyDefs'
```

把 `graphicFor` 中決定顏色那行改為依 enemyKind 取色。原本：

```ts
      g.circle(0, 0, e.radius).fill(COLORS[e.kind])
```

改為：

```ts
      const color = e.kind === 'enemy' && e.enemyKind ? ENEMY_DEFS[e.enemyKind].color : COLORS[e.kind]
      g.circle(0, 0, e.radius).fill(color)
```

> `COLORS.enemy` 仍保留作為後備（理論上 enemy 必有 enemyKind）。半徑已由 factory 依敵種設定，
> renderer 不需另改半徑邏輯。

- [ ] **Step 2：型別檢查 + build**

Run: `npm run typecheck && npm run build`
Expected: 乾淨

- [ ] **Step 3：commit**

```bash
git add src/engine/PixiRenderer.ts
git commit -m "$(cat <<'EOF'
[mvp][feat][engine] 渲染依 enemyKind 取敵人顏色

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8：驗證與進度更新

**Files:**
- Modify: `progress.md`、`docs/superpowers/specs/multi-enemies/acceptance.md`

- [ ] **Step 1：完整測試 + 型別 + build**

Run: `npm test && npm run typecheck && npm run build`
Expected: 測試全綠、型別乾淨、build 乾淨

- [ ] **Step 2：瀏覽器煙霧測試**

Run: `npm run dev`，於瀏覽器確認：開局只有紅/橘小怪；約 45s 後出現大隻暗紅坦克；約 90s 後出現
洋紅衝刺者且會朝玩家猛衝；swarm 成群出現；無功能相關 console error。

- [ ] **Step 3：更新 acceptance.md 勾選 + progress.md**

依實際結果勾選 `acceptance.md`，並把 `progress.md` 階段 2「多種敵人」標記完成、更新驗證快照
（測試數）。

- [ ] **Step 4：commit**

```bash
git add progress.md docs/superpowers/specs/multi-enemies/acceptance.md
git commit -m "$(cat <<'EOF'
[mvp][docs][meta] 多敵種功能驗證通過，更新 progress 與 acceptance

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## 自我檢查（Self-Review）結果

- **Spec 覆蓋：** FR-1〜FR-7 與所有 acceptance 項目皆有對應 task（型別=Task1；defs=Task2；
  factory=Task3；選種=Task4；AI/charger=Task5；World 群襲/選種=Task6；渲染=Task7；驗證=Task8）。
- **型別一致：** `EnemyKind`、`EnemyDef`、`ENEMY_DEFS`/`ENEMY_ORDER`、`pickEnemyKind(elapsed,rng)`、
  `steerEnemy(e,target,dt)`、`createEnemy(pos,kind)`、`spawnEnemyAt(pos,kind)`、`spawnSwarmAt(pos)`、
  `enemyKind`/`behaviorTimer` 欄位在各 task 間命名一致。
- **無 placeholder：** 所有步驟皆含實際程式碼與指令。
