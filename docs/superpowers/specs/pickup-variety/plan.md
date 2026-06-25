# 撿取物多樣化（pickup-variety）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development 或 superpowers:executing-plans 逐 task 實作。**建議 inline 執行**（撿取物造型/掉落需瀏覽器實機看）。Steps use checkbox (`- [ ]`) 語法。

**Goal:** 新增兩種戰場撿取物——回血（mercy 低血才掉）與全場吸取（收全部寶石），資料驅動、seeded、確定性不變。

**Architecture:** `pickup` entity 種類 + `pickupKind` 欄位 + `pickupDefs` 登錄表；World 用**獨立 `pickupRng`**（自 seed 衍生、不擾動既有 spawn/combat 串流）擲骰掉落，拾取沿用 `attractGem` + `pickupRadius`，效果 `applyPickup` 操作既有 World 狀態；PixiRenderer/sprites 加程式化造型。

**Tech Stack:** TypeScript（純 TS 引擎）、PixiJS（呈現）、Vitest。

## Global Constraints

- 繁體中文註解；型別/程式名稱英文；commit `[mvp][type][scope] 描述` + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- 只動 `types.ts`、`systems/pickupDefs.ts`(新)、`entities/factory.ts`、`World.ts`、`sprites.ts`、`PixiRenderer.ts`、（+ `World.test.ts`）、`progress.md`、acceptance.md。**不碰** 既有寶石/寶箱/升級/戰鬥邏輯。
- 確定性：掉落走 `this.pickupRng`（seeded，自 seed 衍生），絕不 `Math.random`；效果操作既有狀態。**用獨立 rng 以免擾動既有 spawn/combat 串流與既有測試。**
- 既有 198 測試維持全綠。
- 數值為起始值（inline 微調）：`HEAL_FRAC=0.3`、`HEAL_DROP_HP_FRAC=0.5`、`HEAL_DROP_CHANCE=0.025`、`VACUUM_DROP_CHANCE=0.012`。

---

### Task 1: 型別 + pickupDefs + factory

**Files:**
- Modify: `src/engine/types.ts`
- Create: `src/engine/systems/pickupDefs.ts`
- Modify: `src/engine/entities/factory.ts`

**Interfaces:**
- Produces: `PickupKind`、`Entity.pickupKind`、`PICKUP_DEFS`、`createPickup`。供 Task 2/3 使用。

- [ ] **Step 1: `types.ts` 加 EntityKind 'pickup' + PickupKind + Entity.pickupKind**

把：

```ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' | 'chest'
```

改為：

```ts
export type EntityKind = 'player' | 'enemy' | 'projectile' | 'gem' | 'orbit' | 'chest' | 'pickup'

/** 撿取物子種類：回血 / 全場吸取。 */
export type PickupKind = 'heal' | 'vacuum'
```

在 `Entity` 介面（`enemyKind?` 附近）加：

```ts
  /** 撿取物子種類（僅 pickup 使用）；決定效果與顏色。 */
  pickupKind?: PickupKind
```

- [ ] **Step 2: 建立 `src/engine/systems/pickupDefs.ts`**

```ts
/** 撿取物登錄表（資料驅動）：每種撿取物的主題色等 metadata。新增撿取物只加一筆 + World 效果分支。 */
import type { PickupKind } from '../types'

export interface PickupDef {
  /** 主題色（造型與光暈用）。 */
  color: number
}

export const PICKUP_DEFS: Record<PickupKind, PickupDef> = {
  heal: { color: 0x66ff8c },   // 綠：回血
  vacuum: { color: 0xb388ff }, // 紫：受體吸取
}
```

- [ ] **Step 3: `factory.ts` 加 `createPickup`**

檔頭型別 import 改為：

```ts
import type { Entity, EnemyKind, PickupKind } from '../types'
```

在 `createChest` 之後加：

```ts
/**
 * 建立撿取物 entity。
 * @param pos 掉落位置（會被複製，不共用參照）。
 * @param kind 撿取物子種類。
 * @returns 新的 pickup entity。
 */
export function createPickup(pos: Vec2, kind: PickupKind): Entity {
  return { ...base(), kind: 'pickup', pos: { ...pos }, radius: 9, pickupKind: kind }
}
```

- [ ] **Step 4: 驗證 typecheck**

Run: `npm run typecheck` → 乾淨（`Record<PickupKind, PickupDef>` 完整）。

- [ ] **Step 5: Commit**

```bash
git add src/engine/types.ts src/engine/systems/pickupDefs.ts src/engine/entities/factory.ts
git commit -m "[mvp][feat][engine] pickup 型別 + pickupDefs + createPickup（撿取物 1）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: World 掉落 + 拾取 + 效果（TDD）

**Files:**
- Modify: `src/engine/World.ts`
- Modify: `src/engine/World.test.ts`

**Interfaces:**
- Consumes: `createPickup`（Task 1）、既有 `attractGem`/`applyVelocity`/`grantXp`/`this.rng`。
- Produces: `World.pickups()`、掉落與 `applyPickup` 行為。供 Task 3 渲染。

- [ ] **Step 1: 先寫失敗測試（效果，走公開 API）**

在 `World.test.ts` 末端加（import 補 `createPickup`、`createGem`）：

```ts
import { createPickup, createGem } from './entities/factory'

describe('撿取物效果', () => {
  it('heal 回血並夾在 maxHp 上限', () => {
    const w = new World(1, 'macrophage', 'vessel')
    w.player.hp = 10
    w.pickups().push(createPickup({ x: w.player.pos.x, y: w.player.pos.y }, 'heal'))
    w.step(1 / 60)
    expect(w.player.hp).toBeGreaterThan(10)
    expect(w.player.hp).toBeLessThanOrEqual(w.player.maxHp)
  })

  it('vacuum 收取全場寶石並轉為經驗', () => {
    const w = new World(1, 'macrophage', 'vessel')
    const xpBefore = w.summary().xp
    // 放幾顆離玩家較遠的寶石（不會被一般寶石迴圈先撿走）
    w.gems().push(createGem({ x: w.player.pos.x + 500, y: w.player.pos.y }, 3))
    w.gems().push(createGem({ x: w.player.pos.x - 500, y: w.player.pos.y }, 3))
    w.pickups().push(createPickup({ x: w.player.pos.x, y: w.player.pos.y }, 'vacuum'))
    w.step(1 / 60)
    expect(w.gems().every((g) => !g.active)).toBe(true)
    expect(w.summary().xp).toBeGreaterThan(xpBefore)
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npx vitest run src/engine/World.test.ts`
Expected: FAIL（`pickups` 不存在 / 效果未實作）。

- [ ] **Step 3: `World.ts` 加 pickupRng + 陣列 + getter**

檔頭 import 補 `createPickup`、`PickupKind`：

```ts
import { createPlayer, createEnemy, createGem, createOrbit, createChest, createEnemyProjectile, createPickup } from './entities/factory'
```
```ts
import type { /* 既有… */, PickupKind } from './types'
```
（`PickupKind` 併入既有 `import type { ... } from './types'`。）

在 `chestEntities` 欄位附近加：

```ts
  pickupEntities: Entity[] = []
```

在建構子 `this.rng = createRng(seed)` 之後加（獨立 rng，避免擾動既有串流）：

```ts
    this.pickupRng = createRng(seed ^ 0x5bd1e995)
```

在 `rng` 欄位宣告附近加：

```ts
  private pickupRng: Rng
```

在 `chests()` getter 之後加：

```ts
  /** @returns 目前場上的撿取物（供 renderer 顯示）。 */
  pickups(): Entity[] {
    return this.pickupEntities
  }
```

- [ ] **Step 4: 加掉落常數 + killEnemy 擲骰 + maybeDropPickup**

在檔案常數區（`GEM_PULL_SPEED` 附近）加：

```ts
const HEAL_FRAC = 0.3            // 回血回復 maxHp 比例
const HEAL_DROP_HP_FRAC = 0.5    // 血量低於 maxHp 此比例才可能掉回血（mercy）
const HEAL_DROP_CHANCE = 0.025   // 每次擊殺掉回血機率（低血時）
const VACUUM_DROP_CHANCE = 0.012 // 每次擊殺掉全場吸取機率
```

在 `killEnemy` 的 `this.soundEventQueue.push('kill')` 之後加：

```ts
    this.maybeDropPickup(e.pos)
```

新增私有方法（`killEnemy` 附近）：

```ts
  /** 撿取物掉落：獨立 seeded rng；一次擊殺最多一個（heal/vacuum 互斥）；heal 僅低血 mercy。 */
  private maybeDropPickup(pos: Vec2): void {
    const r = this.pickupRng.next()
    if (this.player.hp < this.player.maxHp * HEAL_DROP_HP_FRAC && r < HEAL_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'heal'))
    } else if (r >= HEAL_DROP_CHANCE && r < HEAL_DROP_CHANCE + VACUUM_DROP_CHANCE) {
      this.pickupEntities.push(createPickup(pos, 'vacuum'))
    }
  }
```

- [ ] **Step 5: 加拾取迴圈 + applyPickup + filter**

在寶箱拾取迴圈（`6b)` 區塊）之後加：

```ts
    // 6c) 撿取物：吸取並位移；碰玩家本體即拾取並套用效果。
    for (const pk of this.pickupEntities) {
      if (!pk.active) continue
      attractGem(pk, this.player.pos, this.stats.pickupRadius, GEM_PULL_SPEED)
      applyVelocity(pk, dt)
      if (distance(pk.pos, this.player.pos) <= this.player.radius) {
        pk.active = false
        this.applyPickup(pk.pickupKind!)
      }
    }
```

新增私有方法（`maybeDropPickup` 附近）：

```ts
  /** 套用撿取物效果：heal 回血（夾上限）；vacuum 收全場寶石轉經驗。 */
  private applyPickup(kind: PickupKind): void {
    if (kind === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * HEAL_FRAC)
    } else {
      for (const g of this.gemEntities) {
        if (!g.active) continue
        g.active = false
        this.grantXp(g.xp * this.stats.xpGain)
      }
    }
    this.soundEventQueue.push('pickup')
  }
```

在末段 entity filter 區（`chestEntities = ...filter` 之後）加：

```ts
    this.pickupEntities = this.pickupEntities.filter((p) => p.active)
```

- [ ] **Step 6: 跑測試確認通過**

Run: `npx vitest run src/engine/World.test.ts` → PASS（含新增 2 測試）
Run: `npm test` → 既有 + 新增全綠（獨立 pickupRng 不擾動既有確定性）

- [ ] **Step 7: Commit**

```bash
git add src/engine/World.ts src/engine/World.test.ts
git commit -m "[mvp][feat][engine] World 撿取物掉落/拾取/效果（heal+vacuum，獨立 rng）（撿取物 2）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: 視覺接線 + 驗證 + 文件

**Files:**
- Modify: `src/engine/sprites.ts`
- Modify: `src/engine/PixiRenderer.ts`
- Modify: `docs/superpowers/specs/pickup-variety/acceptance.md`
- Modify: `progress.md`

**Interfaces:**
- Consumes: `PICKUP_DEFS`（Task 1）、`World.pickups()`（Task 2）。

- [ ] **Step 1: `sprites.ts` 加 `drawPickup`**

檔頭 import 補：

```ts
import { PICKUP_DEFS } from './systems/pickupDefs'
```

在 `drawChest` 之後加：

```ts
/** 撿取物：heal（綠＋白十字）/ vacuum（紫＋漩渦弧）；色取自 PICKUP_DEFS、略大於寶石、外發光暈。 */
export function drawPickup(g: Graphics, e: Entity): void {
  const r = e.radius
  const base = e.pickupKind ? PICKUP_DEFS[e.pickupKind].color : 0xffffff
  g.circle(0, 0, r * 1.5).fill({ color: base, alpha: 0.2 }) // 光暈
  g.circle(0, 0, r).fill(base)
  g.circle(0, 0, r).stroke({ width: 1.2, color: lighten(base, 0.5) })
  if (e.pickupKind === 'heal') {
    const t = r * 0.3
    g.rect(-t, -r * 0.62, t * 2, r * 1.24).fill(0xffffff)
    g.rect(-r * 0.62, -t, r * 1.24, t * 2).fill(0xffffff)
  } else {
    g.arc(0, 0, r * 0.55, 0, Math.PI * 1.5).stroke({ width: 2, color: 0xffffff })
  }
}
```

（`lighten` 為 sprites.ts 既有 helper；確認已可用。）

- [ ] **Step 2: `PixiRenderer.ts` import + build switch + sync 迴圈**

import 區（`drawChest` 那行）補 `drawPickup`：

```ts
  drawPlayer, drawEnemy, drawGem, drawProjectile, drawOrbit, drawChest, drawPickup,
```

build switch 加：

```ts
        case 'chest': drawChest(body, e); break
        case 'pickup': drawPickup(body, e); break
```

sync 迴圈（`for (const c of world.chests())` 那行之後）加：

```ts
      for (const pk of world.pickups()) if (pk.active) this.syncSprite(pk, world)
```

並更新 z-order 註解（在 chests 之後、player 之前納入 pickups）。

- [ ] **Step 3: 驗證 typecheck + 測試 + build + 瀏覽器**

Run: `npm run typecheck` → 乾淨
Run: `npm test` → 198 + 新增全綠
Run: `npm run build` → 乾淨
瀏覽器：打怪累積擊殺看 vacuum 偶爾掉落（撿到全場寶石飛來）；故意被打到低血看 heal 掉落並回血；確認造型（heal 綠十字、vacuum 紫漩渦）、吸取飛行正常、血滿時不掉 heal、0 功能相關 console error。

- [ ] **Step 4: 更新 acceptance.md 與 progress.md**

- acceptance.md：勾選所有項目、填驗證日期。
- progress.md：階段 4 處補一行「撿取物多樣化：回血(mercy 低血掉)＋全場吸取(收全部寶石)，資料驅動 pickup entity + 獨立 seeded rng → specs/pickup-variety/」。

- [ ] **Step 5: Commit**

```bash
git add src/engine/sprites.ts src/engine/PixiRenderer.ts docs/superpowers/specs/pickup-variety/acceptance.md progress.md
git commit -m "[mvp][feat][art] 撿取物造型 + 渲染接線（撿取物完成）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review（plan 對 spec 的覆蓋檢查）

- **FR-1 型別與資料**：Task 1（EntityKind 'pickup'、PickupKind、Entity.pickupKind、pickupDefs）。✅
- **FR-2 factory**：Task 1 `createPickup`。✅
- **FR-3 掉落**：Task 2 `maybeDropPickup`（獨立 pickupRng、mercy heal、互斥）。✅
- **FR-4 拾取與效果**：Task 2 拾取迴圈 + `applyPickup`（heal 夾上限、vacuum 收全場）+ filter + getter。✅
- **FR-5 視覺**：Task 3 `drawPickup` + PixiRenderer build/sync 接線。✅
- **邊界**：mercy 閘（hp 門檻）、heal 夾頂、vacuum 無寶石安全（迴圈空）、升級握手（grantXp 既有）、確定性（pickupRng seeded）。✅
- **不變項**：獨立 rng 不擾動既有串流→既有測試不受影響；只動指定檔；既有寶石/寶箱/升級不變；Task 2/3 驗測試全綠。✅
- **Placeholder 掃描**：無 TBD；完整程式碼/指令；數值為起始值。✅
- **型別/命名一致**：`PickupKind`/`PICKUP_DEFS`/`createPickup`/`pickups`/`applyPickup`/`maybeDropPickup`/`pickupRng` 跨 task 一致。✅
